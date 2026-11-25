import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

const seenKey = 'mybi-studio-intro';

export function shouldPlayIntro() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'reload') return true;
  try { return !sessionStorage.getItem(seenKey); }
  catch { return true; }
}

export default function StudioIntro({ ready, finish }: { ready: boolean; finish: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const release = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const overlay = root.current!;
    const word = overlay.querySelector('.intro-name')!;
    const mark = overlay.querySelector('.intro-mark')!;
    const field = overlay.querySelector('.intro-field')!;
    const skip = overlay.querySelector('.intro-skip')!;
    const hero = document.getElementById('home')!;
    let released = false;
    const target = (axis: 'x' | 'y') => {
      const opticalCenter = parseFloat(hero.style.getPropertyValue('--optic-' + axis));
      const box = mark.getBoundingClientRect();
      const center = axis === 'x' ? box.left + box.width / 2 : box.top + box.height / 2;
      const fallback = axis === 'x' ? innerWidth * .44 : innerHeight * .62;
      return (Number.isFinite(opticalCenter) ? opticalCenter : fallback) - center;
    };
    const tl = gsap.timeline({ onComplete: finish });
    tl.fromTo(mark, { opacity: 0, scale: .78 }, { opacity: 1, scale: 1, duration: .4 })
      .fromTo(word, { yPercent: 110 }, { yPercent: 0, duration: .65, ease: 'power4.out' }, .09)
      .addLabel('hold', .82)
      .call(() => { if (!released) tl.pause(); }, [], 'hold')
      .to(word, { yPercent: -115, duration: .47, ease: 'power3.inOut' }, 'hold')
      .to(skip, { opacity: 0, duration: .24 }, 'hold')
      .to(mark, { x: () => target('x'), y: () => target('y'), scale: .24, rotation: -28,
        borderRadius: '80% 10%', duration: .78, ease: 'power3.inOut' }, 'hold')
      .to(field, { '--reveal': '155vmax', duration: .95, ease: 'power3.inOut' }, 'hold+=.3')
      .to(mark, { opacity: 0, duration: .28 }, 'hold+=.78');
    tl.call(() => {
      const x = hero.style.getPropertyValue('--optic-x') || '50%';
      const y = hero.style.getPropertyValue('--optic-y') || '60%';
      gsap.set(field, { '--reveal-x': x, '--reveal-y': y });
    }, [], 'hold+=.01');
    release.current = () => { released = true; tl.play(); };
    const timeout = window.setTimeout(() => release.current(), 2400);
    try { sessionStorage.setItem(seenKey, '1'); } catch { /* Playback still works without storage. */ }
    return () => { clearTimeout(timeout); tl.kill(); };
  }, [finish]);

  useLayoutEffect(() => { if (ready) release.current(); }, [ready]);
  return <div ref={root} className="studio-intro" aria-label="MYBI Digital introduction">
    <div className="intro-field" />
    <div className="intro-lockup" aria-hidden="true"><img className="intro-mark" src="/mybi-titanium.png" alt="" /><span className="intro-name-clip"><span className="intro-name">MYBI Digital</span></span></div>
    <button className="intro-skip" onClick={finish}>Skip intro</button>
  </div>;
}
