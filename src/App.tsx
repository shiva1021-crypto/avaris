import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import HeroCamera from './HeroCamera';
import StudioAtmosphere from './StudioAtmosphere';
import ServicesPage from './ServicesPage';

const isServicesPage = window.location.pathname.startsWith('/services');

export default function App() {
  const shell = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ready = useRef(() => setLoaded(true)).current;
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener('change', change);
    const context = gsap.context(() => {
      if (media.matches) return;
      gsap.from('.site-header', { opacity: 0, y: -12, duration: 1.1, ease: 'power2.out' });
      if (isServicesPage) gsap.from('.services-opening', { opacity: 0, y: 18, duration: 1.2, delay: .15, ease: 'power3.out' });
      else gsap.from('.headline', { opacity: 0, y: 18, duration: 1.4, delay: .15, ease: 'power3.out' });
    }, shell);
    return () => { context.revert(); media.removeEventListener('change', change); };
  }, []);
  return <main ref={shell} id={isServicesPage ? 'services' : 'home'} className={isServicesPage ? 'services-page' : `homepage ${loaded ? 'is-ready' : ''}`}>
    {isServicesPage ? <div className="services-ambience" aria-hidden="true"><div className="studio-background" /><StudioAtmosphere reducedMotion={reducedMotion} fullBackdrop /></div> : <><div className="studio-background" aria-hidden="true" /><StudioAtmosphere reducedMotion={reducedMotion} /></>}
    <header className="site-header">
      <a className="brand" href="/" aria-label="Avaris home"><span className="brand-mark" aria-hidden="true" /><span>Avaris</span></a>
      <button className="contact-button" onClick={() => dialog.current?.showModal()}>Contact <span aria-hidden="true">↗</span></button>
    </header>
    {isServicesPage ? <ServicesPage onContact={() => dialog.current?.showModal()} /> : <>
    <h1 className="headline"><span>Shoot.</span>{' '}<span>Scale.</span>{' '}<span className="headline-accent">Shine.</span></h1>
    <div className="camera-stage">
      <HeroCamera onReady={ready} onError={() => setFailed(true)} />
    </div>
    <a className="lens-cta" href="/services/" aria-label="Explore our services">
      <span className="lens-dial" aria-hidden="true" />
      <span className="lens-arrow" aria-hidden="true">↗</span>
    </a>
    {!loaded && <div className="loading-label" role="status">{failed ? 'The studio could not load.' : 'Bringing the studio into focus'}{!failed && <span className="loading-line" />}{failed && <button onClick={() => location.reload()}>Try again</button>}</div>}
    </>}
    <dialog ref={dialog} className="chapter-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button className="close-dialog" aria-label="Close dialog" onClick={() => dialog.current?.close()}>×</button>
      <span className="dialog-label">Avaris / Contact</span>
      <h2>Great things start with a conversation.</h2>
      <p>Our new studio is taking shape. Contact details will be available here soon.</p>
      <button className="back-button" onClick={() => dialog.current?.close()}>Back to the studio</button>
    </dialog>
  </main>;
}


