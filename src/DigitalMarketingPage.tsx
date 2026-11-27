import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import gsap from 'gsap';
import type { StudioRoomId } from './digitalScene/config';
import type { DigitalSceneController } from './digitalScene';
import { pages } from './pages';
import './digital-marketing.css';

type SceneStatus = 'loading' | 'ready' | 'error';
type TurnDirection = 'left' | 'right';

const ROOM_ORDER: readonly StudioRoomId[] = [
  'marketing',
  'brand-films',
  'weddings-events',
  'work',
  'about',
];
const TURN_DURATION_MS = 1550;

const ROOM_META: Record<StudioRoomId, {
  path: string;
  pageTitle: string;
  ariaReady: string;
}> = {
  marketing: {
    path: '/services/',
    pageTitle: 'Business Marketing — MYBI Digital',
    ariaReady: 'An empty cinematic MYBI studio with a softly reflective floor, burgundy and slate architectural lighting, atmospheric dust, and an illuminated presentation stage.',
  },
  'brand-films': {
    path: '/brand-films/',
    pageTitle: 'Shop & Brand Films — MYBI Digital',
    ariaReady: 'A cinematic product studio with four floating campaign screens and a sculptural camera lens wrapped in burgundy and rose-gold metal above an illuminated stage.',
  },
  'weddings-events': {
    path: '/weddings-events/',
    pageTitle: 'Weddings & Events — MYBI Digital',
    ariaReady: 'An empty cinematic studio room with a reflective floor, soft smoke, burgundy accents, and focused event-film lighting.',
  },
  work: {
    path: '/work/',
    pageTitle: 'Our Work — MYBI Digital',
    ariaReady: 'An empty cinematic portfolio room with a reflective floor, atmospheric smoke, and restrained studio lighting.',
  },
  about: {
    path: '/about/',
    pageTitle: 'About — MYBI Digital',
    ariaReady: 'An empty cinematic studio room with a reflective floor, subtle particles, smoke, and warm burgundy lighting.',
  },
};

function roomFromPath(pathname: string): StudioRoomId | null {
  const normalized = pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  return ROOM_ORDER.find(room => ROOM_META[room].path === normalized) ?? null;
}

export default function DigitalMarketingPage({ initialRoom = 'marketing' }: { initialRoom?: StudioRoomId }) {
  const host = useRef<HTMLDivElement>(null);
  const arrival = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const sceneController = useRef<DigitalSceneController | null>(null);
  const activeRoom = useRef<StudioRoomId>(initialRoom);
  const turnTimer = useRef<number | undefined>(undefined);

  const [room, setRoom] = useState<StudioRoomId>(initialRoom);
  const [settledRoom, setSettledRoom] = useState<StudioRoomId>(initialRoom);
  const [turning, setTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<TurnDirection>('right');
  const [arriving, setArriving] = useState(() => {
    try { return sessionStorage.getItem('avaris-lens-transition') === '1'; }
    catch { return false; }
  });
  const [status, setStatus] = useState<SceneStatus>('loading');

  const activeMeta = ROOM_META[room];
  const currentPage = pages.find(page => page.path === activeMeta.path);
  const roomIndex = ROOM_ORDER.indexOf(room);
  const previousRoom = ROOM_ORDER[(roomIndex - 1 + ROOM_ORDER.length) % ROOM_ORDER.length];
  const nextRoom = ROOM_ORDER[(roomIndex + 1) % ROOM_ORDER.length];
  const settledMeta = ROOM_META[settledRoom];
  const settledPage = pages.find(page => page.path === settledMeta.path);
  const isEmptyRoom = settledRoom !== 'marketing' && settledRoom !== 'brand-films';

  const applyRoom = useCallback((nextRoom: StudioRoomId, immediate = false) => {
    const currentRoom = activeRoom.current;
    if (nextRoom === currentRoom && !immediate) return;
    if (turnTimer.current !== undefined) window.clearTimeout(turnTimer.current);
    document.title = ROOM_META[nextRoom].pageTitle;
    activeRoom.current = nextRoom;
    setRoom(nextRoom);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (immediate || reduced) {
      setSettledRoom(nextRoom);
      setTurning(false);
      sceneController.current?.setRoom(nextRoom, true);
      return;
    }

    const currentIndex = ROOM_ORDER.indexOf(currentRoom);
    const nextIndex = ROOM_ORDER.indexOf(nextRoom);
    const rightSteps = (nextIndex - currentIndex + ROOM_ORDER.length) % ROOM_ORDER.length;
    const leftSteps = (currentIndex - nextIndex + ROOM_ORDER.length) % ROOM_ORDER.length;
    setTurnDirection(rightSteps <= leftSteps ? 'right' : 'left');
    setTurning(true);
    sceneController.current?.setRoom(nextRoom);
    turnTimer.current = window.setTimeout(() => {
      setSettledRoom(nextRoom);
      setTurning(false);
      turnTimer.current = undefined;
    }, TURN_DURATION_MS);
  }, []);

  const navigateToRoom = useCallback((nextRoom: StudioRoomId) => {
    if (nextRoom === activeRoom.current) return;
    try {
      window.history.pushState({ room: nextRoom }, '', ROOM_META[nextRoom].path);
    } catch {
      // Ignore history restriction if running in a sandboxed context.
    }
    applyRoom(nextRoom);
  }, [applyRoom]);

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
      if (event.defaultPrevented || menu.current?.open || turning) return;
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      const index = ROOM_ORDER.indexOf(activeRoom.current);
      if (event.key === 'ArrowRight') navigateToRoom(ROOM_ORDER[(index + 1) % ROOM_ORDER.length]);
      else if (event.key === 'ArrowLeft') navigateToRoom(ROOM_ORDER[(index - 1 + ROOM_ORDER.length) % ROOM_ORDER.length]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [turning, navigateToRoom]);

  useEffect(() => () => {
    if (turnTimer.current !== undefined) window.clearTimeout(turnTimer.current);
  }, []);

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
        if (activeRoom.current !== initialRoom) mounted.setRoom(activeRoom.current, true);
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

  return <main className={`digital-marketing-page digital-room--${room} digital-settled--${settledRoom} ${turning ? `is-turning turn-${turnDirection}` : ''}`}>
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

    {turning && <div className="studio-turn-vignette" aria-hidden="true"><span /><span /></div>}

    {isEmptyRoom && <section className={`empty-studio-room ${turning && room !== settledRoom ? 'is-turning-out' : ''}`}>
      <p>MYBI DIGITAL · CINEMATIC STUDIO</p>
      <h1>{settledPage?.title}</h1>
      <span>{settledPage?.description}</span>
    </section>}

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

    {!isEmptyRoom && <h1 className="digital-sr-only">{currentPage?.title}</h1>}

    <nav className="studio-room-controls" aria-label="360 studio room navigation">
      <button
        type="button"
        className="studio-room-switch studio-room-switch--left"
        onClick={() => navigateToRoom(previousRoom)}
        aria-label={`Turn left in the 360-degree studio to ${ROOM_META[previousRoom].pageTitle.replace(' — MYBI Digital', '')}`}
        disabled={turning}
      >
        <span className="studio-room-switch-arrow" aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        className="studio-room-switch studio-room-switch--right"
        onClick={() => navigateToRoom(nextRoom)}
        aria-label={`Turn right in the 360-degree studio to ${ROOM_META[nextRoom].pageTitle.replace(' — MYBI Digital', '')}`}
        disabled={turning}
      >
        <span className="studio-room-switch-arrow" aria-hidden="true">→</span>
      </button>
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
