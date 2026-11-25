import { useEffect, useRef, useState } from 'react';
import './digital-marketing.css';

type SceneStatus = 'loading' | 'ready' | 'error';

export default function DigitalMarketingPage() {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SceneStatus>('loading');

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
        : 'Cinematic studio environment for MYBI Digital marketing.'}
    >
      <div className="digital-stage-fallback" aria-hidden="true" />
      <p className="digital-scene-notice" aria-hidden="true">Static studio view — 3D scene unavailable</p>
    </div>

    <header className="site-header digital-header">
      <a className="brand" href="/" aria-label="MYBI Digital home">
        <img className="brand-mark" src="/mybi-titanium.png" alt="" />
        <span><span className="digital-brand-mybi">MYBI</span> <span className="digital-brand-digital">Digital</span></span>
      </a>
      <a className="header-contact" href="/contact/">
        Contact
        <span className="digital-contact-arrow" aria-hidden="true">↗</span>
      </a>
    </header>

    <div className="digital-typography">
      <h1 className="digital-headline">
        <span className="digital-headline-small">Digital</span>
        <span className="digital-headline-large">Marketing</span>
      </h1>
      <p className="digital-tagline">
        <span>Strategy</span>
        <span className="digital-tagline-dot" aria-hidden="true">·</span>
        <span>Content</span>
        <span className="digital-tagline-dot" aria-hidden="true">·</span>
        <span>Campaigns</span>
        <span className="digital-tagline-dot" aria-hidden="true">·</span>
        <span>Growth</span>
      </p>
    </div>

    <p className="digital-sr-only" role="status" aria-live="polite">{statusText}</p>
  </main>;
}
