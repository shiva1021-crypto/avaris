import * as THREE from 'three';
import { digitalSceneConfig } from './config';

export interface AtmosphereHandle {
  root: THREE.Group;
  update(delta: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

interface SmokeWisp {
  sprite: THREE.Sprite;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseOpacity: number;
  phase: number;
  driftSpeed: number;
  ampX: number;
  ampY: number;
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

function createSmokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Smoke texture context unavailable.');

  ctx.clearRect(0, 0, 256, 256);
  const lobes = [
    [128, 128, 118, 0.32],
    [94, 116, 86, 0.24],
    [164, 122, 84, 0.22],
    [124, 158, 82, 0.18],
    [118, 92, 74, 0.2],
  ];
  for (const [cx, cy, r, alpha] of lobes) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(218, 224, 234, ${alpha})`);
    grad.addColorStop(0.42, `rgba(140, 152, 168, ${alpha * 0.45})`);
    grad.addColorStop(1, 'rgba(20, 24, 30, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createDustTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Dust texture context unavailable.');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 232, 226, 0.72)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const cycloramaVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const cycloramaFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    float angle = vUv.x * 6.2831853;
    // Subtle dark vertical drape folds around the 360 studio perimeter
    float folds = 0.5 + 0.5 * sin(angle * 22.0 + sin(angle * 7.0) * 0.6);
    float microFold = 0.5 + 0.5 * sin(angle * 54.0 + 1.3);
    float drape = folds * 0.65 + microFold * 0.35;

    // Gentle vertical fade into deep obsidian at ceiling and horizon
    float vertical = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 0.96, vUv.y));
    // Soft burgundy & slate studio wash around the room
    float roomWash = 0.5 + 0.5 * sin(angle * 2.0 - 0.7);
    vec3 slate = vec3(0.032, 0.042, 0.056);
    vec3 burgundy = vec3(0.068, 0.016, 0.032);
    vec3 col = mix(slate, burgundy, roomWash * 0.58) * (0.42 + 0.58 * drape);
    float alpha = vertical * (0.28 + 0.22 * drape);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createAtmosphere(mobile: boolean): AtmosphereHandle {
  const root = new THREE.Group();
  const [hubX, , hubZ] = digitalSceneConfig.hub;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  // 1. 360-degree studio cyclorama / pleated acoustic backdrop wall
  const cycGeom = new THREE.CylinderGeometry(23, 23, 14, 64, 1, true);
  const cycMat = new THREE.ShaderMaterial({
    name: 'Studio360Cyclorama',
    uniforms: { uTime: { value: 0 } },
    vertexShader: cycloramaVertexShader,
    fragmentShader: cycloramaFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const cycMesh = new THREE.Mesh(cycGeom, cycMat);
  cycMesh.position.set(hubX, 6.2, hubZ);
  cycMesh.renderOrder = -2;
  root.add(cycMesh);
  geometries.add(cycGeom);
  materials.add(cycMat);

  // 2. Soft 3D atmospheric smoke distributed across both quadrants + 45° transition corridor
  const smokeTexture = createSmokeTexture();
  textures.add(smokeTexture);
  const random = seededRandom(0x53545544);
  const wisps: SmokeWisp[] = [];
  const wispCount = mobile ? 14 : 26;

  for (let i = 0; i < wispCount; i += 1) {
    // Span from -28 deg (left of Business Marketing) through +118 deg (right of Brand Films)
    const theta = THREE.MathUtils.lerp(-0.45, Math.PI * 0.66, i / Math.max(1, wispCount - 1)) + (random() - 0.5) * 0.14;
    const dist = 6.2 + random() * 6.8;
    const bx = hubX + Math.sin(theta) * dist;
    const bz = hubZ - Math.cos(theta) * dist;
    const by = 0.65 + random() * 2.3;
    const tint = random() > 0.42 ? 0x6f8496 : 0x8f2c47;
    const baseOpacity = (mobile ? 0.065 : 0.085) + random() * 0.045;

    const mat = new THREE.SpriteMaterial({
      map: smokeTexture,
      color: tint,
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(mat);
    const scale = 3.8 + random() * 3.6;
    sprite.scale.set(scale * 1.45, scale * 0.85, 1);
    sprite.position.set(bx, by, bz);
    sprite.renderOrder = 1;
    root.add(sprite);
    materials.add(mat);

    wisps.push({
      sprite,
      baseX: bx,
      baseY: by,
      baseZ: bz,
      baseOpacity,
      phase: random() * Math.PI * 2,
      driftSpeed: 0.12 + random() * 0.14,
      ampX: 0.25 + random() * 0.35,
      ampY: 0.08 + random() * 0.14,
    });
  }

  // 3. Ambient floating dust motes catching light throughout the 360 studio
  const dustCount = mobile ? 95 : 220;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i += 1) {
    const theta = THREE.MathUtils.lerp(-0.55, Math.PI * 0.75, random());
    const dist = 2.4 + random() * 9.5;
    dustPositions[i * 3] = hubX + Math.sin(theta) * dist;
    dustPositions[i * 3 + 1] = 0.25 + random() * 3.8;
    dustPositions[i * 3 + 2] = hubZ - Math.cos(theta) * dist;
    dustPhases[i] = random() * Math.PI * 2;
  }
  const dustBase = new Float32Array(dustPositions);
  const dustGeom = new THREE.BufferGeometry();
  dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustTexture = createDustTexture();
  textures.add(dustTexture);
  const dustMat = new THREE.PointsMaterial({
    color: 0xf1d9d3,
    map: dustTexture,
    size: 0.024,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeom, dustMat);
  dustPoints.renderOrder = 6;
  root.add(dustPoints);
  geometries.add(dustGeom);
  materials.add(dustMat);

  let disposed = false;
  let motionEnabled = true;
  let elapsed = 0;

  return {
    root,
    update(delta) {
      if (disposed || !motionEnabled || delta <= 0) return;
      elapsed += delta;
      cycMat.uniforms.uTime.value = elapsed;

      for (const wisp of wisps) {
        const t = elapsed * wisp.driftSpeed + wisp.phase;
        wisp.sprite.position.x = wisp.baseX + Math.sin(t) * wisp.ampX;
        wisp.sprite.position.y = wisp.baseY + Math.cos(t * 0.8) * wisp.ampY;
        wisp.sprite.material.opacity = wisp.baseOpacity * (0.8 + 0.2 * Math.sin(t * 0.65));
      }

      const posAttr = dustGeom.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < dustCount; i += 1) {
        const p = dustPhases[i];
        arr[i * 3] = dustBase[i * 3] + Math.sin(elapsed * 0.28 + p) * 0.08;
        arr[i * 3 + 1] = dustBase[i * 3 + 1] + Math.cos(elapsed * 0.34 + p * 1.3) * 0.06;
        arr[i * 3 + 2] = dustBase[i * 3 + 2] + Math.sin(elapsed * 0.24 + p * 0.7) * 0.08;
      }
      posAttr.needsUpdate = true;
    },
    setMotionEnabled(enabled) {
      if (disposed) return;
      motionEnabled = enabled;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
      root.clear();
    },
  };
}

