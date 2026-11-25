import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import StudioIntro, { shouldPlayIntro } from './StudioIntro';
import HeroCamera from './HeroCamera';
import StudioAtmosphere from './StudioAtmosphere';
import ServicesPage from './ServicesPage';

const isServicesPage = window.location.pathname.startsWith('/services');

export default function App() {
  const lensTransition = useRef<((url: string) => void) | null>(null);
  const arrival = useRef<HTMLDivElement>(null);
  const [arriving] = useState(() => {
    try { return isServicesPage && sessionStorage.getItem('avaris-lens-transition') === '1'; }
    catch { return false; }
  });
  const shell = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [intro, setIntro] = useState(() => !isServicesPage && shouldPlayIntro());
  const finishIntro = useRef(() => setIntro(false)).current;
  const playingIntro = intro && !reducedMotion && !failed;
  const ready = useRef(() => setLoaded(true)).current;
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener('change', change);
    const context = gsap.context(() => {
      if (arrival.current) {
        sessionStorage.removeItem('avaris-lens-transition');
        gsap.to(arrival.current, { opacity: 0, duration: media.matches ? 0 : .62, ease: 'power2.out' });
      }
      if (media.matches) return;
      gsap.from('.site-header', { opacity: 0, y: -12, duration: 1.1, ease: 'power2.out' });
      if (isServicesPage) gsap.from('.services-opening', { opacity: 0, y: 18, duration: 1.2, delay: .15, ease: 'power3.out' });
      else gsap.from('.headline', { opacity: 0, y: 18, duration: 1.4, delay: .15, ease: 'power3.out' });
    }, shell);
    return () => { context.revert(); media.removeEventListener('change', change); };
  }, []);
  return <><main inert={playingIntro} ref={shell} id={isServicesPage ? 'services' : 'home'} className={isServicesPage ? 'services-page' : `homepage ${loaded ? 'is-ready' : ''}`}>
    {isServicesPage ? <div className="services-ambience" aria-hidden="true"><div className="studio-background" /><StudioAtmosphere reducedMotion={reducedMotion} fullBackdrop /></div> : <><div className="studio-background" aria-hidden="true" /><h1 className="headline"><span aria-hidden="true">MYBI DIGITAL</span><span className="headline-face">MYBI DIGITAL</span></h1><StudioAtmosphere reducedMotion={reducedMotion} /></>}
    <header className="site-header">
      <a className="brand" href="/" aria-label="MYBI Digital home"><img className="brand-mark" src="/mybi-logo.png" alt="" />{isServicesPage && <span>MYBI Digital</span>}</a>
      <button className="contact-button" onClick={() => dialog.current?.showModal()}>Contact</button>
    </header>
    {isServicesPage ? <ServicesPage onContact={() => dialog.current?.showModal()} /> : <>
    <div className="camera-stage">
      <HeroCamera onReady={ready} onError={() => setFailed(true)} transition={lensTransition} />
    </div>
    <a className="lens-cta" href="/services/" aria-label="Explore our services" onClick={event => {
      if (!loaded || reducedMotion || !lensTransition.current || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      lensTransition.current(event.currentTarget.href);
    }}>
      <span className="lens-dial" aria-hidden="true" />
      <span className="lens-arrow" aria-hidden="true">↗</span>
    </a>
    {!loaded && <div className="loading-label" role="status">{failed ? 'The studio could not load.' : 'Bringing the studio into focus'}{!failed && <span className="loading-line" />}{failed && <button onClick={() => location.reload()}>Try again</button>}</div>}
    </>}
    {arriving && <div ref={arrival} className="lens-blackout lens-arrival" aria-hidden="true" />}
    <dialog ref={dialog} className="chapter-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button className="close-dialog" aria-label="Close dialog" onClick={() => dialog.current?.close()}>×</button>
      <span className="dialog-label">MYBI Digital / Contact</span>
      <h2>Great things start with a conversation.</h2>
      <p>Our new studio is taking shape. Contact details will be available here soon.</p>
      <button className="back-button" onClick={() => dialog.current?.close()}>Back to the studio</button>
    </dialog>
  </main>{playingIntro && <StudioIntro ready={loaded} finish={finishIntro} />}</>;
}


