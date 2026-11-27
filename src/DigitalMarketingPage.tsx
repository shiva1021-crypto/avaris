import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { StudioRoomId } from './digitalScene/config';
import type { DigitalSceneController } from './digitalScene';
import { pages } from './pages';
import './digital-marketing.css';

gsap.registerPlugin(ScrollTrigger);

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
    ariaReady: 'An empty cinematic MYBI studio with a softly reflective floor, neutral silver lighting, atmospheric dust, and a softly fading illuminated presentation stage.',
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
  const page = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLElement>(null);
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
    page.current?.scrollTo({ top: 0, behavior: 'auto' });
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

  useLayoutEffect(() => {
    if (room !== 'marketing' || !content.current || !page.current) return;
    const scroller = page.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const context = gsap.context(() => {
      const revealItems = gsap.utils.toArray<HTMLElement>('[data-scroll-reveal]', content.current);
      if (reduced) {
        gsap.set(revealItems, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo('.digital-hero-fade',
        { opacity: 1, scale: 1, filter: 'blur(0px)' },
        {
          opacity: 0.28,
          scale: 1.045,
          filter: 'blur(5px)',
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            scroller,
            trigger: content.current,
            start: 'top bottom',
            end: 'top 18%',
            scrub: 1.15,
            invalidateOnRefresh: true,
          },
        },
      );

      gsap.fromTo('.digital-hero-transition',
        { opacity: 0.08, yPercent: 8 },
        {
          opacity: 1,
          yPercent: -4,
          ease: 'none',
          scrollTrigger: {
            scroller,
            trigger: content.current,
            start: 'top bottom',
            end: 'top 20%',
            scrub: 1.1,
            invalidateOnRefresh: true,
          },
        },
      );

      gsap.to('.digital-scroll-glow', {
        yPercent: -38,
        ease: 'none',
        scrollTrigger: {
          scroller,
          trigger: content.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.4,
        },
      });

      revealItems.forEach((item, index) => {
        gsap.fromTo(item,
          { opacity: 0, y: index % 2 ? 48 : 72 },
          {
            opacity: 1,
            y: 0,
            duration: 1.05,
            ease: 'power3.out',
            scrollTrigger: {
              scroller,
              trigger: item,
              start: 'top 84%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      });
    }, page);

    ScrollTrigger.refresh();
    return () => context.revert();
  }, [room, status]);

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

  return <main ref={page} className={`digital-marketing-page digital-room--${room} digital-settled--${settledRoom} ${room === 'marketing' ? 'has-scroll-content' : ''} ${turning ? `is-turning turn-${turnDirection}` : ''}`}>
    <section className="digital-hero" aria-label="Business Marketing interactive studio">
      <div className="digital-hero-fade digital-environment" aria-hidden="true" />
      <div className="digital-hero-fade digital-atmosphere" aria-hidden="true" />

      <div
        ref={host}
        className={`digital-hero-fade digital-canvas-host digital-canvas-host--${status}`}
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
      <div className="digital-hero-transition" aria-hidden="true" />

    {turning && <div className="studio-turn-vignette" aria-hidden="true"><span /><span /></div>}

    {isEmptyRoom && <section className={`empty-studio-room ${turning && room !== settledRoom ? 'is-turning-out' : ''}`}>
      <p>MYBI DIGITAL · CINEMATIC STUDIO</p>
      <h1>{settledPage?.title}</h1>
      <span>{settledPage?.description}</span>
    </section>}

    <header className="site-header">
      <a className="brand" href="/" aria-label="MYBI Digital home"><img className="brand-mark" src="/mybi-titanium.png" alt="" /></a>
      <button
        className="contact-button site-menu-toggle"
        aria-label="Open site menu"
        aria-controls="digital-site-menu"
        aria-haspopup="dialog"
        onClick={() => menu.current?.showModal()}
      >
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

      {room === 'marketing' && <button className="digital-scroll-cue" type="button" aria-label="Scroll to business marketing content" onClick={() => content.current?.scrollIntoView({ behavior: 'smooth' })}>
        <span>Explore</span>
        <i aria-hidden="true" />
      </button>}
    </section>

    {room === 'marketing' && <section ref={content} className="digital-content" aria-label="Business Marketing services">
      <div className="digital-scroll-glow" aria-hidden="true" />

      <section className="digital-manifesto">
        <p className="digital-content-kicker" data-scroll-reveal>BUSINESS MARKETING · BUILT TO PERFORM</p>
        <h2 data-scroll-reveal>We turn attention into <em>measurable growth.</em></h2>
        <div className="digital-content-rule" data-scroll-reveal />
        <div className="digital-content-intro">
          <p data-scroll-reveal>STRATEGY, CREATIVE &amp; MEDIA</p>
          <p data-scroll-reveal>One connected growth system—from the first audience signal to the campaign, content and optimisation that move your business forward.</p>
        </div>
      </section>

      <section className="digital-capabilities">
        <header data-scroll-reveal>
          <p className="digital-content-kicker">THE GROWTH SYSTEM</p>
          <h2>Designed to make every move <em>work harder.</em></h2>
        </header>
        <div className="digital-capability-list">
          <article data-scroll-reveal>
            <span>01</span>
            <h3>Find the signal</h3>
            <p>Research, positioning and channel strategy reveal where demand is—and what will earn attention.</p>
          </article>
          <article data-scroll-reveal>
            <span>02</span>
            <h3>Shape the story</h3>
            <p>Campaign ideas, content systems and sharp creative turn your value into something people remember.</p>
          </article>
          <article data-scroll-reveal>
            <span>03</span>
            <h3>Scale what works</h3>
            <p>Paid media, measurement and continuous optimisation convert performance into repeatable growth.</p>
          </article>
        </div>
      </section>

      <section className="digital-closing">
        <p className="digital-content-kicker" data-scroll-reveal>FROM FIRST SIGNAL TO LASTING IMPACT</p>
        <h2 data-scroll-reveal>Build a brand people choose—and a system that keeps it moving.</h2>
        <a href="/contact/" data-scroll-reveal>Start a project <span aria-hidden="true">↗</span></a>
      </section>
    </section>}

    <dialog id="digital-site-menu" ref={menu} className="chapter-dialog site-menu" aria-label="Site menu" onClick={event => { if (event.target === event.currentTarget) menu.current?.close(); }}>
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
