# VoiceOk

<img width="1459" height="817" alt="Screenshot 2026-09-06 at 4 00 17 AM" src="https://github.com/user-attachments/assets/6ea4ed86-378c-4f3f-8010-312c0f771644" />

A voice AI you call like a person. VoiceOk is a one-page, non-scrolling frontend for a voice agent — sign in, tap to call, and talk to an AI that searches the live internet, remembers the conversation, and replies in real time.

## Features

- **Live internet access** — the agent looks things up as you talk instead of relying on stale training data.
- **Session memory** — conversation context persists across calls, so you don't have to re-explain yourself.
- **Low latency** — replies land in a few hundred milliseconds, closer to a phone call than a chatbot.
- **Natural interruptions** — you can talk over the agent mid-sentence and it adapts, the way a real conversation works.

## Tech stack

- **React + TypeScript** — UI and application logic
- **LiveKit** (`livekit-client`) — real-time audio transport for the call
- **Google Sign-In** — authentication gate before a call can be started
- **Node + TypeScript** — Signin and token server 
- **Python** — AI agent

## Project structure

```
.
├── App.tsx                    # Main UI: 70/30 layout, hero, rotating feature list, call panel
├── App.jsx                    # Type-stripped copy of App.tsx for quick preview
├── useLiveKitConnection.ts    # Hook that fetches a token and manages the LiveKit Room lifecycle
└── README.md
```

## How it fits together

1. The user signs in with Google (right-hand panel).
2. Tapping **Call agent** invokes `connect()` from `useLiveKitConnection`.
3. That hook calls your backend's token endpoint, gets back a LiveKit access token (and server URL), and connects a `Room`.
4. Once connected, the mic is published automatically and the agent's audio plays back through an auto-attached `<audio>` element.
5. Tapping **End call** calls `disconnect()`, which tears the room down cleanly.

## Getting started

### 1. Install dependencies

```bash
npm install livekit-client
```

### 2. Provide a token endpoint

VoiceOk doesn't mint LiveKit tokens itself — it expects your backend to expose a route that does. The hook calls it like this:

```
POST /api/livekit/token
Content-Type: application/json

{ "roomName": "VoiceOk-call" }
```

Expected response:

```json
{
  "token": "eyJhbGciOi...",
  "url": "wss://your-livekit-server"
}
```

If your backend doesn't return `url`, pass `serverUrl` directly to the hook instead.

### 3. Wire up the call button

```tsx
import { useLiveKitConnection } from "./useLiveKitConnection";

function CallPanel() {
  const { connect, disconnect, isConnecting, isConnected, error } = useLiveKitConnection({
    tokenEndpoint: "/api/livekit/token",
    getTokenRequestBody: () => ({ roomName: "VoiceOk-call" }),
  });

  return (
    <button onClick={isConnected ? disconnect : () => connect()} disabled={isConnecting}>
      {isConnecting ? "Connecting…" : isConnected ? "End call" : "Call agent"}
    </button>
  );
}
```

### 4. Run it

Drop `App.tsx` into your React/Next.js project and render it as your top-level page. It renders full-viewport, non-scrolling, and switches to a stacked scrollable layout below ~860px.

## `useLiveKitConnection` reference

| Returns | Type | Description |
|---|---|---|
| `room` | `Room` | The underlying LiveKit room instance |
| `connectionState` | `ConnectionState` | Current LiveKit connection state |
| `isConnecting` | `boolean` | True while a connect attempt is in flight |
| `isConnected` | `boolean` | True once connected |
| `error` | `Error \| null` | Last connection error, if any |
| `participants` | `RemoteParticipant[]` | Remote participants currently in the room |
| `isMicrophoneEnabled` | `boolean` | Whether the local mic is publishing |
| `connect()` | `() => Promise<void>` | Fetches a token and connects |
| `disconnect()` | `() => Promise<void>` | Leaves the room and resets state |
| `setMicrophoneEnabled(enabled)` | `(boolean) => Promise<void>` | Mute/unmute the local mic |

**Options:**

| Option | Required | Description |
|---|---|---|
| `tokenEndpoint` | Yes | Your backend route that returns a LiveKit token |
| `serverUrl` | No | LiveKit `wss://` URL, if your endpoint doesn't return one |
| `tokenRequestMethod` | No | `"POST"` (default) or `"GET"` |
| `getTokenRequestBody` | No | Function returning extra fields to send with the token request |
| `autoPublishMicrophone` | No | Enable the mic automatically on connect (default `true`) |

## Troubleshooting

- **Token request never fires / fails immediately** — if you're testing inside a sandboxed preview, it can't reach your backend; run the app in your actual dev environment.
- **404 / 405 on the token request** — check `tokenRequestMethod` matches your server route.
- **Request blocked with a CORS error** — your backend needs `Access-Control-Allow-Origin` if frontend and backend are on different origins.
- **Token request needs a session cookie** — the hook's fetch doesn't send credentials by default; add `credentials: "include"` inside `useLiveKitConnection`'s `fetch` call if your auth relies on cookies.

## Roadmap ideas

- Real Google OAuth (currently simulated in `App.tsx`)
- Drive the call visualizer from real audio levels instead of simulated bars
- Persist session memory indicators in the UI (e.g. "remembering this call")
