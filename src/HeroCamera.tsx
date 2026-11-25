import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { createPortal } from 'react-dom';

export default function HeroCamera({ onReady, onError, transition }: {
  onReady: () => void; onError: () => void; transition: RefObject<((url: string) => void) | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const turn = useRef<(degrees: number, push?: number) => void>(() => {});
  const running = useRef(false);
  const flash = useRef<HTMLDivElement>(null);
  const blackout = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const drag = useRef<{ id: number; x: number; start: number } | null>(null);
  const [active, setActive] = useState(false);
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    const lifetime = new AbortController();
    const fail = () => { setActive(false); onError(); };
    const surface = canvas.current!;
    surface.addEventListener('webglcontextlost', fail);
    async function load() {
      const { mountStudioCamera } = await import('./studioCamera');
      if (lifetime.signal.aborted) return;
      const rotate = await mountStudioCamera(surface, lifetime.signal);
      if (!rotate || lifetime.signal.aborted) return;
      turn.current = rotate;
      onReady();
      setActive(true);
    }
    load().catch(fail);
    return () => {
      lifetime.abort();
      surface.removeEventListener('webglcontextlost', fail);
      turn.current = () => {};
    };
  }, [onReady]);

  useEffect(() => {
    const overlay = blackout.current!;
    let timeline: gsap.core.Timeline | undefined;
    const reset = () => {
      timeline?.kill();
      running.current = false;
      gsap.set([flash.current, overlay], { opacity: 0 });
      gsap.set(document.querySelectorAll('.site-header, .headline, .lens-cta, .rotation-hint'), { clearProps: 'opacity' });
      window.dispatchEvent(new CustomEvent('avaris-transition', { detail: false }));
      turn.current(angle.current);
    };
    transition.current = url => {
      if (running.current) return;
      running.current = true;
      window.dispatchEvent(new CustomEvent('avaris-transition', { detail: true }));
      const state = { degrees: angle.current, push: 0 };
      const straight = 48;
      const destination = state.degrees + gsap.utils.wrap(-180, 180, straight - state.degrees);
      const draw = () => turn.current(state.degrees, state.push);
      timeline = gsap.timeline({ onComplete: () => {
        try { sessionStorage.setItem('avaris-lens-transition', '1'); } catch { /* Storage may be unavailable. */ }
        location.assign(url);
      } });
      timeline.to(state, { degrees: destination, duration: .95, ease: 'power3.inOut', onUpdate: draw })
        .to(flash.current, { opacity: .85, duration: .055 })
        .to(flash.current, { opacity: 0, duration: .23, ease: 'power2.out' })
        .addLabel('enterLens', '<.10')
        .to(document.querySelectorAll('.site-header, .headline, .lens-cta, .rotation-hint'), { opacity: 0, duration: .32 }, 'enterLens')
        .to(state, { push: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: draw }, 'enterLens')
        .to(overlay, { opacity: 1, duration: .4, ease: 'power2.out' }, '-=.62')
        .to(overlay, { opacity: 1, duration: .22 });
    };
    window.addEventListener('pageshow', reset);
    return () => {
      window.removeEventListener('pageshow', reset);
      timeline?.kill();
      transition.current = null;
    };
  }, [transition]);

  function rotate(degrees: number) {
    if (running.current) return;
    angle.current = degrees;
    setHeading((Math.round(degrees) % 360 + 360) % 360);
    turn.current(degrees);
  }

  return <div className={`camera-frame ${active ? 'is-interactive' : ''}`}>
    {createPortal(<>
      <div ref={flash} className="shutter-flash" aria-hidden="true" />
      <div ref={blackout} className="lens-blackout" aria-hidden="true" />
    </>, document.body)}
    <canvas className="camera-render" ref={canvas} role="img" aria-label="MYBI Digital cinema camera on its tripod" />
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
