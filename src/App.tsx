import { lazy, Suspense, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import gsap from 'gsap';
import StudioIntro, { shouldPlayIntro } from './StudioIntro';
import HeroCamera from './HeroCamera';
import StudioAtmosphere from './StudioAtmosphere';
import { pages } from './pages';
import type { StudioRoomId } from './digitalScene/config';

const DigitalMarketingPage = lazy(() => import('./DigitalMarketingPage'));
const STUDIO_ROUTES: Record<string, StudioRoomId> = {
  '/services/': 'marketing',
  '/brand-films/': 'brand-films',
  '/weddings-events/': 'weddings-events',
  '/work/': 'work',
  '/about/': 'about',
};

function normalizePath(pathname: string) {
  return pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
}

type Navigate = (href: string) => void;

function handleInternalLink(event: MouseEvent<HTMLAnchorElement>, href: string, navigate: Navigate) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  navigate(href);
}

function StudioApp({ pathname, navigate }: { pathname: string; navigate: Navigate }) {
  const currentPage = pages.find(page => page.path === pathname);
  const isServicesPage = Boolean(currentPage);
  const lensTransition = useRef<((url: string) => void) | null>(null);
  const arrival = useRef<HTMLDivElement>(null);
  const [arriving] = useState(() => {
    try { return isServicesPage && sessionStorage.getItem('avaris-lens-transition') === '1'; }
    catch { return false; }
  });
  const shell = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 767px), (pointer: coarse)').matches);
  const [chapter, setChapter] = useState(-1);
  const selectedIndex = Math.max(chapter, 0);
  const selection = pages[selectedIndex];
  const changeChapter = (direction: number) => {
    setChapter(index => (Math.max(index, 0) + direction + pages.length) % pages.length);
  };
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [intro, setIntro] = useState(() => !isServicesPage && shouldPlayIntro());
  const finishIntro = useRef(() => setIntro(false)).current;
  const playingIntro = intro;
  const ready = useRef(() => setLoaded(true)).current;
  useEffect(() => {
    const mobileLayout = matchMedia('(max-width: 767px), (pointer: coarse)');
    const updateLayout = () => setMobile(mobileLayout.matches);
    mobileLayout.addEventListener('change', updateLayout);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener('change', change);
    const context = gsap.context(() => {
      if (arrival.current) {
        sessionStorage.removeItem('avaris-lens-transition');
        gsap.to(arrival.current, { opacity: 0, duration: media.matches ? 0 : .62, ease: 'power2.out' });
      }
      if (media.matches || mobileLayout.matches) return;
      gsap.from('.site-header', { opacity: 0, y: -12, duration: 1.1, ease: 'power2.out' });
      if (isServicesPage) gsap.from('.services-opening', { opacity: 0, y: 18, duration: 1.2, delay: .15, ease: 'power3.out' });
      else gsap.from('.headline', { opacity: 0, y: 18, duration: 1.4, delay: .15, ease: 'power3.out' });
    }, shell);
    return () => { context.revert(); media.removeEventListener('change', change); mobileLayout.removeEventListener('change', updateLayout); };
  }, []);
  return <><main inert={playingIntro} ref={shell} id={isServicesPage ? 'services' : 'home'} className={isServicesPage ? 'services-page' : `homepage ${loaded ? 'is-ready' : ''} ${mobile ? 'is-static-mobile' : ''}`}>
    {isServicesPage ? <div className="services-ambience" aria-hidden="true"><div className="studio-background" /><StudioAtmosphere reducedMotion={reducedMotion || mobile} fullBackdrop /></div> : <>{!playingIntro && <div className="homepage-ambience" aria-hidden="true"><StudioAtmosphere reducedMotion={reducedMotion || mobile} fullBackdrop /></div>}<h1 className="headline"><span aria-hidden="true">MYBI DIGITAL</span><span className="headline-face">MYBI DIGITAL</span></h1></>}
    <header className="site-header">
      <a className="brand" href="/" aria-label="MYBI Digital home" onClick={event => handleInternalLink(event, '/', navigate)}><img className="brand-mark" src="/mybi-titanium.png" alt="" /></a>
      <nav className="desktop-nav" aria-label="Desktop navigation">
        {pages.slice(0, -1).map(page => <a key={page.path} href={page.path} onClick={event => handleInternalLink(event, page.path, navigate)} aria-current={currentPage === page ? 'page' : undefined}>{page.title}</a>)}
      </nav>
      <button className="contact-button site-menu-toggle" aria-haspopup="dialog" onClick={() => menu.current?.showModal()}><span>Menu</span><span className="menu-lines" aria-hidden="true" /></button>
    </header>
    {currentPage ? <section className="services-opening page-copy">
      <h1>{currentPage.title}</h1>
      <p>{currentPage.description}</p>
      {currentPage.details && <p>{currentPage.details}</p>}
      {currentPage.path !== '/contact/' && <a href="/contact/">Contact us ↗</a>}
    </section> : <>
    <div className="camera-stage">
      <HeroCamera onReady={ready} onError={() => setFailed(true)} transition={lensTransition} chapterAngle={chapter < 0 ? null : selection.angle} minimalMotion={mobile} navigate={navigate} />
    </div>
    <nav className="chapter-nav" aria-label="Featured pages">
      <button className="chapter-neighbor previous" type="button" onClick={() => changeChapter(-1)}>{pages[(selectedIndex - 1 + pages.length) % pages.length].title}</button>
      <button className="chapter-arrow previous" type="button" aria-label="Show previous page" onClick={() => changeChapter(-1)}><span aria-hidden="true" /></button>
      <a className="chapter-link" href={selection.path} onClick={event => {
        if (!loaded || reducedMotion || !lensTransition.current || event.metaKey || event.ctrlKey ||
            event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        lensTransition.current(event.currentTarget.href);
      }}>
        <span className="chapter-frame" aria-hidden="true">{String(selectedIndex + 1).padStart(2, '0')} <span>/</span> {String(pages.length).padStart(2, '0')}</span>
        <span className="chapter-title" aria-live="polite">{selection.title}</span>
        <span className="chapter-open" aria-hidden="true">↗</span>
      </a>
      <button className="chapter-arrow next" type="button" aria-label="Show next page" onClick={() => changeChapter(1)}><span aria-hidden="true" /></button>
      <button className="chapter-neighbor next" type="button" onClick={() => changeChapter(1)}>{pages[(selectedIndex + 1) % pages.length].title}</button>
    </nav>
    {failed && <div className="loading-label" role="status">The studio could not load.<button onClick={() => location.reload()}>Try again</button></div>}
    </>}
    {arriving && <div ref={arrival} className="lens-blackout lens-arrival" aria-hidden="true" />}
    <dialog ref={menu} className="chapter-dialog site-menu" aria-label="Site menu" onClick={event => { if (event.target === event.currentTarget) menu.current?.close(); }}>
      <button className="close-dialog" aria-label="Close menu" onClick={() => menu.current?.close()}>×</button>
      <nav aria-label="Main navigation">
        <a href="/" onClick={event => handleInternalLink(event, '/', navigate)} aria-current={currentPage ? undefined : 'page'}>Home</a>
        {pages.map(page => <a key={page.path} href={page.path} onClick={event => handleInternalLink(event, page.path, navigate)} aria-current={currentPage === page ? 'page' : undefined}>{page.title}</a>)}
      </nav>
    </dialog>
  </main>{playingIntro && <StudioIntro ready={loaded || failed} finish={finishIntro} reducedMotion={reducedMotion || mobile} />}</>;
}

export default function App() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));
  const navigate = useCallback<Navigate>(href => {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }
    const nextPath = normalizePath(url.pathname);
    if (nextPath === normalizePath(window.location.pathname) && url.search === window.location.search && url.hash === window.location.hash) return;
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = normalizePath(window.location.pathname);
      setPathname(currentPath => STUDIO_ROUTES[currentPath] && STUDIO_ROUTES[nextPath] ? currentPath : nextPath);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const initialStudioRoom = STUDIO_ROUTES[pathname];
  const isStudioRoomPage = Boolean(initialStudioRoom);
  if (isStudioRoomPage) {
    let lensArriving = false;
    try { lensArriving = sessionStorage.getItem('avaris-lens-transition') === '1'; } catch { /* Storage may be unavailable. */ }
    return <Suspense fallback={lensArriving
      ? <div className="lens-blackout lens-arrival" aria-hidden="true" />
      : <div role="status" aria-live="polite" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#e5e4e2', font: "500 13px 'DM Sans', sans-serif", letterSpacing: '.08em' }}>Preparing MYBI Digital…</div>
    }><DigitalMarketingPage initialRoom={initialStudioRoom} navigate={navigate} /></Suspense>;
  }
  return <StudioApp pathname={pathname} navigate={navigate} />;
}


