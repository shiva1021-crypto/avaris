import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { PullCord } from 'pullcord';
import 'pullcord/pullcord.css';

const seenKey = 'mybi-studio-light-v3';

export function shouldPlayIntro() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'reload') return true;
  try { return !sessionStorage.getItem(seenKey); }
  catch { return true; }
}

export default function StudioIntro({ ready, finish }: { ready: boolean; finish: () => void }) {
  const [waitExpired, setWaitExpired] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const activated = useRef(false);
  const [pulled, setPulled] = useState(false);

  useEffect(() => {
    const button = root.current?.querySelector<HTMLButtonElement>('.pullcord-knob');
    button?.setAttribute('aria-describedby', 'intro-instruction');
    button?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => setWaitExpired(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  const activate = () => {
    if (activated.current) return;
    activated.current = true;
    setPulled(true);
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
    <PullCord
      className="studio-pullcord"
      noEntrance
      pulled={pulled}
      onPull={activate}
      ariaLabel="Pull the cord to turn on the studio lights"
      config={{ gravity: 1050, damping: .96, iterations: 16, stretchMax: 48, stretchToggle: 25, maxVelocity: 18 }}
    />

    <div className="intro-instruction" id="intro-instruction">
      <p className="intro-studio-name">MYBI Digital</p>
      <h1>Bring the studio to life.</h1>
      <p role="status">{pulled ? ready || waitExpired ? 'Lights on.' : 'Getting the studio ready…' : 'Pull the cord to turn on the lights.'}</p>
      {!pulled && <span>Or tap the handle to enter.</span>}
    </div>
  </div>;
}
