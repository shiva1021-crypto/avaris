import * as THREE from 'three';
import { loadCachedBinary } from './assetCache';
import { digitalSceneConfig } from './config';
import {
  globeFragmentShader,
  globeVertexShader,
  ringFragmentShader,
  ringVertexShader,
} from './shaders';

export interface GlobeHandle {
  root: THREE.Group;
  landParticleCount: number;
  ringCount: number;
  update(delta: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

interface Ring {
  pivot: THREE.Group;
  material: THREE.ShaderMaterial;
  speed: number;
  time: number;
}

function abortError() {
  return new DOMException('Digital marketing scene load aborted', 'AbortError');
}

async function loadLandMask(signal: AbortSignal) {
  const { mask } = digitalSceneConfig.globe;
  const buffer = await loadCachedBinary(mask);
  if (signal.aborted) throw abortError();

  const blob = new Blob([buffer], { type: 'image/png' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (signal.aborted) throw abortError();

    // flipY remains true: the top row of the equirectangular image maps to
    // uv.y = 1, which is the north pole in PolyhedronGeometry's UV layout.
    const texture = new THREE.Texture(image);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return { image, texture };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readMask(image: HTMLImageElement) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The Earth land mask could not be read.');
  context.drawImage(image, 0, 0);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createParticleSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A particle sprite could not be created.');
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLandParticles(mask: ReturnType<typeof readMask>, radius: number, requested: number) {
  const random = seededRandom(0x4d594249);
  const positions = new Float32Array(requested * 3);
  let accepted = 0;
  let attempts = 0;

  while (accepted < requested && attempts < requested * 80) {
    attempts += 1;
    const u = random();
    const y = random() * 2 - 1;
    const theta = Math.acos(y);
    const azimuth = (u - 0.5) * Math.PI * 2;
    const sinTheta = Math.sin(theta);
    const x = -Math.cos(azimuth) * sinTheta;
    const z = Math.sin(azimuth) * sinTheta;

    const pixelX = Math.min(mask.width - 1, Math.max(0, Math.floor(u * mask.width)));
    const pixelY = Math.min(mask.height - 1, Math.max(0, Math.floor(theta / Math.PI * mask.height)));
    const land = mask.data[(pixelY * mask.width + pixelX) * 4];
    if (land < 128) continue;

    const surface = radius * 1.006;
    positions[accepted * 3] = x * surface;
    positions[accepted * 3 + 1] = y * surface;
    positions[accepted * 3 + 2] = z * surface;
    accepted += 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(0, accepted * 3), 3));
  return { geometry, count: accepted };
}

export async function loadGlobe(
  signal: AbortSignal,
  options: { includeSurface?: boolean; includeRings?: boolean } = {},
): Promise<GlobeHandle> {
  const { globe: globeConfig, rings: ringConfig } = digitalSceneConfig;
  const { image, texture: maskTexture } = await loadLandMask(signal);
  if (signal.aborted) {
    maskTexture.dispose();
    throw abortError();
  }

  const mask = readMask(image);
  const root = new THREE.Group();
  root.position.set(...globeConfig.position);
  root.rotation.y = globeConfig.rotation;

  const geometry = new THREE.IcosahedronGeometry(globeConfig.radius, 5);

  // This invisible shell writes depth for the near hemisphere only. It keeps
  // back-side particles and rings behind the globe while the visible surface
  // stays transparent and order-stable.
  const shellMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
  const depthShell = new THREE.Mesh(geometry, shellMaterial);
  depthShell.scale.setScalar(0.999);
  depthShell.renderOrder = 0;
  root.add(depthShell);

  const globeMaterial = new THREE.ShaderMaterial({
    name: 'HolographicEarth',
    uniforms: {
      uLandMask: { value: maskTexture },
      uLandColor: { value: new THREE.Color(0xf7adc1) },
      uOceanColor: { value: new THREE.Color(0x230910) },
      uGridColor: { value: new THREE.Color(0xd65376) },
      uFresnelColor: { value: new THREE.Color(0xffc2d1) },
      uRimColor: { value: new THREE.Color(0xf06b8d) },
      uLightDirection: { value: new THREE.Vector3(-0.35, 0.55, 0.75).normalize() },
      uRimDirection: { value: new THREE.Vector3(0.7, 0.1, 0.65).normalize() },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: globeVertexShader,
    fragmentShader: globeFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  const surface = new THREE.Mesh(geometry, globeMaterial);
  surface.renderOrder = 2;

  const { geometry: particleGeometry, count: landParticleCount } = createLandParticles(
    mask,
    globeConfig.radius,
    globeConfig.landParticles,
  );
  const particleSprite = createParticleSprite();
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xff9bb4,
    map: particleSprite,
    size: 0.026,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    alphaTest: 0.02,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.renderOrder = 3;

  const rotatingSurface = new THREE.Group();
  if (options.includeSurface !== false) rotatingSurface.add(surface);
  rotatingSurface.add(particles);
  root.add(rotatingSurface);

  const ringColors = [0xe0708a, 0x9b2946, 0xb84a63];
  const ringOpacities = [0.78, 0.44, 0.58];
  const rings = options.includeRings === false ? [] : ringConfig.radiusMultipliers.map((multiplier, index) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(...ringConfig.inclinations[index]);
    const ringGeometry = new THREE.TorusGeometry(
      globeConfig.radius * multiplier,
      0.008 + index * 0.001,
      3,
      180,
    );
    const material = new THREE.ShaderMaterial({
      name: `OrbitalRing${index + 1}`,
      uniforms: {
        uColor: { value: new THREE.Color(ringColors[index]) },
        uOpacity: { value: ringOpacities[index] },
        uPhase: { value: index * 2.1 },
        uTime: { value: 0 },
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(ringGeometry, material);
    mesh.renderOrder = 4;
    pivot.add(mesh);
    root.add(pivot);
    return { pivot, material, speed: ringConfig.speeds[index], time: 0 } satisfies Ring;
  });

  let disposed = false;
  let motionEnabled = true;
  let elapsed = 0;

  return {
    root,
    landParticleCount,
    ringCount: rings.length,
    update(delta) {
      if (disposed || !motionEnabled || delta <= 0) return;
      elapsed += delta;
      globeMaterial.uniforms.uTime.value = elapsed;
      rotatingSurface.rotation.y += globeConfig.rotationSpeed * delta;
      for (const ring of rings) {
        ring.time += delta;
        ring.material.uniforms.uTime.value = ring.time;
        ring.pivot.rotation.y += ring.speed * delta;
      }
    },
    setMotionEnabled(enabled) {
      if (disposed) return;
      motionEnabled = enabled;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      maskTexture.dispose();
      particleSprite.dispose();
      const geometries = new Set<THREE.BufferGeometry>([geometry, particleGeometry]);
      const materials = new Set<THREE.Material>([shellMaterial, globeMaterial, particleMaterial]);
      for (const ring of rings) {
        geometries.add((ring.pivot.children[0] as THREE.Mesh).geometry);
        materials.add(ring.material);
      }
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      root.clear();
    },
  };
}
