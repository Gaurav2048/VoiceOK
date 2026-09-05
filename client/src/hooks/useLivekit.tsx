import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  DisconnectReason,
  type RemoteParticipant,
  type RemoteTrack,
} from "livekit-client";

/**
 * useLiveKitConnection
 * --------------------
 * Fetches a LiveKit access token from your backend, then owns the full
 * connect/disconnect lifecycle of a `Room`.
 *
 * Usage:
 *
 *   const {
 *     connect, disconnect, isConnecting, isConnected, error,
 *   } = useLiveKitConnection({ tokenEndpoint: "/api/livekit/token" });
 *
 *   <button onClick={connect}>Call agent</button>
 *
 * Note: LiveKit client SDK v2 renamed `room.participants` to
 * `room.remoteParticipants`. If your installed `livekit-client` version is
 * older, swap that one property access below.
 */

export interface LiveKitTokenResponse {
  /** Access token minted by your backend. Required. */
  participantToken: string;
  /** LiveKit server URL (wss://...). Optional if you pass `serverUrl` to the hook instead. */
  serverUrl?: string;
  roomName?: string;
}

export interface UseLiveKitConnectionOptions {
  /** Your backend route that mints a LiveKit access token, e.g. "/api/livekit/token". */
  tokenEndpoint: string;
  /** LiveKit server URL. Only needed if your token endpoint doesn't return `url`. */
  serverUrl?: string;
  /** HTTP method used to call tokenEndpoint. Defaults to "POST". */
  tokenRequestMethod?: "POST" | "GET";
  /** Extra fields to send with the token request — room name, user id, agent id, etc. */
  getTokenRequestBody?: () => Record<string, unknown> | undefined;
  /** Publish the mic automatically once connected. Defaults to true. */
  autoPublishMicrophone?: boolean;
}

export interface UseLiveKitConnectionResult {
  /** The underlying Room instance, stable for the life of the component. */
  room: Room;
  connectionState: ConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
  participants: RemoteParticipant[];
  isMicrophoneEnabled: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
}

export function useLiveKitConnection(
  options: UseLiveKitConnectionOptions
): UseLiveKitConnectionResult {
  const {
    tokenEndpoint,
    serverUrl,
    tokenRequestMethod = "POST",
    getTokenRequestBody,
    autoPublishMicrophone = true,
  } = options;

  // One Room per mounted hook instance, created lazily and kept stable.
  const roomRef = useRef<Room | null>(null);
  if (!roomRef.current) {
    roomRef.current = new Room();
  }
  const room = roomRef.current;

  const [connectionState, setConnectionState] = useState<ConnectionState>(room.state);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMicrophoneEnabled, setIsMicrophoneEnabledState] = useState(false);

  // Wire room events once per Room instance.
  useEffect(() => {
    const syncParticipants = () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
    };

    const handleConnectionStateChanged = (state: ConnectionState) => {
      setConnectionState(state);
    };

    const handleDisconnected = (_reason?: DisconnectReason) => {
      setConnectionState(ConnectionState.Disconnected);
      setParticipants([]);
      setIsMicrophoneEnabledState(false);
    };

    // Remote audio (e.g. the agent speaking) needs an <audio> element to
    // actually play. Attach/detach it quietly in the background.
    const handleTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.style.display = "none";
        document.body.appendChild(el);
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      track.detach().forEach((el) => el.remove());
    };

    room
      .on(RoomEvent.ParticipantConnected, syncParticipants)
      .on(RoomEvent.ParticipantDisconnected, syncParticipants)
      .on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
      .on(RoomEvent.Disconnected, handleDisconnected)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      room
        .off(RoomEvent.ParticipantConnected, syncParticipants)
        .off(RoomEvent.ParticipantDisconnected, syncParticipants)
        .off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
        .off(RoomEvent.Disconnected, handleDisconnected)
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room]);

  // Make sure we always leave the room if the component unmounts mid-call.
  useEffect(() => {
    return () => {
      room.disconnect();
    };
  }, [room]);

  const fetchToken = useCallback(async (): Promise<LiveKitTokenResponse> => {
    const body = getTokenRequestBody?.();
    const res = await fetch(tokenEndpoint, {
      method: tokenRequestMethod,
      headers: tokenRequestMethod === "POST" ? { "Content-Type": "application/json", "Authorization": localStorage.getItem('token') || '' } : undefined,
      body: tokenRequestMethod === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch LiveKit token (status ${res.status})`);
    }

    const data = (await res.json()) as LiveKitTokenResponse;
    if (!data?.participantToken) {
      throw new Error("Token endpoint response did not include a token");
    }
    return data;
  }, [tokenEndpoint, tokenRequestMethod, getTokenRequestBody]);

  const connect = useCallback(async () => {
    if (room.state === ConnectionState.Connected || room.state === ConnectionState.Connecting) {
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const { participantToken, serverUrl } = await fetchToken();
      const wsUrl = serverUrl;
      if (!wsUrl) {
        throw new Error(
          "No LiveKit server URL available. Return `serverUrl` from your token endpoint, or pass `serverUrl` to useLiveKitConnection."
        );
      }
      await room.connect(wsUrl, participantToken);
      if (autoPublishMicrophone) {
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMicrophoneEnabledState(true);
      }
      setConnectionState(room.state);
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      throw normalized;
    } finally {
      setIsConnecting(false);
    }
  }, [room, fetchToken, serverUrl, autoPublishMicrophone]);

  const disconnect = useCallback(async () => {
    await room.disconnect();
    setConnectionState(ConnectionState.Disconnected);
    setParticipants([]);
    setIsMicrophoneEnabledState(false);
  }, [room]);

  const setMicrophoneEnabled = useCallback(
    async (enabled: boolean) => {
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setIsMicrophoneEnabledState(enabled);
    },
    [room]
  );

  return {
    room,
    connectionState,
    isConnecting,
    isConnected: connectionState === ConnectionState.Connected,
    error,
    participants,
    isMicrophoneEnabled,
    connect,
    disconnect,
    setMicrophoneEnabled,
  };
}