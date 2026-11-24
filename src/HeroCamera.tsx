/** Foreground swap point: replace this cutout with the finished GLB scene later. */
export default function HeroCamera({ onReady, onError }: { onReady: () => void; onError: () => void }) {
  return <img
    className="camera-cutout"
    src="/assets/camera-reference-cutout.webp"
    width={1254}
    height={1254}
    alt="Professional cinema camera with a matte box, monitor and tripod, matching the Avaris reference"
    fetchPriority="high"
    decoding="async"
    draggable={false}
    onLoad={onReady}
    onError={onError}
  />;
}
