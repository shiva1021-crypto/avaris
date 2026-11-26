// Independently adjustable composition parameters for the 360-degree MYBI studio.
// Values are in metres and radians unless stated otherwise.

export type StudioRoomId = 'marketing' | 'brand-films';

export const digitalSceneConfig = {
  // The 360-degree camera pivot sits at (0, y, 7.08). At yaw = 0 it faces -Z
  // (Business Marketing); turning right by +90 deg (+PI/2) faces +X (Shop & Brand Films).
  hub: [0, 0, 7.08] as const,
  rooms: {
    marketing: {
      yaw: 0,
      cameraY: 1.0,
      targetY: 1.8,
      distance: 7.08,
      narrowPull: 1.08,
      fov: 38,
      narrowFov: 44,
    },
    'brand-films': {
      yaw: Math.PI / 2,
      cameraY: 1.12,
      targetY: 1.44,
      distance: 7.08,
      narrowPull: -0.45,
      fov: 39,
      narrowFov: 48,
    },
  },
  camera: {
    // Kept for backwards reference and clip bounds.
    fov: 38,
    narrowFov: 44,
    position: [0, 1.0, 7.08] as const,
    narrowPosition: [0, 1.0, 6.0] as const,
    target: [0, 1.8, 0] as const,
    narrowTarget: [0, 1.8, 0] as const,
    near: 0.05,
    far: 70,
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
  brandFilms: {
    // Placed 90 degrees to the right of Business Marketing around the 360 hub.
    position: [7.08, 0, 7.08] as const,
    rotationY: -Math.PI / 2,
    studioLightUrl: '/assets/digital-marketing/equipment/simple_studio_light.glb',
    screens: {
      left: '/assets/digital-marketing/brand-films/screen-portrait-silk.webp',
      upperRight: '/assets/digital-marketing/brand-films/screen-fragrance-macro.webp',
      lowerRight: '/assets/digital-marketing/brand-films/screen-coastal-drive.webp',
    },
  },
  floor: {
    y: 0,
    size: 140,
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
