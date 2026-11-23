import React, {useEffect, useRef} from 'react';

const SYMBOLS = ['π', '∑', '√', '∫', '∞', '∠', '△', '□', '○', '≈', '≠', '≤', '≥', 'Δ', 'θ', 'α', 'β', 'sin', 'cos', 'tg', 'log', 'x²', 'a²+b²', '½', '⅔', '%', '±'];

interface Particle {
  s: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  z: number;
  a: number;
}

export const MathBackground: React.FC<{isDark: boolean}> = ({isDark}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const count = Math.max(12, Math.min(32, Math.round((width * height) / 42000)));
      particles = Array.from({length: count}, () => ({
        s: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: (Math.random() - 0.5) * 0.5,
        vr: (Math.random() - 0.5) * 0.0012,
        z: 18 + Math.random() * 26,
        a: 0.045 + Math.random() * 0.055,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = isDark ? '#818CF8' : '#4338CA';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.font = `500 ${p.z}px "Plus Jakarta Sans", -apple-system, sans-serif`;
        ctx.fillText(p.s, 0, 0);
        ctx.restore();
      }
    };

    const step = () => {
      const margin = 50;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        if (p.x < -margin) p.x = width + margin;
        if (p.x > width + margin) p.x = -margin;
        if (p.y < -margin) p.y = height + margin;
        if (p.y > height + margin) p.y = -margin;
      }
    };

    const loop = () => {
      step();
      draw();
      rafId = requestAnimationFrame(loop);
    };

    resize();
    if (prefersReduced) {
      draw();
    } else {
      rafId = requestAnimationFrame(loop);
    }

    const onResize = () => {
      resize();
      if (prefersReduced) draw();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 no-print"
    />
  );
};
