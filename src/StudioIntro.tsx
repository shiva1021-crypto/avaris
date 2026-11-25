import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const seenKey = 'mybi-studio-light-v2';

export function shouldPlayIntro() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'reload') return true;
  try { return !sessionStorage.getItem(seenKey); }
  catch { return true; }
}

export default function StudioIntro({ ready, finish }: { ready: boolean; finish: () => void }) {
  const switchButton = useRef<HTMLButtonElement>(null);
  const [waitExpired, setWaitExpired] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pullStart = useRef(0);
  const dragging = useRef(false);
  const activated = useRef(false);
  const [pull, setPull] = useState(0);
  const [pulled, setPulled] = useState(false);

  useEffect(() => {
    switchButton.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => setWaitExpired(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  const activate = () => {
    if (activated.current) return;
    activated.current = true;
    setPulled(true);
    setPull(value => Math.max(value, 32));
  };

  useEffect(() => {
    if (!pulled || (!ready && !waitExpired) || !root.current) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = gsap.to(root.current, {
      opacity: 0,
      delay: reduce ? 0 : .35,
      duration: reduce ? 0 : 1.1,
      ease: 'power2.in',
      onComplete: () => {
        try { sessionStorage.setItem(seenKey, '1'); } catch { /* Playback still works without storage. */ }
        finish();
        requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>('.brand')?.focus({ preventScroll: true }));
      },
    });
    return () => { fade.kill(); };
  }, [finish, pulled, ready, waitExpired]);

  return <div ref={root} className={`studio-intro ${pulled ? 'is-lit' : ''}`} role="dialog" aria-modal="true" aria-label="Pull the rope to turn on the light and enter">
    <div className="intro-room" aria-hidden="true">
      <div className="intro-light-beam" />
      <div className="intro-light-pool" />

    </div>
    <button
      ref={switchButton}
      className="intro-rope"
      type="button"
      aria-label="Pull the rope to turn on the light and enter the site"
      aria-pressed={pulled}
      aria-describedby="intro-instruction"
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
      <span className="intro-rope-line" style={{ height: `calc(43svh + ${pull}px)` }} />
      <span className="intro-rope-end" style={{ transform: `translate(-50%, ${pull}px)` }} />
    </button>
    <div className="intro-instruction" id="intro-instruction">
      <p className="intro-studio-name">MYBI Digital</p>
      <h1>Bring the studio to life.</h1>
      <p role="status">{pulled ? ready || waitExpired ? 'Lights on.' : 'Getting the studio ready…' : 'Pull the cord to turn on the lights.'}</p>
      {!pulled && <span>Or tap the handle to enter.</span>}
    </div>
  </div>;
}
