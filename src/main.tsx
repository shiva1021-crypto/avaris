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
  const [section, setSection] = useState('Contact');
  const [menu, setMenu] = useState(false);
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
  const open = (name: string) => { setSection(name); setMenu(false); dialog.current?.showModal(); };
  return <main ref={shell} id="home" className={`homepage ${loaded ? 'is-ready' : ''}`}>
    <div className="studio-background" aria-hidden="true" />
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Avaris home"><span className="brand-mark" aria-hidden="true" /><span>Avaris</span></a>
      <nav className={menu ? 'navigation is-open' : 'navigation'} aria-label="Main navigation">
        <a className="nav-link active" aria-current="page" href="#home" onClick={() => setMenu(false)}>Home</a>
        {['Services', 'Work', 'About'].map(name => <button className="nav-link" key={name} onClick={() => open(name)}>{name}</button>)}
      </nav>
      <button className="contact-button" onClick={() => open('Contact')}>Contact <span aria-hidden="true">↗</span></button>
      <button className="menu-button" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} onClick={() => setMenu(!menu)}><span /><span /></button>
    </header>
    <h1 className="headline">Shoot. Scale. <span>Shine.</span></h1>
    <div className="camera-stage" role="img" aria-label="A professional cinema camera on a tripod, subtly following your cursor">
      <SceneBoundary failed={() => setFailed(true)}>
        <Suspense fallback={null}><Scene ready={ready} reducedMotion={reducedMotion} /></Suspense>
      </SceneBoundary>
    </div>
    {!loaded && <div className="loading-label" role="status">{failed ? 'The studio could not load.' : 'Bringing the studio into focus'}{!failed && <span className="loading-line" />}{failed && <button onClick={() => location.reload()}>Try again</button>}</div>}
    <dialog ref={dialog} className="chapter-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button className="close-dialog" aria-label="Close dialog" onClick={() => dialog.current?.close()}>×</button>
      <span className="dialog-label">Avaris / {section}</span>
      <h2>{section === 'Contact' ? 'Great things start with a conversation.' : 'Coming into focus.'}</h2>
      <p>{section === 'Contact' ? 'Our new studio is taking shape. Contact details will be available here soon.' : `Our ${section.toLowerCase()} page is taking shape. For now, welcome to our new perspective.`}</p>
      <button className="back-button" onClick={() => dialog.current?.close()}>Back to the studio</button>
    </dialog>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
