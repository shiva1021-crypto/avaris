import { useEffect, useRef, useState } from 'react';

export default function HeroCamera({ onReady, onError }: { onReady: () => void; onError: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const turn = useRef<(degrees: number) => void>(() => {});
  const angle = useRef(0);
  const drag = useRef<{ id: number; x: number; start: number } | null>(null);
  const [active, setActive] = useState(false);
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    const lifetime = new AbortController();
    const showPoster = () => setActive(false);
    const surface = canvas.current!;
    surface.addEventListener('webglcontextlost', showPoster);
    async function load() {
      const { mountStudioCamera } = await import('./studioCamera');
      if (lifetime.signal.aborted) return;
      const rotate = await mountStudioCamera(surface, lifetime.signal);
      if (!rotate || lifetime.signal.aborted) return;
      turn.current = rotate;
      onReady();
      setActive(true);
    }
    load().catch(showPoster);
    return () => {
      lifetime.abort();
      surface.removeEventListener('webglcontextlost', showPoster);
      turn.current = () => {};
    };
  }, [onReady]);

  function rotate(degrees: number) {
    angle.current = degrees;
    setHeading((Math.round(degrees) % 360 + 360) % 360);
    turn.current(degrees);
  }

  return <div className={`camera-frame ${active ? 'is-interactive' : ''}`}>
    <img className="camera-poster" src="/assets/camera-reference-cutout.webp" width="1254" height="1254"
      alt="Avaris cinema camera on its tripod" draggable={false} fetchPriority="high" onLoad={onReady} onError={onError} />
    <canvas className="camera-render" ref={canvas} aria-hidden="true" />
    {active && <>
      <div className="camera-drag" role="slider" tabIndex={0} aria-label="Rotate cinema camera"
        aria-valuemin={0} aria-valuemax={359} aria-valuenow={heading} aria-valuetext={`${heading} degrees`}
        aria-describedby="rotation-hint"
        onPointerDown={e => {
          if (!e.isPrimary || e.button !== 0) return;
          drag.current = { id: e.pointerId, x: e.clientX, start: angle.current };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const start = drag.current;
          if (start?.id === e.pointerId) rotate(start.start + (e.clientX - start.x) * 360 / e.currentTarget.clientWidth);
        }}
        onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={e => {
          const delta = e.key === 'ArrowLeft' ? -15 : e.key === 'ArrowRight' ? 15 : 0;
          if (delta || e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            rotate(delta ? angle.current + delta : e.key === 'Home' ? 0 : 359);
          }
        }} />
      <span className="rotation-hint" id="rotation-hint">↔ Drag to rotate <span className="keyboard-hint">or use the left and right arrow keys. Home resets the view.</span></span>
    </>}
  </div>;
}
