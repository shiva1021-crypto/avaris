import { useEffect, useRef, type SVGProps } from 'react';

const LEFT = [
  'M -30 628 C 205 637 326 742 550 765 C 655 778 740 780 850 781',
  'M -30 636 C 205 624 326 733 550 761 C 655 779 740 784 850 781',
  'M -30 628 C 205 637 326 742 550 765 C 655 778 740 780 850 781',
];
const RIGHT = [
  'M 770 680 C 1120 662 1440 565 1700 255',
  'M 770 686 C 1120 649 1440 583 1700 270',
  'M 770 680 C 1120 662 1440 565 1700 255',
];

function MovingPath({ frames, duration, reducedMotion, ...props }: {
  frames: string[]; duration: string; reducedMotion: boolean;
} & SVGProps<SVGPathElement>) {
  return <path d={frames[0]} {...props}>
    {!reducedMotion && <animate attributeName="d" values={frames.join(';')} dur={duration} repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" />}
  </path>;
}

/** Generate a small, soft cloud once; animate cached sprites instead of per-frame noise. */
function createSmokeSprite() {
  const sprite = document.createElement('canvas');
  sprite.width = 256; sprite.height = 160;
  const context = sprite.getContext('2d')!;
  const pixels = context.createImageData(sprite.width, sprite.height);
  const grid = new Float32Array(64 * 64);
  let seed = 7193;
  for (let i = 0; i < grid.length; i++) { seed = (seed * 16807) % 2147483647; grid[i] = seed / 2147483647; }
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x); const iy = Math.floor(y);
    let tx = x - ix; let ty = y - iy;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = grid[(iy & 63) * 64 + (ix & 63)];
    const b = grid[(iy & 63) * 64 + ((ix + 1) & 63)];
    const c = grid[((iy + 1) & 63) * 64 + (ix & 63)];
    const d = grid[((iy + 1) & 63) * 64 + ((ix + 1) & 63)];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const nx = x / sprite.width; const ny = y / sprite.height;
      const envelope = Math.pow(Math.max(0, 1 - ((nx - .5) / .5) ** 2), 2) * Math.pow(Math.max(0, 1 - ((ny - .5) / .5) ** 2), 2);
      const wisps = noise(nx * 5, ny * 4) * .55 + noise(nx * 13, ny * 10) * .3 + noise(nx * 27, ny * 20) * .15;
      const index = (y * sprite.width + x) * 4;
      pixels.data[index] = 147; pixels.data[index + 1] = 165; pixels.data[index + 2] = 186;
      pixels.data[index + 3] = Math.pow(Math.max(0, wisps - .18), .95) * envelope * 225;
    }
  }
  context.putImageData(pixels, 0, 0);
  return sprite;
}

/** Live fog with feathered pointer clearing and wheel-driven dispersal. No image assets. */
function Smoke({ reducedMotion }: { reducedMotion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current!;
    const context = element.getContext('2d', { alpha: true });
    if (!context) return;
    const sprite = createSmokeSprite();
    type Clearing = { x: number; y: number; radius: number; life: number };
    let width = 0; let height = 0; let frame = 0; let last = 0; let elapsed = 0;
    let clearings: Clearing[] = [];
    let previousPointer: { x: number; y: number } | null = null;
    let wheelDispersal = 0; let wheelHold = 0;
    const paint = () => {
      context.globalAlpha = 1;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'screen';
      for (let i = 0; i < 6; i++) {
        const phase = (reducedMotion ? 0 : elapsed) * .028 + i * 1.73;
        const cloudWidth = width * (.8 + i * .04);
        const cloudHeight = height * (.52 + i * .03);
        const x = width * (-.3 + i * .19 + Math.sin(phase) * .075);
        const y = height * (.06 + (i % 3) * .13 + Math.cos(phase * .71) * .045);
        context.globalAlpha = (.58 + Math.sin(phase + i) * .09) * (1 - wheelDispersal);
        context.drawImage(sprite, x, y, cloudWidth, cloudHeight);
      }
      // Erase only this fog canvas. The camera, typography and ribbons are independent.
      context.globalCompositeOperation = 'destination-out';
      context.globalAlpha = 1;
      for (const clearing of clearings) {
        const x = clearing.x * width; const y = clearing.y * height;
        const radius = clearing.radius * width;
        const strength = .98 * Math.min(1, clearing.life / 1.7);
        const feather = context.createRadialGradient(x, y, radius * .08, x, y, radius);
        feather.addColorStop(0, `rgba(0,0,0,${strength})`);
        feather.addColorStop(.35, `rgba(0,0,0,${strength * .94})`);
        feather.addColorStop(.72, `rgba(0,0,0,${strength * .32})`);
        feather.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = feather;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      context.globalCompositeOperation = 'source-over';
    };
    const tick = (now: number) => {
      frame = 0;
      if (document.hidden) return;
      if (now - last < 1000 / 30) { frame = requestAnimationFrame(tick); return; }
      const delta = last ? Math.min((now - last) / 1000, .1) : 0;
      elapsed += delta;
      last = now;
      clearings = clearings.filter(clearing => { clearing.life -= delta; return clearing.life > 0; });
      wheelHold = Math.max(0, wheelHold - delta);
      if (wheelHold === 0) wheelDispersal = Math.max(0, wheelDispersal - delta * .28);
      paint();
      if (!reducedMotion || clearings.length || wheelDispersal > 0) frame = requestAnimationFrame(tick);
      else last = 0;
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
    const start = () => {
      stop();
      if (document.hidden) return;
      if (reducedMotion && !clearings.length && wheelDispersal === 0) { paint(); return; }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!document.hidden && !frame) { last = 0; frame = requestAnimationFrame(tick); }
    };
    const addClearing = (x: number, y: number, radius: number) => {
      clearings.push({ x, y, radius, life: 3.6 });
      if (clearings.length > 72) clearings.splice(0, clearings.length - 72);
    };
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('dialog')) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) { previousPointer = null; return; }
      const radius = Math.min(155, Math.max(85, rect.width * .09)) / rect.width;
      if (previousPointer) {
        const dx = x - previousPointer.x; const dy = y - previousPointer.y;
        const distance = Math.hypot(dx * rect.width, dy * rect.height);
        if (distance < 8) return;
        const steps = Math.min(12, Math.max(1, Math.ceil(distance / 26)));
        for (let i = 1; i <= steps; i++) addClearing(previousPointer.x + dx * i / steps, previousPointer.y + dy * i / steps, radius);
      } else addClearing(x, y, radius);
      previousPointer = { x, y };
      wake();
    };
    const wheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest('dialog')) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const amount = Math.hypot(event.deltaX, event.deltaY) * unit;
      if (!amount) return;
      wheelDispersal = Math.min(1, wheelDispersal + Math.max(.2, amount / 140));
      wheelHold = .65;
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      addClearing(x, y, Math.min(220, rect.width * .17) / rect.width);
      wake();
    };
    const leave = () => { previousPointer = null; };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      const ratio = Math.min(1, 1000 / Math.max(rect.width, 1));
      width = element.width = Math.round(rect.width * ratio);
      height = element.height = Math.round(rect.height * ratio);
      clearings = []; previousPointer = null;
      paint();
    };
    const observer = new ResizeObserver(resize); observer.observe(element);
    resize(); start();
    document.addEventListener('visibilitychange', start);
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('pointerdown', pointer, { passive: true });
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('blur', leave);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      stop(); observer.disconnect();
      document.removeEventListener('visibilitychange', start);
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('pointerdown', pointer);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', leave);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [reducedMotion]);
  return <canvas ref={canvas} className="studio-smoke" />;
}

export default function StudioAtmosphere({ reducedMotion }: { reducedMotion: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden || reducedMotion) svg.current?.pauseAnimations();
      else svg.current?.unpauseAnimations();
    };
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [reducedMotion]);
  return <div className="studio-atmosphere" aria-hidden="true">
    <svg ref={svg} className="studio-curtains" viewBox="0 0 1672 941" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fabric-left" x1="0" y1="610" x2="0" y2="815" gradientUnits="userSpaceOnUse">
          <stop stopColor="#50152b" stopOpacity=".65" /><stop offset=".55" stopColor="#200d18" stopOpacity=".85" /><stop offset="1" stopColor="#090c11" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fabric-right" x1="1340" y1="380" x2="1390" y2="790" gradientUnits="userSpaceOnUse">
          <stop stopColor="#56142b" stopOpacity=".7" /><stop offset=".46" stopColor="#240d1a" stopOpacity=".83" /><stop offset="1" stopColor="#090c11" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="edge-right" x1="770" y1="680" x2="1672" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7e263e" stopOpacity="0" /><stop offset=".4" stopColor="#95304b" stopOpacity=".3" /><stop offset=".83" stopColor="#c34c6b" stopOpacity=".8" /><stop offset="1" stopColor="#71223a" stopOpacity=".65" />
        </linearGradient>
        <filter id="fabric-glow" x="-35%" y="-60%" width="170%" height="220%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id="fabric-edge" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation=".7" /></filter>
      </defs>
      <MovingPath frames={LEFT.map(d => d + ' L 850 814 L -30 814 Z')} duration="19s" reducedMotion={reducedMotion} fill="url(#fabric-left)" />
      <MovingPath frames={RIGHT.map(d => d + ' L 1700 810 L 770 810 Z')} duration="16s" reducedMotion={reducedMotion} fill="url(#fabric-right)" />
      <MovingPath frames={LEFT} duration="19s" reducedMotion={reducedMotion} fill="none" stroke="#9e294a" strokeWidth="24" opacity=".18" filter="url(#fabric-glow)" />
      <MovingPath frames={RIGHT} duration="16s" reducedMotion={reducedMotion} fill="none" stroke="url(#edge-right)" strokeWidth="52" opacity=".55" filter="url(#fabric-glow)" />
      <MovingPath frames={LEFT} duration="19s" reducedMotion={reducedMotion} fill="none" stroke="#a63653" strokeWidth="2" opacity=".65" filter="url(#fabric-edge)" />
      <MovingPath frames={RIGHT} duration="16s" reducedMotion={reducedMotion} fill="none" stroke="url(#edge-right)" strokeWidth="2" filter="url(#fabric-edge)" />
    </svg>
    <Smoke reducedMotion={reducedMotion} />
  </div>;
}
