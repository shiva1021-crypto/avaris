import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import gsap from 'gsap';
import { preloadCachedBinary } from './digitalScene/assetCache';
import { digitalSceneConfig, type StudioRoomId } from './digitalScene/config';
import type { DigitalSceneController } from './digitalScene';
import { pages } from './pages';
import './digital-marketing.css';

// Warm the core 360 studio assets as soon as this chunk is evaluated.
preloadCachedBinary(digitalSceneConfig.character.url);
preloadCachedBinary(digitalSceneConfig.globe.mask);
preloadCachedBinary(digitalSceneConfig.brandFilms.screens.left);
preloadCachedBinary(digitalSceneConfig.brandFilms.screens.upperRight);
preloadCachedBinary(digitalSceneConfig.brandFilms.screens.lowerRight);

type SceneStatus = 'loading' | 'ready' | 'error';

const ROOM_META: Record<StudioRoomId, {
  path: string;
  pageTitle: string;
  ariaReady: string;
}> = {
  marketing: {
    path: '/services/',
    pageTitle: 'Business Marketing — MYBI Digital',
    ariaReady: 'A figure seen from behind in a cinematic studio, with a large holographic Earth and burgundy orbital rings.',
  },
  'brand-films': {
    path: '/brand-films/',
    pageTitle: 'Shop & Brand Films — MYBI Digital',
    ariaReady: 'A dark studio set with a luxury fragrance bottle on an illuminated pedestal, cinema camera on a slider rail, studio lights, director chair, and floating film screens.',
  },
};

function roomFromPath(pathname: string): StudioRoomId | null {
  const normalized = pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  if (normalized === '/services/') return 'marketing';
  if (normalized === '/brand-films/') return 'brand-films';
  return null;
}

export default function DigitalMarketingPage({ initialRoom = 'marketing' }: { initialRoom?: StudioRoomId }) {
  const host = useRef<HTMLDivElement>(null);
  const arrival = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const sceneController = useRef<DigitalSceneController | null>(null);

  const [room, setRoom] = useState<StudioRoomId>(initialRoom);
  const [arriving, setArriving] = useState(() => {
    try { return sessionStorage.getItem('avaris-lens-transition') === '1'; }
    catch { return false; }
  });
  const [status, setStatus] = useState<SceneStatus>('loading');

  const activeMeta = ROOM_META[room];
  const currentPage = pages.find(page => page.path === activeMeta.path);

  const applyRoom = useCallback((nextRoom: StudioRoomId, immediate = false) => {
    setRoom(nextRoom);
    document.title = ROOM_META[nextRoom].pageTitle;
    sceneController.current?.setRoom(nextRoom, immediate);
  }, []);

  const navigateToRoom = useCallback((nextRoom: StudioRoomId) => {
    if (nextRoom === room) return;
    try {
      window.history.pushState({ room: nextRoom }, '', ROOM_META[nextRoom].path);
    } catch {
      // Ignore history restriction if running in a sandboxed context.
    }
    applyRoom(nextRoom);
  }, [room, applyRoom]);

  useEffect(() => {
    document.title = ROOM_META[initialRoom].pageTitle;
    try {
      window.history.replaceState({ room: initialRoom }, '', window.location.pathname);
    } catch {
      // Ignore history restriction.
    }
  }, [initialRoom]);

  useEffect(() => {
    const onPopState = () => {
      const target = roomFromPath(window.location.pathname);
      if (target) applyRoom(target);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyRoom]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || menu.current?.open) return;
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === 'ArrowRight' && room === 'marketing') navigateToRoom('brand-films');
      else if (event.key === 'ArrowLeft' && room === 'brand-films') navigateToRoom('marketing');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [room, navigateToRoom]);

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

    import('./digitalScene')
      .then(({ mountDigitalScene }) => {
        if (cancelled) return undefined;
        return mountDigitalScene(sceneHost, controller.signal, initialRoom);
      })
      .then(mounted => {
        if (cancelled || !mounted) return;
        sceneController.current = mounted;
        setStatus('ready');
      })
      .catch(error => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      });

    return () => {
      cancelled = true;
      sceneController.current = null;
      controller.abort();
    };
  }, [initialRoom]);

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const targetRoom = roomFromPath(path);
    if (!targetRoom) return;
    event.preventDefault();
    if (menu.current?.open) menu.current.close();
    navigateToRoom(targetRoom);
  };

  const statusText = status === 'loading'
    ? 'Preparing the cinematic 360-degree studio environment.'
    : status === 'ready'
      ? `${activeMeta.pageTitle} studio environment ready.`
      : 'The cinematic studio environment could not load. A static studio view is shown.';

  return <main className={`digital-marketing-page digital-room--${room}`}>
    <div className="digital-environment" aria-hidden="true" />
    <div className="digital-atmosphere" aria-hidden="true" />

    <div
      ref={host}
      className={`digital-canvas-host digital-canvas-host--${status}`}
      data-scene-host=""
      role="img"
      aria-busy={status === 'loading'}
      aria-label={status === 'ready'
        ? activeMeta.ariaReady
        : 'Cinematic 360-degree studio environment for MYBI Digital.'}
    >
      <div className="digital-stage-fallback" aria-hidden="true" />
      <p className="digital-scene-notice" aria-hidden="true">Static studio view — 3D scene unavailable</p>
    </div>

    <header className="site-header">
      <a className="brand" href="/" aria-label="MYBI Digital home"><img className="brand-mark" src="/mybi-titanium.png" alt="" /></a>
      <nav className="desktop-nav" aria-label="Desktop navigation">
        {pages.slice(0, -1).map(page => (
          <a
            key={page.path}
            href={page.path}
            aria-current={currentPage === page ? 'page' : undefined}
            onClick={event => handleNavClick(event, page.path)}
          >
            {page.title}
          </a>
        ))}
      </nav>
      <button className="contact-button site-menu-toggle" aria-haspopup="dialog" onClick={() => menu.current?.showModal()}>
        <span>Menu</span>
        <span className="menu-lines" aria-hidden="true" />
      </button>
    </header>

    <h1 className="digital-sr-only">{currentPage?.title}</h1>

    <nav className="studio-room-controls" aria-label="360 studio room navigation">
      {room === 'marketing' ? (
        <button
          type="button"
          className="studio-room-switch studio-room-switch--right"
          onClick={() => navigateToRoom('brand-films')}
          aria-label="Turn right in the 360-degree studio to Shop & Brand Films"
        >
          <span className="studio-room-switch-meta">360° STUDIO · TURN RIGHT</span>
          <span className="studio-room-switch-title">
            <span>Shop &amp; Brand Films</span>
            <span className="studio-room-switch-arrow" aria-hidden="true">→</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="studio-room-switch studio-room-switch--left"
          onClick={() => navigateToRoom('marketing')}
          aria-label="Turn left in the 360-degree studio to Business Marketing"
        >
          <span className="studio-room-switch-meta">360° STUDIO · TURN LEFT</span>
          <span className="studio-room-switch-title">
            <span className="studio-room-switch-arrow" aria-hidden="true">←</span>
            <span>Business Marketing</span>
          </span>
        </button>
      )}
    </nav>

    <dialog ref={menu} className="chapter-dialog site-menu" aria-label="Site menu" onClick={event => { if (event.target === event.currentTarget) menu.current?.close(); }}>
      <button className="close-dialog" aria-label="Close menu" onClick={() => menu.current?.close()}>×</button>
      <nav aria-label="Main navigation">
        <a href="/">Home</a>
        {pages.map(page => (
          <a
            key={page.path}
            href={page.path}
            aria-current={currentPage === page ? 'page' : undefined}
            onClick={event => handleNavClick(event, page.path)}
          >
            {page.title}
          </a>
        ))}
      </nav>
    </dialog>

    <p className="digital-sr-only" role="status" aria-live="polite">{statusText}</p>
    {arriving && <div ref={arrival} className="lens-blackout lens-arrival" aria-hidden="true" />}
  </main>;
}
