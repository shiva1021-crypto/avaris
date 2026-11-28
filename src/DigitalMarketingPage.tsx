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

type RoomContent = {
  ariaLabel: string;
  heroKicker: string;
  heroLead: string;
  heroEmphasis: string;
  introLabel: string;
  intro: string;
  systemKicker: string;
  systemLead: string;
  systemEmphasis: string;
  capabilities: Array<{ title: string; description: string }>;
  closingKicker: string;
  closing: string;
  cta: string;
};

const ROOM_CONTENT: Record<StudioRoomId, RoomContent> = {
  marketing: {
    ariaLabel: 'Business Marketing services',
    heroKicker: 'BUSINESS MARKETING · BUILT TO PERFORM',
    heroLead: 'We turn attention into',
    heroEmphasis: 'measurable growth.',
    introLabel: 'STRATEGY, CREATIVE & MEDIA',
    intro: 'One connected growth system—from the first audience signal to the campaign, content and optimisation that move your business forward.',
    systemKicker: 'THE GROWTH SYSTEM',
    systemLead: 'Designed to make every move',
    systemEmphasis: 'work harder.',
    capabilities: [
      { title: 'Find the signal', description: 'Research, positioning and channel strategy reveal where demand is—and what will earn attention.' },
      { title: 'Shape the story', description: 'Campaign ideas, content systems and sharp creative turn your value into something people remember.' },
      { title: 'Scale what works', description: 'Paid media, measurement and continuous optimisation convert performance into repeatable growth.' },
    ],
    closingKicker: 'FROM FIRST SIGNAL TO LASTING IMPACT',
    closing: 'Build a brand people choose—and a system that keeps it moving.',
    cta: 'Start a project',
  },
  'brand-films': {
    ariaLabel: 'Shop and Brand Films services',
    heroKicker: 'SHOP & BRAND FILMS · MADE TO BE FELT',
    heroLead: 'Turn products and places into',
    heroEmphasis: 'stories people remember.',
    introLabel: 'PRODUCT, PLACE & PEOPLE',
    intro: 'Cinematic films that reveal the character of your shop, the value of your product and the feeling behind your brand.',
    systemKicker: 'THE FILM PROCESS',
    systemLead: 'Built to hold attention and',
    systemEmphasis: 'move people.',
    capabilities: [
      { title: 'Set the scene', description: 'A focused concept, visual language and shot plan give every film a clear purpose before production begins.' },
      { title: 'Reveal the value', description: 'Lighting, movement and detail-led cinematography make the product and experience feel tangible.' },
      { title: 'Cut for attention', description: 'Purpose-built edits for websites, launches and social channels keep the story sharp wherever it appears.' },
    ],
    closingKicker: 'FROM PRODUCT DETAIL TO BRAND DESIRE',
    closing: 'Make your brand impossible to scroll past.',
    cta: 'Create a brand film',
  },
  'weddings-events': {
    ariaLabel: 'Weddings and Events services',
    heroKicker: 'WEDDINGS & EVENTS · HELD IN MOTION',
    heroLead: 'We preserve the feeling,',
    heroEmphasis: 'not only the timeline.',
    introLabel: 'WEDDINGS, CELEBRATIONS & EVENTS',
    intro: 'Honest, cinematic coverage shaped around the people, atmosphere and small moments that make the day entirely yours.',
    systemKicker: 'THE STORY OF THE DAY',
    systemLead: 'Present when it matters,',
    systemEmphasis: 'invisible when it counts.',
    capabilities: [
      { title: 'Plan with care', description: 'We understand the schedule, people and moments that matter so the day can unfold naturally.' },
      { title: 'Capture the feeling', description: 'Thoughtful coverage records the energy, emotion and details without interrupting the experience.' },
      { title: 'Shape the memory', description: 'Highlight films and complete edits turn everything captured into a story you can return to.' },
    ],
    closingKicker: 'THE MOMENT PASSES · THE FEELING STAYS',
    closing: 'Let the day live beyond the day itself.',
    cta: 'Tell us about your event',
  },
  work: {
    ariaLabel: 'Selected MYBI Digital work',
    heroKicker: 'OUR WORK · PURPOSE IN EVERY FRAME',
    heroLead: 'Different stories, built with',
    heroEmphasis: 'one clear intention.',
    introLabel: 'STRATEGY, FILM & DIGITAL EXPERIENCES',
    intro: 'A growing selection of business campaigns, product stories and event films made to look distinctive and work in the real world.',
    systemKicker: 'HOW WE JUDGE THE WORK',
    systemLead: 'Strong craft is only the start.',
    systemEmphasis: 'It must connect.',
    capabilities: [
      { title: 'Clear idea', description: 'Every project begins with a reason to exist and a simple thought that can guide every creative decision.' },
      { title: 'Distinct execution', description: 'Direction, design and editing work together to give each story its own memorable visual identity.' },
      { title: 'Useful outcome', description: 'The finished work is shaped for the places it needs to perform—from screens and social feeds to live events.' },
    ],
    closingKicker: 'SELECTED WORK · MORE COMING SOON',
    closing: 'The next story in this room could be yours.',
    cta: 'Work with us',
  },
  about: {
    ariaLabel: 'About MYBI Digital',
    heroKicker: 'ABOUT MYBI DIGITAL · ONE CONNECTED STUDIO',
    heroLead: 'Strategy meets craft,',
    heroEmphasis: 'without the hand-offs.',
    introLabel: 'DIGITAL THINKING · CINEMATIC MAKING',
    intro: 'MYBI Digital brings websites, ongoing marketing and filmmaking together so every part of your presence feels like the same brand.',
    systemKicker: 'HOW WE WORK',
    systemLead: 'Close collaboration from',
    systemEmphasis: 'first thought to final frame.',
    capabilities: [
      { title: 'Think together', description: 'We begin by understanding the business, audience and ambition—not by forcing the project into a template.' },
      { title: 'Make with purpose', description: 'Every visual, word and interaction earns its place through a clear creative and commercial reason.' },
      { title: 'Stay involved', description: 'One connected team carries the idea through strategy, production, delivery and what comes next.' },
    ],
    closingKicker: 'SMALL TEAM · CONNECTED DISCIPLINES',
    closing: 'Bring us the ambition. We will help shape the way it moves.',
    cta: 'Meet the studio',
  },
};

function roomFromPath(pathname: string): StudioRoomId | null {
  const normalized = pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  return ROOM_ORDER.find(room => ROOM_META[room].path === normalized) ?? null;
}

export default function DigitalMarketingPage({ initialRoom = 'marketing', navigate }: {
  initialRoom?: StudioRoomId;
  navigate: (href: string) => void;
}) {
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
  const roomContent = ROOM_CONTENT[room];
  const roomIndex = ROOM_ORDER.indexOf(room);
  const previousRoom = ROOM_ORDER[(roomIndex - 1 + ROOM_ORDER.length) % ROOM_ORDER.length];
  const nextRoom = ROOM_ORDER[(roomIndex + 1) % ROOM_ORDER.length];
  const settledMeta = ROOM_META[settledRoom];
  const settledPage = pages.find(page => page.path === settledMeta.path);
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
    if (!content.current || !page.current) return;
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
    // Keep the lens blackout in place until the destination scene has mounted
    // and produced its first frame. This prevents a static fallback from being
    // exposed before the live globe begins updating.
    if (!arriving || !arrival.current || status === 'loading') return;
    try { sessionStorage.removeItem('avaris-lens-transition'); } catch { /* Storage may be unavailable. */ }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let fade: gsap.core.Tween | undefined;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!arrival.current) return;
        fade = gsap.to(arrival.current, {
          opacity: 0,
          duration: reduced ? 0 : 0.62,
          ease: 'power2.out',
          onComplete: () => setArriving(false),
        });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      fade?.kill();
    };
  }, [arriving, status]);

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
    event.preventDefault();
    if (menu.current?.open) menu.current.close();
    if (targetRoom) navigateToRoom(targetRoom);
    else navigate(path);
  };

  const statusText = status === 'loading'
    ? 'Preparing the cinematic 360-degree studio environment.'
    : status === 'ready'
      ? `${activeMeta.pageTitle} studio environment ready.`
      : 'The cinematic studio environment could not load. A static studio view is shown.';

  return <main ref={page} className={`digital-marketing-page digital-room--${room} digital-settled--${settledRoom} has-scroll-content ${turning ? `is-turning turn-${turnDirection}` : ''}`}>
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
        <p className="digital-scene-notice" aria-hidden="true">Static studio view — 3D scene unavailable</p>
      </div>
      <div className="digital-hero-transition" aria-hidden="true" />

    <header className="site-header">
      <a className="brand" href="/" aria-label="MYBI Digital home" onClick={event => handleNavClick(event, '/')}><img className="brand-mark" src="/mybi-titanium.png" alt="" /></a>
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

    <h1 className="digital-sr-only">{currentPage?.title}</h1>

      <div key={settledRoom} className="studio-room-name" aria-live="polite">
        <span>{settledPage?.title}</span>
        <i aria-hidden="true" />
      </div>

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

      <button className="digital-scroll-cue" type="button" aria-label={`Scroll to ${currentPage?.title ?? 'page'} content`} onClick={() => content.current?.scrollIntoView({ behavior: 'smooth' })}>
        <span>Explore</span>
        <i aria-hidden="true" />
      </button>
    </section>

    <section key={room} ref={content} className={`digital-content digital-content--${room}`} aria-label={roomContent.ariaLabel}>
      <div className="digital-scroll-glow" aria-hidden="true" />

      <section className="digital-manifesto">
        <p className="digital-content-kicker" data-scroll-reveal>{roomContent.heroKicker}</p>
        <h2 data-scroll-reveal>{roomContent.heroLead} <em>{roomContent.heroEmphasis}</em></h2>
        <div className="digital-content-rule" data-scroll-reveal />
        <div className="digital-content-intro">
          <p data-scroll-reveal>{roomContent.introLabel}</p>
          <p data-scroll-reveal>{roomContent.intro}</p>
        </div>
      </section>

      <section className="digital-capabilities">
        <header data-scroll-reveal>
          <p className="digital-content-kicker">{roomContent.systemKicker}</p>
          <h2>{roomContent.systemLead} <em>{roomContent.systemEmphasis}</em></h2>
        </header>
        <div className="digital-capability-list">
          {roomContent.capabilities.map((capability, index) => (
            <article key={capability.title} data-scroll-reveal>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="digital-closing">
        <p className="digital-content-kicker" data-scroll-reveal>{roomContent.closingKicker}</p>
        <h2 data-scroll-reveal>{roomContent.closing}</h2>
        <a href="/contact/" data-scroll-reveal onClick={event => handleNavClick(event, '/contact/')}>{roomContent.cta} <span aria-hidden="true">↗</span></a>
      </section>
    </section>

    <dialog id="digital-site-menu" ref={menu} className="chapter-dialog site-menu" aria-label="Site menu" onClick={event => { if (event.target === event.currentTarget) menu.current?.close(); }}>
      <button className="close-dialog" aria-label="Close menu" onClick={() => menu.current?.close()}>×</button>
      <nav aria-label="Main navigation">
        <a href="/" onClick={event => handleNavClick(event, '/')}>Home</a>
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
