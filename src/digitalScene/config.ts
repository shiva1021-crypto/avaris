// Independently adjustable composition parameters for the 360-degree MYBI studio.
// Values are in metres and radians unless stated otherwise.

export type StudioRoomId = 'marketing' | 'brand-films' | 'weddings-events' | 'work' | 'about';

export const digitalSceneConfig = {
  // Five destinations are spaced evenly around one shared 360-degree studio.
  // At yaw = 0 the camera faces Business Marketing; each following room is
  // one 72-degree right turn around the central hub.
  hub: [0, 0, 7.08] as const,
  rooms: {
    marketing: {
      yaw: 0,
      cameraY: 1.22,
      targetY: 1.58,
      distance: 7.08,
      narrowPull: -0.65,
      fov: 42,
      narrowFov: 52,
    },
    'brand-films': {
      yaw: Math.PI * 0.4,
      cameraY: 1.12,
      targetY: 1.44,
      distance: 7.08,
      narrowPull: -0.45,
      fov: 39,
      narrowFov: 48,
    },
    'weddings-events': {
      yaw: Math.PI * 0.8,
      cameraY: 1.08,
      targetY: 1.42,
      distance: 7.08,
      narrowPull: 0.2,
      fov: 39,
      narrowFov: 46,
    },
    work: {
      yaw: Math.PI * 1.2,
      cameraY: 1.04,
      targetY: 1.38,
      distance: 7.08,
      narrowPull: 0.15,
      fov: 39,
      narrowFov: 46,
    },
    about: {
      yaw: Math.PI * 1.6,
      cameraY: 1.1,
      targetY: 1.48,
      distance: 7.08,
      narrowPull: 0.25,
      fov: 39,
      narrowFov: 46,
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
    position: [0, 1.62, -1.8] as const,
    radius: 1.36,
    mask: '/assets/digital-marketing/globe/earth-land-mask-1024x512.png',
    // IcosahedronGeometry places the equirectangular prime meridian near -X.
    // +0.42π turns Africa and Europe toward the camera without a mirrored map.
    rotation: Math.PI * 0.42,
    rotationSpeed: 0.018,
    landParticles: 3800,
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
    spotlight: {
      color: 0xe9edf0,
      position: [0, 6.1, -1.8] as const,
      target: [0, 1.62, -1.8] as const,
      intensity: 18,
      distance: 8,
      angle: 0.38,
      penumbra: 0.85,
      decay: 2,
      shaderIntensity: 1.35,
    },
  },
  performance: {
    desktopDpr: 1.6,
    mobileDpr: 1.25,
  },
};
