import { useEffect, useRef } from "react";

/** Ambient waveform drawn behind the hero copy. Purely decorative but tied to the subject. */
function HeroWaveform() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    let phase = 0;

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

    const layers = [
      { amp: 26, freq: 0.006, speed: 0.012, color: "rgba(232,163,61,0.16)" },
      { amp: 18, freq: 0.009, speed: -0.018, color: "rgba(95,212,196,0.13)" },
      { amp: 12, freq: 0.014, speed: 0.026, color: "rgba(242,239,233,0.06)" },
    ];

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const midY = h * 0.58;

      layers.forEach((layer) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y =
            midY +
            Math.sin(x * layer.freq + phase * layer.speed) * layer.amp * devicePixelRatio;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = 1.5 * devicePixelRatio;
        ctx.stroke();
      });

      phase += 1;
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-waveform" aria-hidden="true" />;
}


export default HeroWaveform;