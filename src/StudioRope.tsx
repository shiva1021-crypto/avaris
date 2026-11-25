import { useEffect, useRef, useState } from 'react';

type OrientationAccess = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };

export default function StudioRope({ onReturn }: { onReturn: () => void }) {
  const path = useRef<SVGPathElement>(null);
  const grip = useRef<HTMLButtonElement>(null);
  const handle = useRef<SVGGElement>(null);
  const complete = useRef(onReturn);
  complete.current = onReturn;
  const actions = useRef({ down: (_x: number, _y: number) => {}, move: (_x: number, _y: number) => {}, up: (_cancel: boolean) => {}, tap: () => {} });
  const [tilt, setTilt] = useState('Enable tilt');
  const tiltValue = useRef(0);

  async function enableTilt() {
    const sensor = window.DeviceOrientationEvent as OrientationAccess | undefined;
    if (!sensor) { setTilt('Tilt unavailable'); return; }
    try {
      if (sensor.requestPermission && await sensor.requestPermission() !== 'granted') {
        setTilt('Tilt permission denied'); return;
      }
      setTilt('Tilt enabled');
    } catch { setTilt('Tilt unavailable'); }
  }

  useEffect(() => {
    if (tilt !== 'Tilt enabled') return;
    const orient = (event: DeviceOrientationEvent) => {
      const rotation = screen.orientation?.angle ?? 0;
      const radians = rotation * Math.PI / 180;
      const value = (event.gamma ?? 0) * Math.cos(radians) + (event.beta ?? 0) * Math.sin(radians);
      tiltValue.current = Math.max(-.55, Math.min(.55, value / 60));
    };
    window.addEventListener('deviceorientation', orient);
    return () => window.removeEventListener('deviceorientation', orient);
  }, [tilt]);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const count = 24;
    let length = innerHeight * .43;
    let anchor = innerWidth / 2;
    const nodes = Array.from({ length: count }, (_, i) => ({ x: anchor, y: i * length / (count - 1), ox: anchor, oy: i * length / (count - 1) }));
    let dragging = false, armed = false, returning = false, finished = false;
    let startX = 0, startY = 0, moved = false;
    let targetX = anchor, targetY = length, extension = 0;
    let frame = 0, last = 0, returnTime = 0;
    const paint = () => {
      let d = 'M ' + nodes[0].x + ' ' + nodes[0].y;
      for (let i = 1; i < count - 1; i++) {
        const point = nodes[i], next = nodes[i + 1];
        d += ' Q ' + point.x + ' ' + point.y + ' ' + (point.x + next.x) / 2 + ' ' + (point.y + next.y) / 2;
      }
      const end = nodes[count - 1];
      d += ' L ' + end.x + ' ' + end.y;
      path.current?.setAttribute('d', d);
      handle.current?.setAttribute('transform', 'translate(' + end.x + ' ' + end.y + ')');
      if (grip.current) grip.current.style.transform = 'translate(' + (end.x - 24) + 'px,' + (end.y - 24) + 'px)';
    };
    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min((now - (last || now)) / 1000, .025);
      last = now;
      if (!document.hidden && !finished) {
        extension += ((dragging ? Math.max(0, Math.min(65, targetY - length)) : 0) - extension) * (1 - Math.exp(-dt * 12));
        const side = returning || reduce.matches ? 0 : tiltValue.current;
        for (let i = 1; i < count; i++) {
          const node = nodes[i];
          const vx = (node.x - node.ox) * .965, vy = (node.y - node.oy) * .965;
          node.ox = node.x; node.oy = node.y;
          node.x += vx + side * 900 * dt * dt;
          node.y += vy + 1400 * dt * dt;
        }
        for (let pass = 0; pass < 20; pass++) {
          nodes[0].x = anchor; nodes[0].y = 0;
          if (dragging) { nodes[count - 1].x = targetX; nodes[count - 1].y = targetY; }
          for (let i = 0; i < count - 1; i++) {
            const a = nodes[i], b = nodes[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const distance = Math.max(.001, Math.hypot(dx, dy));
            const error = (distance - (length + extension) / (count - 1)) / distance;
            const fixedA = i === 0, fixedB = dragging && i === count - 2;
            const amount = fixedA || fixedB ? 1 : .5;
            if (!fixedA) { a.x += dx * error * amount; a.y += dy * error * amount; }
            if (!fixedB) { b.x -= dx * error * amount; b.y -= dy * error * amount; }
          }
        }
        if (returning) {
          returnTime += dt;
          // Guide the released cord back upright before revealing the room.
          for (let i = 1; i < count; i++) nodes[i].x += (anchor - nodes[i].x) * (1 - Math.exp(-dt * 5));
          const end = nodes[count - 1];
          if (returnTime > .3 && Math.abs(end.y - length) < 7 && Math.abs(end.x - anchor) < 8 && extension < 2) {
            finished = true;
            complete.current();
          }
        }
        paint();
      }
      if (!finished) frame = requestAnimationFrame(tick);
    };
    const wake = () => { if (!frame) { last = 0; frame = requestAnimationFrame(tick); } };
    actions.current = {
      down(x, y) {
        if (returning || finished) return;
        dragging = true; armed = false; moved = false; startX = x; startY = y;
        targetX = nodes[count - 1].x; targetY = nodes[count - 1].y; wake();
      },
      move(x, y) {
        if (!dragging) return;
        moved ||= Math.hypot(x - startX, y - startY) > 5;
        targetX = Math.max(anchor - 100, Math.min(anchor + 100, x));
        targetY = Math.max(length - 60, Math.min(length + 65, length + y - startY));
        armed ||= y - startY > 25;
      },
      up(cancel) {
        if (!dragging) return;
        dragging = false;
        if (!cancel && (armed || !moved)) { returning = true; returnTime = 0; }
        wake();
      },
      tap() {
        if (returning || finished) return;
        extension = 36; returning = true; returnTime = 0;
        wake();
      },
    };
    const resize = () => { length = innerHeight * .43; anchor = innerWidth / 2; };
    window.addEventListener('resize', resize);
    grip.current?.focus({ preventScroll: true });
    paint(); wake();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);

  return <>
    <svg className="rope-simulation" aria-hidden="true">
      <defs><linearGradient id="rope-grip"><stop stopColor="#441d30" /><stop offset=".45" stopColor="#c57a94" /><stop offset="1" stopColor="#441d30" /></linearGradient></defs>
      <path ref={path} fill="none" stroke="#92949c" strokeWidth="2" strokeLinecap="round" />
      <g ref={handle}><rect x="-7" y="0" width="14" height="28" rx="6" fill="url(#rope-grip)" stroke="#b76f88" /></g>
    </svg>
    <button ref={grip} className="rope-grip" aria-label="Pull and release the cord to turn on the studio lights" aria-describedby="intro-instruction"
      onPointerDown={event => { if (!event.isPrimary || event.button !== 0) return; actions.current.down(event.clientX, event.clientY); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => actions.current.move(event.clientX, event.clientY)}
      onPointerUp={event => { actions.current.up(false); event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => actions.current.up(true)}
      onLostPointerCapture={() => actions.current.up(true)}
      onClick={event => { if (event.detail === 0) actions.current.tap(); }} />
    <button className="rope-tilt" onClick={enableTilt} disabled={tilt === 'Tilt enabled'}>{tilt}</button>
  </>;
}
