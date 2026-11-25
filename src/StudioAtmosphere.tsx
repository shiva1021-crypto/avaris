import { useEffect, useRef, type SVGProps } from 'react';
import Smoke from './InteractiveSmoke';

const LEFT = [
  'M -30 628 C 205 637 326 742 550 765 C 655 778 740 780 850 781',
  'M -30 636 C 205 624 326 733 550 761 C 655 779 740 784 850 781',
  'M -30 628 C 205 637 326 742 550 765 C 655 778 740 780 850 781',
];
const RIGHT = [
  'M 770 680 C 1120 662 1440 565 1700 255',
  'M 770 686 C 1120 649 1440 583 1700 270',
  'M 770 680 C 1120 662 1440 565 1700 255',
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
  const right = fullBackdrop ? FULL_RIGHT : RIGHT;
  const rightStart = fullBackdrop ? -80 : 770;
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
        <linearGradient id="fabric-left" x1="0" y1="610" x2="0" y2="815" gradientUnits="userSpaceOnUse">
          <stop stopColor="#50152b" stopOpacity=".65" /><stop offset=".55" stopColor="#200d18" stopOpacity=".85" /><stop offset="1" stopColor="#090c11" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fabric-right" x1="1340" y1="380" x2="1390" y2="790" gradientUnits="userSpaceOnUse">
          <stop stopColor="#56142b" stopOpacity=".7" /><stop offset=".46" stopColor="#240d1a" stopOpacity=".83" /><stop offset="1" stopColor="#090c11" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="edge-right" x1="770" y1="680" x2="1672" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7e263e" stopOpacity="0" /><stop offset=".4" stopColor="#95304b" stopOpacity=".3" /><stop offset=".83" stopColor="#c34c6b" stopOpacity=".8" /><stop offset="1" stopColor="#71223a" stopOpacity=".65" />
        </linearGradient>
        <filter id="fabric-glow" x="-35%" y="-60%" width="170%" height="220%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id="fabric-edge" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation=".7" /></filter>
      </defs>
      <MovingPath frames={LEFT.map(d => d + ' L 850 814 L -30 814 Z')} duration="19s" reducedMotion={reducedMotion} fill="url(#fabric-left)" />
      <MovingPath frames={right.map(d => d + ` L 1700 810 L ${rightStart} 810 Z`)} duration="16s" reducedMotion={reducedMotion} fill="url(#fabric-right)" />
      <MovingPath frames={LEFT} duration="19s" reducedMotion={reducedMotion} fill="none" stroke="#9e294a" strokeWidth="24" opacity=".18" filter="url(#fabric-glow)" />
      <MovingPath frames={right} duration="16s" reducedMotion={reducedMotion} fill="none" stroke="url(#edge-right)" strokeWidth="52" opacity=".55" filter="url(#fabric-glow)" />
      <MovingPath frames={LEFT} duration="19s" reducedMotion={reducedMotion} fill="none" stroke="#a63653" strokeWidth="2" opacity=".65" filter="url(#fabric-edge)" />
      <MovingPath frames={right} duration="16s" reducedMotion={reducedMotion} fill="none" stroke="url(#edge-right)" strokeWidth="2" filter="url(#fabric-edge)" />
    </svg>
    <Smoke reducedMotion={reducedMotion} />
  </div>;
}
