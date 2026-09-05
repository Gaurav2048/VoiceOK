import { useEffect, useRef, useState, useCallback } from "react";
import HeroWaveform from "./HeroFormWave";
import { useLiveKitConnection } from "./hooks/useLivekit";
import { SERVICES } from "./constant";


/**
 * Dialtone — one-page, non-scrolling voice-agent frontend.
 * 70% hero (product story) / 30% action rail (auth + call).
 */

type CallState = "idle" | "connecting" | "live";

const FEATURES: { tag: string; text: string }[] = [
  {
    tag: "internet",
    text: "Looks things up as you talk, so answers reflect what's true right now, not what it learned last year.",
  },
  {
    tag: "memory",
    text: "Keeps a running session across calls, so you can pick a thread back up without re-explaining yourself.",
  },
  {
    tag: "latency",
    text: "Replies in a few hundred milliseconds — closer to a phone call with a person than a chatbot.",
  },
  {
    tag: "voice",
    text: "Handles interruptions mid-sentence the way a real conversation does, no waiting for it to finish talking.",
  },
];

function useGoogleFonts() {
  useEffect(() => {
    const id = "dialtone-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}


/** Bar-style visualizer for the call panel — reacts to call state. */
function CallVisualizer({ state }: { state: CallState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef<number[]>(Array.from({ length: 28 }, () => 0.1));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth * devicePixelRatio;
      canvas.height = parent.clientHeight * devicePixelRatio;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = barsRef.current;
      const gap = w / bars.length;
      const barWidth = gap * 0.42;

      bars.forEach((current, i) => {
        let target: number;
        if (state === "live") target = 0.12 + Math.random() * 0.88;
        else if (state === "connecting") target = 0.15 + 0.1 * Math.sin(Date.now() / 160 + i);
        else target = 0.06 + 0.03 * Math.sin(Date.now() / 900 + i);

        const eased = current + (target - current) * 0.22;
        bars[i] = eased;

        const barHeight = eased * h * 0.9;
        const x = i * gap + (gap - barWidth) / 2;
        const y = h / 2 - barHeight / 2;

        ctx.fillStyle =
          state === "live"
            ? "rgba(95,212,196,0.9)"
            : state === "connecting"
            ? "rgba(232,163,61,0.75)"
            : "rgba(242,239,233,0.22)";
        ctx.fillRect(x, y, barWidth, barHeight);
      });

      raf = requestAnimationFrame(draw);
    };

    if (reduceMotion) {
      // Draw a single static frame reflecting state, no loop.
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      barsRef.current.forEach((_, i) => {
        const gap = w / barsRef.current.length;
        const barWidth = gap * 0.42;
        const level = state === "live" ? 0.5 : state === "connecting" ? 0.25 : 0.08;
        const barHeight = level * h * 0.9;
        ctx.fillStyle = "rgba(242,239,233,0.3)";
        ctx.fillRect(i * gap + (gap - barWidth) / 2, h / 2 - barHeight / 2, barWidth, barHeight);
      });
    } else {
      draw();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [state]);

  return <canvas ref={canvasRef} className="call-visualizer" aria-hidden="true" />;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function App() {
  useGoogleFonts();

  const [signedIn, setSignedIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ROTATE_MS = 5000;
  const [activeFeature, setActiveFeature] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);

   const {
    connect,
    disconnect,
    // isConnecting,
    // isConnected,
    // error,
  } = useLiveKitConnection({
    tokenEndpoint: SERVICES.FETCH_LIVEKIT_SESSION_TOKEN,
    getTokenRequestBody: () => ({ roomName: "dialtone-call" }),
  });


  useEffect(() => {
    if (rotationPaused) return;
    const t = setTimeout(() => {
      setActiveFeature((i) => (i + 1) % FEATURES.length);
    }, ROTATE_MS);
    return () => clearTimeout(t);
  }, [activeFeature, rotationPaused]);

useEffect(() => {
  if (localStorage.getItem('token')) {
    setSigningIn(false);
    setSignedIn(true);
  }
}, []);

  const handleSignIn = useCallback(() => {
    setSigningIn(true);
    window.location.href = '/auth/google';
  }, []);

  const handleCallToggle = useCallback(() => {
    if (callState === "idle") {
      setCallState("connecting");
      connect().then(() => {
        setCallState("live");
        setElapsed(0);
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      })
    } else {
      disconnect().then(() => {
        setCallState("idle");
        setElapsed(0);
        if (timerRef.current) clearInterval(timerRef.current);
      })
    }
  }, [callState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const statusLabel =
    callState === "live" ? "live" : callState === "connecting" ? "connecting" : "idle";

  return (
    <div className="dialtone-app">
      <div className="hero">
        <HeroWaveform />
        <div className="hero-inner">
          <div className="brand-row">
            <span className="brand-dot" />
            <span className="brand-name mono">dialtone</span>
          </div>
          <h1>Dial in. It's already listening.</h1>
          <p className="sub">
            Dialtone is a voice AI you call like a person — it pulls answers from
            the live internet, remembers every conversation, and replies before
            you finish the sentence.
          </p>
          <div
            className="feature-rotator"
            onMouseEnter={() => setRotationPaused(true)}
            onMouseLeave={() => setRotationPaused(false)}
          >
            <div className="feature-active" key={activeFeature}>
              <span className="feature-tag mono">{FEATURES[activeFeature].tag}</span>
              <p className="feature-text-lg">{FEATURES[activeFeature].text}</p>
            </div>
            <div className={`feature-ticks${rotationPaused ? " paused" : ""}`}>
              {FEATURES.map((f, i) => (
                <button
                  key={f.tag}
                  className={`tick${i === activeFeature ? " active" : ""}`}
                  onClick={() => setActiveFeature(i)}
                  aria-label={`Show ${f.tag} feature`}
                  aria-pressed={i === activeFeature}
                >
                  {i === activeFeature && (
                    <span
                      className="tick-fill"
                      key={activeFeature}
                      style={{ animationDuration: `${ROTATE_MS}ms` }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="side">
        <div className="side-top">
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            session
          </span>
          <div className="status">
            <span className={`status-dot ${callState}`} />
            <span className="mono">{statusLabel}</span>
          </div>
        </div>

        <div className="side-center">
          {!signedIn ? (
            <>
              <p className="side-caption">Sign in to start a call</p>
              <button className="google-btn" onClick={handleSignIn} disabled={signingIn}>
                <GoogleMark />
                {signingIn ? "Signing in…" : "Continue with Google"}
              </button>
            </>
          ) : (
            <>
              <button
                className={`call-btn ${callState}`}
                onClick={handleCallToggle}
                aria-label={callState === "idle" ? "Call Dialtone" : "End call"}
              >
                {callState === "idle" && "call"}
                {callState === "connecting" && "connecting"}
                {callState === "live" && formatTime(elapsed)}
              </button>

              <div className="call-visualizer-wrap">
                <CallVisualizer state={callState} />
              </div>

              {callState === "live" && (
                <button className="end-btn" onClick={handleCallToggle}>
                  end call
                </button>
              )}
              {callState === "idle" && <p className="side-caption">Tap to call the agent</p>}
            </>
          )}
        </div>

        <p className="side-foot mono">
          {signedIn ? "connected · google" : "no account required to preview"}
        </p>
      </div>
    </div>
  );
}