import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { preloadCachedBinary } from './digitalScene/assetCache';
import { digitalSceneConfig } from './digitalScene/config';
import { pages } from './pages';
import './digital-marketing.css';

// Start warming the scene assets as soon as this route's chunk is evaluated.
// The loader shares the same cache, so reloads reuse these bytes.
preloadCachedBinary(digitalSceneConfig.character.url);
preloadCachedBinary(digitalSceneConfig.globe.mask);

type SceneStatus = 'loading' | 'ready' | 'error';

export default function DigitalMarketingPage() {
  const host = useRef<HTMLDivElement>(null);
  const arrival = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const currentPage = pages.find(page => page.path === '/services/');
  const [arriving, setArriving] = useState(() => {
    try { return sessionStorage.getItem('avaris-lens-transition') === '1'; }
    catch { return false; }
  });
  const [status, setStatus] = useState<SceneStatus>('loading');

  useEffect(() => {
    if (!arriving || !arrival.current) return;
    try { sessionStorage.removeItem('avaris-lens-transition'); } catch { /* Storage may be unavailable. */ }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = gsap.to(arrival.current, {
      opacity: 0,
      duration: reduced ? 0 : 0.62,
      ease: 'power2.out',
      onComplete: () => setArriving(false),
    });
    const clearArrival = () => setArriving(false);
    window.addEventListener('pageshow', clearArrival);
    return () => {
      fade.kill();
      window.removeEventListener('pageshow', clearArrival);
    };
  }, [arriving]);

  useEffect(() => {
    const sceneHost = host.current;
    if (!sceneHost) return;
    const controller = new AbortController();
    let cancelled = false;

    // The renderer and its Three.js dependencies are only requested on this route.
    import('./digitalScene')
      .then(({ mountDigitalScene }) => {
        if (cancelled) return;
        return mountDigitalScene(sceneHost, controller.signal);
      })
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(error => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const statusText = status === 'loading'
    ? 'Preparing the cinematic studio environment.'
    : status === 'ready'
      ? 'Cinematic studio environment ready.'
      : 'The cinematic studio environment could not load. A static studio view is shown.';

  return <main className="digital-marketing-page">
    <div className="digital-environment" aria-hidden="true" />
    <div className="digital-atmosphere" aria-hidden="true" />

    <div
      ref={host}
      className={`digital-canvas-host digital-canvas-host--${status}`}
      data-scene-host=""
      role="img"
      aria-busy={status === 'loading'}
      aria-label={status === 'ready'
        ? 'A figure seen from behind in a cinematic studio, with a large holographic Earth and burgundy orbital rings.'
        : 'Cinematic studio environment for MYBI Digital.'}
    >
      <div className="digital-stage-fallback" aria-hidden="true" />
      <p className="digital-scene-notice" aria-hidden="true">Static studio view — 3D scene unavailable</p>
    </div>

    <header className="site-header">
      <a className="brand" href="/" aria-label="MYBI Digital home"><img className="brand-mark" src="/mybi-titanium.png" alt="" /></a>
      <nav className="desktop-nav" aria-label="Desktop navigation">
        {pages.slice(0, -1).map(page => <a key={page.path} href={page.path} aria-current={currentPage === page ? 'page' : undefined}>{page.title}</a>)}
      </nav>
      <button className="contact-button site-menu-toggle" aria-haspopup="dialog" onClick={() => menu.current?.showModal()}><span>Menu</span><span className="menu-lines" aria-hidden="true" /></button>
    </header>

    <dialog ref={menu} className="chapter-dialog site-menu" aria-label="Site menu" onClick={event => { if (event.target === event.currentTarget) menu.current?.close(); }}>
      <button className="close-dialog" aria-label="Close menu" onClick={() => menu.current?.close()}>×</button>
      <nav aria-label="Main navigation">
        <a href="/">Home</a>
        {pages.map(page => <a key={page.path} href={page.path} aria-current={currentPage === page ? 'page' : undefined}>{page.title}</a>)}
      </nav>
    </dialog>

    <h1 className="digital-sr-only">Business Marketing</h1>
    <p className="digital-sr-only" role="status" aria-live="polite">{statusText}</p>
    {arriving && <div ref={arrival} className="lens-blackout lens-arrival" aria-hidden="true" />}
  </main>;
}
