import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const seenKey = 'mybi-rope-intro';

export function shouldPlayIntro() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'reload') return true;
  try { return !sessionStorage.getItem(seenKey); }
  catch { return true; }
}

export default function StudioIntro({ ready, finish }: { ready: boolean; finish: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const pullStart = useRef(0);
  const dragging = useRef(false);
  const activated = useRef(false);
  const [pull, setPull] = useState(0);
  const [pulled, setPulled] = useState(false);

  const activate = () => {
    if (activated.current) return;
    activated.current = true;
    setPulled(true);
    setPull(value => Math.max(value, 32));
  };

  useEffect(() => {
    if (!pulled || !ready || !root.current) return;
    const fade = gsap.to(root.current, {
      opacity: 0,
      delay: .7,
      duration: .8,
      ease: 'power2.in',
      onComplete: () => {
        try { sessionStorage.setItem(seenKey, '1'); } catch { /* Playback still works without storage. */ }
        finish();
      },
    });
    return () => { fade.kill(); };
  }, [finish, pulled, ready]);

  return <div ref={root} className={`studio-intro ${pulled ? 'is-lit' : ''}`} role="dialog" aria-modal="true" aria-label="Pull the rope to turn on the light and enter">
    <div className="intro-room" aria-hidden="true">
      <div className="intro-light-beam" />
      <div className="intro-light-pool" />
      <div className="intro-pendant">
        <span className="intro-pendant-wire" />
        <span className="intro-pendant-shade" />
        <span className="intro-pendant-bulb" />
      </div>
    </div>
    <button
      className="intro-rope"
      type="button"
      aria-label="Pull the rope to turn on the light and enter the site"
      aria-pressed={pulled}
      onClick={activate}
      onPointerDown={event => {
        if (pulled) return;
        pullStart.current = event.clientY;
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!dragging.current) return;
        setPull(Math.max(0, Math.min(72, event.clientY - pullStart.current)));
      }}
      onPointerUp={event => {
        if (!dragging.current) return;
        dragging.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (event.clientY - pullStart.current >= 24) activate();
        else setPull(0);
      }}
      onPointerCancel={() => {
        dragging.current = false;
        setPull(0);
      }}
    >
      <span className="intro-rope-line" style={{ height: `calc(61vh + ${pull}px)` }} />
      <span className="intro-rope-end" style={{ transform: `translate(-50%, ${pull}px)` }} />
    </button>
  </div>;
}
