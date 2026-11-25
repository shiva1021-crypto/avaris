import { useEffect, useRef, type SVGProps } from 'react';
import Smoke from './InteractiveSmoke';

const HOME_CURTAIN = [
  'M -30 628 C 250 632 455 805 825 770 C 1195 735 1490 520 1700 255',
  'M -30 636 C 250 612 475 802 830 772 C 1185 742 1490 540 1700 270',
  'M -30 628 C 250 632 455 805 825 770 C 1195 735 1490 520 1700 255',
];
const FULL_RIGHT = [
  'M -80 798 C 650 790 1330 730 1700 255',
  'M -80 801 C 660 782 1330 742 1700 270',
  'M -80 798 C 650 790 1330 730 1700 255',
];

function MovingPath({ frames, duration, reducedMotion, ...props }: {
  frames: string[]; duration: string; reducedMotion: boolean;
} & SVGProps<SVGPathElement>) {
  return <path d={frames[0]} {...props}>
    {!reducedMotion && <animate attributeName="d" values={frames.join(';')} dur={duration} repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" />}
  </path>;
}

export default function StudioAtmosphere({ reducedMotion, fullBackdrop = false }: { reducedMotion: boolean; fullBackdrop?: boolean }) {
  const curtain = fullBackdrop ? FULL_RIGHT : HOME_CURTAIN;
  const curtainStart = fullBackdrop ? -80 : -30;
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let suspended = false;
    const visibility = () => {
      if (document.hidden || reducedMotion || suspended) svg.current?.pauseAnimations();
      else svg.current?.unpauseAnimations();
    };
    visibility(); document.addEventListener('visibilitychange', visibility);
    const transition = (event: Event) => {
      suspended = (event as CustomEvent<boolean>).detail;
      visibility();
    };
    window.addEventListener('avaris-transition', transition);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('avaris-transition', transition);
    };
  }, [reducedMotion]);
  return <div className="studio-atmosphere" aria-hidden="true">
    <svg ref={svg} className="studio-curtains" viewBox="0 0 1672 941" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fabric-right" x1="1340" y1="380" x2="1390" y2="790" gradientUnits="userSpaceOnUse">
          <stop stopColor="#56142b" stopOpacity=".7" /><stop offset=".46" stopColor="#240d1a" stopOpacity=".83" /><stop offset="1" stopColor="#090c11" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="edge-right" x1="-30" y1="628" x2="1672" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#993855" stopOpacity={fullBackdrop ? 0 : .68} /><stop offset=".4" stopColor="#95304b" stopOpacity=".3" /><stop offset=".83" stopColor="#c34c6b" stopOpacity=".8" /><stop offset="1" stopColor="#71223a" stopOpacity=".65" />
        </linearGradient>
        <filter id="fabric-glow" x="-35%" y="-60%" width="170%" height="220%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id="fabric-edge" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation=".7" /></filter>
      </defs>
      <MovingPath frames={curtain.map(d => d + ` L 1700 810 L ${curtainStart} 810 Z`)} duration="16s" reducedMotion={reducedMotion} fill="url(#fabric-right)" />
      <MovingPath frames={curtain} duration="16s" reducedMotion={reducedMotion} fill="none" stroke="url(#edge-right)" strokeWidth="52" opacity=".55" filter="url(#fabric-glow)" />
      <MovingPath frames={curtain} duration="16s" reducedMotion={reducedMotion} fill="none" stroke="url(#edge-right)" strokeWidth="2" filter="url(#fabric-edge)" />
    </svg>
    <Smoke reducedMotion={reducedMotion} />
  </div>;
}
