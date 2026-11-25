// Independently adjustable composition parameters for the digital marketing scene.
// Values are in metres and radians unless stated otherwise.

export const digitalSceneConfig = {
  camera: {
    // The camera sits at chest height and looks slightly up so the figure reads
    // low in frame and the lit floor only occupies the bottom third.
    fov: 38,
    narrowFov: 44,
    position: [0, 1.0, 7.08] as const,
    narrowPosition: [0, 1.0, 6.0] as const,
    target: [0, 1.8, 0] as const,
    narrowTarget: [0, 1.8, 0] as const,
    near: 0.05,
    far: 60,
  },
  globe: {
    // Roughly 40% of the viewport height, centred behind the figure's head and
    // shoulders, with its lower edge settling into the floor glow.
    position: [0, 1.62, -3.2] as const,
    radius: 1.36,
    mask: '/assets/digital-marketing/globe/earth-land-mask-1024x512.png',
    // IcosahedronGeometry places the equirectangular prime meridian near -X.
    // +0.42π turns Africa and Europe toward the camera without a mirrored map.
    rotation: Math.PI * 0.42,
    rotationSpeed: 0.018,
    landParticles: 950,
  },
  rings: {
    // Kept close to the globe so the orbits read as a system rather than
    // stray arcs sweeping across the figure and floor.
    radiusMultipliers: [1.07, 1.18, 1.32],
    inclinations: [
      [1.22, 0.24, 0.1],
      [0.72, -0.38, -0.22],
      [1.5, 0.06, 0.34],
    ] as ReadonlyArray<readonly [number, number, number]>,
    speeds: [0.045, -0.032, 0.021],
  },
  character: {
    url: '/assets/digital-marketing/character/mybi-idle-character.glb',
    position: [0, 0, 0.45] as const,
    rotationY: Math.PI,
    scale: 1,
  },
  floor: {
    y: 0,
    size: 120,
    reflectorSize: 512,
  },
  lighting: {
    key: 1.45,
    rim: 4.0,
    burgundy: 16,
    accent: 7,
    fill: 0.16,
    environment: 0.24,
  },
  performance: {
    desktopDpr: 1.6,
    mobileDpr: 1.25,
  },
};
