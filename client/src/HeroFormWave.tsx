"use client";

import { useEffect, useRef } from "react";

// The VoiceOK artwork uses two asymmetric peaks that taper to a point at each edge.
const sampleCount = 160;
const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
  const x = index / sampleCount;
  const peaks =
    0.27 +
    0.82 * Math.exp(-(((x - 0.32) / 0.122) ** 2)) +
    0.66 * Math.exp(-(((x - 0.73) / 0.152) ** 2));
  return { x, envelope: Math.sin(Math.PI * x) ** 1.13 * peaks };
});

const strands = Array.from({ length: 48 }, (_, index) => {
  const depth = index / 47;
  return {
    depth,
    alpha: 0.28 + 0.54 * Math.sin(Math.PI * depth) ** 0.6,
    lineWidth: index % 7 === 0 ? 1.3 : 0.8,
  };
});

/** Place inside a hero with position: relative and isolation: isolate. */
export default function HeroWaveform() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let phase = 0;
    let visible = true;
    let frame = 0;
    let lastPaint: number | null = null;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const strand of strands) {
        const q = strand.depth;
        ctx.globalAlpha = strand.alpha;
        ctx.lineWidth = strand.lineWidth;
        ctx.beginPath();
        for (const { x, envelope } of samples) {
          const twist =
            0.63 * Math.sin(x * 16.5 + q * 4.55 + phase + 0.7 * Math.sin(x * 7.2 - phase)) +
            0.24 * Math.sin(x * 27 + q * 2.6 - phase * 0.55) +
            (q - 0.5) * 0.52;
          const y = height * (0.58 + 0.38 * envelope * twist);
          if (x === 0) ctx.moveTo(0, y);
          else ctx.lineTo(x * width, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (lastPaint === null) lastPaint = now;
      const elapsed = now - lastPaint;
      if (elapsed >= 40) {
        phase += Math.min(elapsed, 90) * 0.00036;
        lastPaint = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      lastPaint = null;
      if (!visible || document.hidden || width === 0 || height === 0) return;
      draw();
      if (!motion.matches) frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (width && height) {
        ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "#a34b73");
        gradient.addColorStop(0.23, "#e67778");
        gradient.addColorStop(0.53, "#ffd9a6");
        gradient.addColorStop(0.76, "#ff9c5f");
        gradient.addColorStop(1, "#c76b65");
        ctx.strokeStyle = gradient;
      }
      sync();
    };

    const sizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    const viewObserver = typeof IntersectionObserver === "undefined" ? null :
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      });

    resize();
    sizeObserver?.observe(canvas);
    viewObserver?.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);

    return () => {
      sizeObserver?.disconnect();
      viewObserver?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-waveform"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: -1,
        pointerEvents: "none",
        opacity: "var(--hero-waveform-opacity, 0.65)",
      }}
    />
  );
}
