import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { createPortal } from 'react-dom';
import { loadCachedBinary } from './digitalScene/assetCache';
import desktopRigUrl from '../models/avaris-camera-tripod.glb?url';
import mobileRigUrl from '../models/avaris-camera-tripod-mobile.glb?url';

const cameraPosterUrl = new URL('../design-archive/camera-reference-cutout.webp', import.meta.url).href;

export default function HeroCamera({ onReady, onError, transition, chapterAngle, minimalMotion }: {
  minimalMotion: boolean;
  chapterAngle: number | null;
  onReady: () => void; onError: () => void; transition: RefObject<((url: string) => void) | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const turn = useRef<(degrees: number, push?: number) => void>(() => {});
  const running = useRef(false);
  const flash = useRef<HTMLDivElement>(null);
  const blackout = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const hasSelectedChapter = useRef(false);
  const chapterTurn = useRef<gsap.core.Tween | null>(null);
  const idlePan = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const lifetime = new AbortController();
    const fail = () => { setActive(false); onError(); };
    const surface = canvas.current!;
    surface.addEventListener('webglcontextlost', fail);
    async function load() {
      const rigUrl = matchMedia('(pointer: coarse), (max-width: 600px)').matches ? mobileRigUrl : desktopRigUrl;
      const [studioCamera, rigData] = await Promise.all([
        import('./studioCamera'),
        loadCachedBinary(rigUrl),
      ]);
      if (lifetime.signal.aborted) return;
      const rotate = await studioCamera.mountStudioCamera(surface, lifetime.signal, rigData);
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
    if (!active) return;
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      if (minimalMotion) window.dispatchEvent(new CustomEvent('avaris-transition', { detail: true }));
      const pose = { degrees: angle.current };
      const neutral = pose.degrees;
      const pan = gsap.timeline({
        paused: true,
        repeat: -1,
        repeatDelay: 1.4,
        delay: 1.6,
        defaults: { ease: 'sine.inOut' },
        onUpdate: () => {
          if (running.current || document.hidden || canvas.current?.closest('[inert]') || document.querySelector('dialog[open]')) return;
          angle.current = pose.degrees;
          turn.current(pose.degrees);
        },
      });
      pan.to(pose, { degrees: neutral - 19, duration: 3 })
        .to(pose, { degrees: neutral + 26, duration: 5.2 })
        .to(pose, { degrees: neutral, duration: 3.4 });
      idlePan.current = pan;
      pan.play();
      return () => {
        idlePan.current = null;
        pan.kill();
        if (minimalMotion) window.dispatchEvent(new CustomEvent('avaris-transition', { detail: false }));
      };
    });
    return () => motion.revert();
  }, [active, minimalMotion]);

  useEffect(() => {
    if (!active || chapterAngle === null || running.current) return;
    hasSelectedChapter.current = true;
    idlePan.current?.pause();
    const suspendAtmosphere = minimalMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setAtmosphereSuspended = (suspended: boolean) =>
      window.dispatchEvent(new CustomEvent('avaris-transition', { detail: suspended }));
    if (suspendAtmosphere) setAtmosphereSuspended(true);
    const pose = { degrees: angle.current };
    chapterTurn.current = gsap.to(pose, {
      degrees: chapterAngle,
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : minimalMotion ? 1.05 : 1.35,
      ease: 'power3.inOut',
      onUpdate: () => {
        angle.current = pose.degrees;
        turn.current(pose.degrees);
      },
      onComplete: () => { if (suspendAtmosphere) setAtmosphereSuspended(false); },
    });
    return () => {
      chapterTurn.current?.kill();
      if (suspendAtmosphere) setAtmosphereSuspended(false);
    };
  }, [active, chapterAngle, minimalMotion]);

  useEffect(() => {
    const overlay = blackout.current!;
    let timeline: gsap.core.Timeline | undefined;
    const reset = () => {
      timeline?.kill();
      running.current = false;
      gsap.set([flash.current, overlay], { opacity: 0 });
      gsap.set(canvas.current, { clearProps: 'transform,willChange' });
      gsap.set(document.querySelectorAll('.site-header, .headline, .chapter-nav'), { clearProps: 'opacity' });
      window.dispatchEvent(new CustomEvent('avaris-transition', { detail: false }));
      turn.current(angle.current);
      if (!hasSelectedChapter.current) idlePan.current?.resume();
    };
    transition.current = url => {
      if (running.current) return;
      idlePan.current?.pause();
      chapterTurn.current?.kill();
      running.current = true;
      window.dispatchEvent(new CustomEvent('avaris-transition', { detail: true }));
      const state = { degrees: angle.current, push: 0 };
      const straight = 48;
      const destination = state.degrees + gsap.utils.wrap(-180, 180, straight - state.degrees);
      const draw = () => turn.current(state.degrees, state.push);
      if (minimalMotion) gsap.set(canvas.current, { willChange: 'transform' });
      timeline = gsap.timeline({ onComplete: () => {
        try { sessionStorage.setItem('avaris-lens-transition', '1'); } catch { /* Storage may be unavailable. */ }
        location.assign(url);
      } });
      timeline.to(state, { degrees: destination, duration: .95, ease: 'power3.inOut', onUpdate: draw })
        .to(flash.current, { opacity: .85, duration: .055 })
        .to(flash.current, { opacity: 0, duration: .23, ease: 'power2.out' })
        .addLabel('enterLens', '<.10')
        .to(document.querySelectorAll('.site-header, .headline, .chapter-nav'), { opacity: 0, duration: .32 }, 'enterLens')
        .to(minimalMotion ? canvas.current : state, minimalMotion
          ? { scale: 5, duration: 1.15, ease: 'power2.inOut' }
          : { push: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: draw }, 'enterLens')
        .to(overlay, { opacity: 1, duration: .4, ease: 'power2.out' }, '-=.62')
        .to(overlay, { opacity: 1, duration: .22 });
    };
    window.addEventListener('pageshow', reset);
    return () => {
      window.removeEventListener('pageshow', reset);
      timeline?.kill();
      transition.current = null;
    };
  }, [transition, minimalMotion]);

  return <div className={`camera-frame ${active ? 'is-interactive' : ''}`}>
    <img className="camera-poster" src={cameraPosterUrl} alt="" aria-hidden="true" fetchPriority="high" />
    {createPortal(<>
      <div ref={flash} className="shutter-flash" aria-hidden="true" />
      <div ref={blackout} className="lens-blackout" aria-hidden="true" />
    </>, document.body)}
    <canvas className="camera-render" ref={canvas} role="img" aria-label="MYBI Digital cinema camera on its tripod" />
  </div>;
}
