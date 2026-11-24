import { StrictMode, Suspense, lazy, Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import './style.css';
const Scene = lazy(() => import('./Scene'));

class SceneBoundary extends Component<{ children: ReactNode; failed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('The 3D studio could not load.', error); this.props.failed(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function App() {
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
      gsap.from('.headline', { opacity: 0, y: 18, duration: 1.4, delay: .15, ease: 'power3.out' });
    }, shell);
    return () => { context.revert(); media.removeEventListener('change', change); };
  }, []);
  return <main ref={shell} id="home" className={`homepage ${loaded ? 'is-ready' : ''}`}>
    <div className="studio-background" aria-hidden="true" />
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Avaris home"><span className="brand-mark" aria-hidden="true" /><span>Avaris</span></a>
      <button className="contact-button" onClick={() => dialog.current?.showModal()}>Contact <span aria-hidden="true">↗</span></button>
    </header>
    <h1 className="headline"><span>Shoot.</span>{' '}<span>Scale.</span>{' '}<span className="headline-accent">Shine.</span></h1>
    <div className="camera-stage" role="img" aria-label="A professional cinema camera on a tripod, subtly following your cursor">
      <SceneBoundary failed={() => setFailed(true)}>
        <Suspense fallback={null}><Scene ready={ready} reducedMotion={reducedMotion} /></Suspense>
      </SceneBoundary>
    </div>
    {!loaded && <div className="loading-label" role="status">{failed ? 'The studio could not load.' : 'Bringing the studio into focus'}{!failed && <span className="loading-line" />}{failed && <button onClick={() => location.reload()}>Try again</button>}</div>}
    <dialog ref={dialog} className="chapter-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button className="close-dialog" aria-label="Close dialog" onClick={() => dialog.current?.close()}>×</button>
      <span className="dialog-label">Avaris / Contact</span>
      <h2>Great things start with a conversation.</h2>
      <p>Our new studio is taking shape. Contact details will be available here soon.</p>
      <button className="back-button" onClick={() => dialog.current?.close()}>Back to the studio</button>
    </dialog>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
