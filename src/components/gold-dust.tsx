import { useEffect, useRef } from "react";

// Sehr sparsamer Goldstaub: wenige, langsam aufsteigende Lichtpunkte auf einem Canvas.
// Pausiert bei verstecktem Tab, entfällt komplett bei "Bewegung reduzieren".
export function GoldDust({ count = 38, className = "" }: { count?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    type Mote = {
      x: number;
      y: number;
      r: number;
      vy: number;
      drift: number;
      phase: number;
      a: number;
    };
    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      r: 0.6 + Math.random() ** 2.2 * 3.2,
      vy: 6 + Math.random() * 14,
      drift: 6 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      a: 0.25 + Math.random() * 0.55,
    });
    const motes = Array.from({ length: count }, () => spawn(true));

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.y -= m.vy * dt;
        m.phase += dt * 0.6;
        const x = m.x + Math.sin(m.phase) * m.drift;
        if (m.y < -10) motes[i] = spawn(false);
        const twinkle = 0.55 + 0.45 * Math.sin(m.phase * 2.3);
        const glow = ctx.createRadialGradient(x, m.y, 0, x, m.y, m.r * 4);
        glow.addColorStop(0, `rgba(240, 214, 150, ${m.a * twinkle})`);
        glow.addColorStop(0.35, `rgba(214, 170, 90, ${m.a * twinkle * 0.35})`);
        glow.addColorStop(1, "rgba(214, 170, 90, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, m.y, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count]);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none ${className}`} />
  );
}
