import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadCachedBinary } from './assetCache';
import { digitalSceneConfig } from './config';

export interface BrandFilmsHandle {
  root: THREE.Group;
  update(delta: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

interface FloatingScreen {
  group: THREE.Group;
  baseY: number;
  amp: number;
  speed: number;
  phase: number;
}

function abortError() {
  return new DOMException('Brand films scene load aborted', 'AbortError');
}

function createMarbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Marble texture context unavailable.');

  ctx.fillStyle = '#15171b';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle dark slate clouds
  for (let i = 0; i < 42; i += 1) {
    const x = ((i * 97) % 512);
    const y = ((i * 173) % 512);
    const r = 60 + ((i * 37) % 90);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, i % 2 === 0 ? 'rgba(42, 47, 56, 0.24)' : 'rgba(10, 11, 14, 0.34)');
    grad.addColorStop(1, 'rgba(20, 22, 26, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine alabaster & warm gold-rose marble veins
  ctx.lineCap = 'round';
  for (let v = 0; v < 18; v += 1) {
    ctx.beginPath();
    let x = (v * 53) % 512;
    let y = (v * 29) % 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 10; s += 1) {
      x += Math.sin(v * 1.7 + s * 0.9) * 44 + 26;
      y += Math.cos(v * 2.1 + s * 0.7) * 32 + 18;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = v % 3 === 0 ? 'rgba(218, 206, 200, 0.16)' : 'rgba(130, 142, 156, 0.14)';
    ctx.lineWidth = v % 4 === 0 ? 1.8 : 0.9;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createSoftboxGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Softbox grid texture unavailable.');

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 138);
  grad.addColorStop(0, '#fff2e2');
  grad.addColorStop(0.55, '#ffd7b0');
  grad.addColorStop(1, '#8c5a3c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(20, 14, 12, 0.52)';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 256; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPerfumeLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Perfume label context unavailable.');

  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(245, 240, 238, 0.94)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 58px "Host Grotesk", "DM Sans", sans-serif';
  ctx.fillText('M Y B I', 256, 232);

  ctx.fillStyle = 'rgba(232, 212, 216, 0.8)';
  ctx.font = '500 18px "DM Sans", sans-serif';
  ctx.fillText('F R A G R A N C E', 256, 286);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDirectorTextTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Director texture context unavailable.');

  ctx.fillStyle = '#121316';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.fillStyle = '#e5e4e2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 42px "DM Sans", sans-serif';
  ctx.fillText('D I R E C T O R', 256, 98);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRecMonitorTexture(recOn: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Monitor texture context unavailable.');
  drawRecMonitor(ctx, recOn);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, ctx };
}

function drawRecMonitor(ctx: CanvasRenderingContext2D, recOn: boolean) {
  const w = 512;
  const h = 300;
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, 280);
  bg.addColorStop(0, '#3a1420');
  bg.addColorStop(0.55, '#12141a');
  bg.addColorStop(1, '#07080b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Miniature stage & perfume silhouette on the camera monitor
  ctx.fillStyle = '#1e2026';
  ctx.beginPath();
  ctx.ellipse(w / 2, 232, 92, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(220, 110, 138, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w / 2, 244, 134, 22, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Bottle body on monitor
  const bottleGrad = ctx.createLinearGradient(w / 2 - 36, 115, w / 2 + 36, 218);
  bottleGrad.addColorStop(0, '#8f2543');
  bottleGrad.addColorStop(0.5, '#591025');
  bottleGrad.addColorStop(1, '#2d0814');
  ctx.fillStyle = bottleGrad;
  ctx.fillRect(w / 2 - 36, 128, 72, 88);
  ctx.strokeStyle = 'rgba(245, 225, 228, 0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w / 2 - 36, 128, 72, 88);

  // Cap
  ctx.fillStyle = '#9aa0aa';
  ctx.fillRect(w / 2 - 19, 98, 38, 28);

  // REC badge & timecode
  if (recOn) {
    ctx.fillStyle = '#e6334c';
    ctx.beginPath();
    ctx.arc(36, 30, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f2eff0';
  ctx.font = '700 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('REC', 52, 36);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(229, 228, 226, 0.85)';
  ctx.font = '500 16px monospace';
  ctx.fillText('00:00:12:06', w - 26, 36);

  // Viewfinder corner brackets
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  const m = 18;
  const l = 18;
  for (const [cx, cy, dx, dy] of [
    [m, m, 1, 1],
    [w - m, m, -1, 1],
    [m, h - m, 1, -1],
    [w - m, h - m, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * l);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * l, cy);
    ctx.stroke();
  }
}

function createStageGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Stage glow texture context unavailable.');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 232, 224, 0.88)');
  grad.addColorStop(0.28, 'rgba(180, 62, 92, 0.42)');
  grad.addColorStop(0.62, 'rgba(110, 22, 48, 0.16)');
  grad.addColorStop(1, 'rgba(120, 20, 45, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundedRectShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  shape.moveTo(-hw + radius, -hh);
  shape.lineTo(hw - radius, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + radius);
  shape.lineTo(hw, hh - radius);
  shape.quadraticCurveTo(hw, hh, hw - radius, hh);
  shape.lineTo(-hw + radius, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - radius);
  shape.lineTo(-hw, -hh + radius);
  shape.quadraticCurveTo(-hw, -hh, -hw + radius, -hh);
  return shape;
}

async function loadImageTexture(url: string, signal: AbortSignal): Promise<THREE.Texture> {
  const buffer = await loadCachedBinary(url);
  if (signal.aborted) throw abortError();
  const blob = new Blob([buffer], { type: 'image/webp' });
  const objUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = objUrl;
    await img.decode();
    if (signal.aborted) throw abortError();
    const texture = new THREE.Texture(img);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

const floorPoolVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const floorPoolFragmentShader = `
  uniform vec3 uWarmColor;
  uniform vec3 uBurgundyColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    float centerGlow = pow(smoothstep(1.0, 0.0, d), 2.9);
    float ringGlow = smoothstep(0.035, 0.0, abs(d - 0.36));
    float reflectionStreak = pow(smoothstep(0.6, 0.0, abs(p.x)), 2.2) * smoothstep(0.0, 0.75, p.y) * (1.0 - smoothstep(0.65, 1.0, p.y));
    vec3 col = uBurgundyColor * centerGlow * 0.85 + uWarmColor * (ringGlow * 0.75 + reflectionStreak * 0.42);
    float alpha = uOpacity * (centerGlow * 0.48 + ringGlow * 0.45 + reflectionStreak * 0.25);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
  }
`;

const spotlightConeVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 vp = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-vp.xyz);
    gl_Position = projectionMatrix * vp;
  }
`;

const spotlightConeFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    // vUv.y = 1 at top fixture, 0 at pedestal
    float vertical = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
    float facing = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.5);
    float dust = 0.88 + 0.12 * sin(vUv.y * 16.0 - uTime * 0.7 + vUv.x * 12.0);
    float alpha = uOpacity * vertical * facing * dust;
    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.55));
  }
`;

export async function loadBrandFilmsSet(
  signal: AbortSignal,
  mobile: boolean,
  awaitSoftbox = false,
): Promise<BrandFilmsHandle> {
  if (signal.aborted) throw abortError();
  const cfg = digitalSceneConfig.brandFilms;
  const root = new THREE.Group();
  root.position.set(...cfg.position);
  root.rotation.y = cfg.rotationY;

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const lights: THREE.Object3D[] = [];
  const screens: FloatingScreen[] = [];

  const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
    if (item instanceof THREE.BufferGeometry) geometries.add(item);
    else materials.add(item);
    return item;
  };

  // --- 1. Stage Floor Glow & Soft Back Halo ---
  const poolGeom = track(new THREE.PlaneGeometry(8.8, 7.6));
  const poolMat = track(new THREE.ShaderMaterial({
    name: 'BrandFilmsFloorPool',
    uniforms: {
      uWarmColor: { value: new THREE.Color(0xf2d1c4) },
      uBurgundyColor: { value: new THREE.Color(0x9b2946) },
      uOpacity: { value: mobile ? 0.56 : 0.62 },
    },
    vertexShader: floorPoolVertexShader,
    fragmentShader: floorPoolFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const pool = new THREE.Mesh(poolGeom, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.005, 0.35);
  pool.renderOrder = 3;
  root.add(pool);

  const haloTex = createStageGlowTexture();
  textures.add(haloTex);
  const haloMat = track(new THREE.SpriteMaterial({
    map: haloTex,
    color: 0x8f2440,
    transparent: true,
    opacity: mobile ? 0.42 : 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const halo = new THREE.Sprite(haloMat);
  halo.position.set(0, 1.55, -3.9);
  halo.scale.set(7.4, 3.8, 1);
  halo.layers.set(1);
  root.add(halo);

  // --- 2. Center Pedestal, Rim Light Ring & Sweeping Burgundy Ribbon ---
  const stageGroup = new THREE.Group();
  stageGroup.position.set(0, 0, 0.15);
  root.add(stageGroup);

  const outerBaseMat = track(new THREE.MeshStandardMaterial({
    color: 0x16181d,
    metalness: 0.72,
    roughness: 0.28,
  }));
  const baseDiscGeom = track(new THREE.CylinderGeometry(1.56, 1.62, 0.08, 72));
  const baseDisc = new THREE.Mesh(baseDiscGeom, outerBaseMat);
  baseDisc.position.y = 0.04;
  baseDisc.receiveShadow = true;
  stageGroup.add(baseDisc);

  const rimGlowMat = track(new THREE.MeshBasicMaterial({ color: 0xffd5c8 }));
  const rimRingGeom = track(new THREE.TorusGeometry(1.56, 0.013, 12, 96));
  const rimRing = new THREE.Mesh(rimRingGeom, rimGlowMat);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = 0.082;
  stageGroup.add(rimRing);

  const burgundyTrimMat = track(new THREE.MeshStandardMaterial({
    color: 0x8e213e,
    emissive: 0x450919,
    emissiveIntensity: 0.9,
    metalness: 0.65,
    roughness: 0.25,
  }));
  const outerTrimGeom = track(new THREE.TorusGeometry(1.62, 0.014, 12, 96));
  const outerTrim = new THREE.Mesh(outerTrimGeom, burgundyTrimMat);
  outerTrim.rotation.x = Math.PI / 2;
  outerTrim.position.y = 0.032;
  stageGroup.add(outerTrim);

  const marbleTex = createMarbleTexture();
  textures.add(marbleTex);
  const marbleMat = track(new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xc2c6ce,
    metalness: 0.16,
    roughness: 0.34,
  }));
  const marbleGeom = track(new THREE.CylinderGeometry(0.92, 0.96, 0.36, 64));
  const marblePedestal = new THREE.Mesh(marbleGeom, marbleMat);
  marblePedestal.position.y = 0.26;
  marblePedestal.castShadow = !mobile;
  marblePedestal.receiveShadow = true;
  stageGroup.add(marblePedestal);

  // Sweeping curved dark-burgundy sculptural ribbon hugging the right & rear of the pedestal
  const ribbonSegments = 56;
  const ribbonPositions: number[] = [];
  const ribbonIndices: number[] = [];
  for (let i = 0; i <= ribbonSegments; i += 1) {
    const t = i / ribbonSegments;
    const angle = THREE.MathUtils.lerp(-0.32, 2.25, t);
    const radius = 0.96 + Math.sin(t * Math.PI) * 0.14;
    const bottomY = 0.08 + Math.pow(t, 1.8) * 0.16;
    const ribbonHeight = 0.03 + Math.sin(Math.min(1, t * 1.08) * Math.PI * 0.62) * 0.62;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const flareOut = 0.12 * Math.sin(t * Math.PI * 0.85);
    ribbonPositions.push(
      x, bottomY, z,
      x * (1 + flareOut), bottomY + ribbonHeight, z * (1 + flareOut),
    );
    if (i < ribbonSegments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      ribbonIndices.push(a, c, b, b, c, d);
    }
  }
  const ribbonGeom = track(new THREE.BufferGeometry());
  ribbonGeom.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
  ribbonGeom.setIndex(ribbonIndices);
  ribbonGeom.computeVertexNormals();
  const ribbonMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x3b0716,
    emissive: 0x160208,
    emissiveIntensity: 0.7,
    metalness: 0.36,
    roughness: 0.24,
    clearcoat: 0.8,
    clearcoatRoughness: 0.16,
    sheen: 0.9,
    sheenColor: new THREE.Color(0xd94c70),
    side: THREE.DoubleSide,
  }));
  const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
  stageGroup.add(ribbonMesh);

  // --- 3. Hero Perfume Bottle ("MYBI FRAGRANCE") ---
  const bottleGroup = new THREE.Group();
  bottleGroup.position.set(0, 0.44, 0);
  stageGroup.add(bottleGroup);

  const glassShape = roundedRectShape(0.62, 0.28, 0.045);
  const glassGeom = track(new THREE.ExtrudeGeometry(glassShape, {
    depth: 0.62,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.022,
    bevelSegments: 4,
  }));
  glassGeom.rotateX(-Math.PI / 2);
  glassGeom.translate(0, 0.025, 0);
  const glassMat = track(new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    roughness: 0.04,
    metalness: 0.14,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 2.4,
  }));
  const glassMesh = new THREE.Mesh(glassGeom, glassMat);
  glassMesh.renderOrder = 5;
  bottleGroup.add(glassMesh);

  const liquidShape = roundedRectShape(0.51, 0.20, 0.032);
  const liquidGeom = track(new THREE.ExtrudeGeometry(liquidShape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
  }));
  liquidGeom.rotateX(-Math.PI / 2);
  liquidGeom.translate(0, 0.095, 0);
  const liquidMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x3f0516,
    emissive: 0x5c0a24,
    emissiveIntensity: 0.92,
    roughness: 0.1,
    metalness: 0.08,
    clearcoat: 0.9,
  }));
  const liquidMesh = new THREE.Mesh(liquidGeom, liquidMat);
  liquidMesh.renderOrder = 4;
  bottleGroup.add(liquidMesh);

  const labelTex = createPerfumeLabelTexture();
  textures.add(labelTex);
  const labelMat = track(new THREE.MeshBasicMaterial({
    map: labelTex,
    transparent: true,
    depthWrite: false,
  }));
  const labelGeom = track(new THREE.PlaneGeometry(0.46, 0.46));
  const labelMesh = new THREE.Mesh(labelGeom, labelMat);
  labelMesh.position.set(0, 0.34, 0.165);
  labelMesh.renderOrder = 6;
  bottleGroup.add(labelMesh);

  const capMetalMat = track(new THREE.MeshStandardMaterial({
    color: 0xd8cec8,
    metalness: 0.94,
    roughness: 0.16,
    envMapIntensity: 1.7,
  }));
  const collarGeom = track(new THREE.CylinderGeometry(0.095, 0.105, 0.075, 32));
  const collarMesh = new THREE.Mesh(collarGeom, capMetalMat);
  collarMesh.position.y = 0.695;
  bottleGroup.add(collarMesh);

  const capShape = roundedRectShape(0.28, 0.22, 0.022);
  const capGeom = track(new THREE.ExtrudeGeometry(capShape, {
    depth: 0.21,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 3,
  }));
  capGeom.rotateX(-Math.PI / 2);
  capGeom.translate(0, 0.74, 0);
  const capMesh = new THREE.Mesh(capGeom, capMetalMat);
  bottleGroup.add(capMesh);

  // --- 4. Overhead Studio Spotlight Fixture + Volumetric Cone (below headline) ---
  const pendantMat = track(new THREE.MeshStandardMaterial({
    color: 0x111317,
    metalness: 0.7,
    roughness: 0.35,
  }));
  const pendantGeom = track(new THREE.CylinderGeometry(0.17, 0.21, 0.18, 32));
  const pendant = new THREE.Mesh(pendantGeom, pendantMat);
  pendant.position.set(0, 2.28, 0);
  stageGroup.add(pendant);

  const bulbMat = track(new THREE.MeshBasicMaterial({ color: 0xfff0e4 }));
  const bulbGeom = track(new THREE.CircleGeometry(0.17, 32));
  const bulb = new THREE.Mesh(bulbGeom, bulbMat);
  bulb.rotation.x = Math.PI / 2;
  bulb.position.set(0, 2.188, 0);
  stageGroup.add(bulb);

  const coneGeom = track(new THREE.CylinderGeometry(0.17, 1.36, 1.8, 36, 1, true));
  const coneMat = track(new THREE.ShaderMaterial({
    name: 'OverheadBeamCone',
    uniforms: {
      uColor: { value: new THREE.Color(0xffe7da) },
      uOpacity: { value: mobile ? 0.24 : 0.3 },
      uTime: { value: 0 },
    },
    vertexShader: spotlightConeVertexShader,
    fragmentShader: spotlightConeFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const beamCone = new THREE.Mesh(coneGeom, coneMat);
  beamCone.position.set(0, 1.29, 0);
  beamCone.renderOrder = 7;
  stageGroup.add(beamCone);

  const overheadSpot = new THREE.SpotLight(0xffeadd, 28, 10, Math.PI / 4.4, 0.72, 1.5);
  overheadSpot.position.set(0, 2.18, 0);
  overheadSpot.target.position.set(0, 0.55, 0);
  stageGroup.add(overheadSpot, overheadSpot.target);
  lights.push(overheadSpot, overheadSpot.target);

  // --- 5. Left Foreground Cinema Camera on Tripod + Slider Rail + REC Monitor ---
  const camRig = new THREE.Group();
  camRig.position.set(-2.15, 0, 2.55);
  camRig.rotation.y = 0.62;
  root.add(camRig);

  const darkAlloyMat = track(new THREE.MeshStandardMaterial({
    color: 0x16191f,
    metalness: 0.78,
    roughness: 0.32,
  }));
  const brushedSteelMat = track(new THREE.MeshStandardMaterial({
    color: 0x7d8590,
    metalness: 0.88,
    roughness: 0.24,
  }));
  const crimsonRingMat = track(new THREE.MeshStandardMaterial({
    color: 0x9b2946,
    metalness: 0.55,
    roughness: 0.25,
  }));

  // Slider rails on floor
  const railGeom = track(new THREE.CylinderGeometry(0.016, 0.016, 1.75, 16));
  railGeom.rotateZ(Math.PI / 2);
  for (const rz of [-0.09, 0.09]) {
    const rail = new THREE.Mesh(railGeom, brushedSteelMat);
    rail.position.set(0, 0.09, rz);
    camRig.add(rail);
  }
  const railBlockGeom = track(new THREE.BoxGeometry(0.12, 0.09, 0.26));
  for (const rx of [-0.78, 0.78]) {
    const block = new THREE.Mesh(railBlockGeom, darkAlloyMat);
    block.position.set(rx, 0.045, 0);
    camRig.add(block);
  }

  // Tripod legs
  const legGeom = track(new THREE.CylinderGeometry(0.018, 0.014, 1.02, 12));
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const leg = new THREE.Mesh(legGeom, darkAlloyMat);
    leg.position.set(Math.cos(a) * 0.24, 0.52, Math.sin(a) * 0.24);
    leg.rotation.z = Math.cos(a) * 0.34;
    leg.rotation.x = -Math.sin(a) * 0.34;
    camRig.add(leg);
  }

  const camHead = new THREE.Group();
  camHead.position.set(0, 1.05, 0);
  camRig.add(camHead);

  const bodyGeom = track(new THREE.BoxGeometry(0.24, 0.22, 0.36));
  const camBody = new THREE.Mesh(bodyGeom, darkAlloyMat);
  camBody.position.set(0, 0.11, 0);
  camHead.add(camBody);

  const handleGeom = track(new THREE.BoxGeometry(0.05, 0.07, 0.26));
  const topHandle = new THREE.Mesh(handleGeom, darkAlloyMat);
  topHandle.position.set(0, 0.255, 0.02);
  camHead.add(topHandle);

  const lensGeom = track(new THREE.CylinderGeometry(0.075, 0.078, 0.24, 24));
  lensGeom.rotateX(Math.PI / 2);
  const lens = new THREE.Mesh(lensGeom, darkAlloyMat);
  lens.position.set(0, 0.11, -0.28);
  camHead.add(lens);

  const witnessGeom = track(new THREE.TorusGeometry(0.078, 0.008, 10, 32));
  const witness = new THREE.Mesh(witnessGeom, crimsonRingMat);
  witness.position.set(0, 0.11, -0.26);
  camHead.add(witness);

  const matteBoxGeom = track(new THREE.BoxGeometry(0.24, 0.18, 0.09));
  const matteBox = new THREE.Mesh(matteBoxGeom, darkAlloyMat);
  matteBox.position.set(0, 0.11, -0.43);
  camHead.add(matteBox);

  // Live REC monitor angled toward the viewer
  const monitorGroup = new THREE.Group();
  monitorGroup.position.set(-0.04, 0.35, 0.14);
  monitorGroup.rotation.set(-0.18, 0.16, 0);
  camHead.add(monitorGroup);

  const monShellGeom = track(new THREE.BoxGeometry(0.32, 0.19, 0.024));
  const monShell = new THREE.Mesh(monShellGeom, darkAlloyMat);
  monitorGroup.add(monShell);

  const { tex: recTex, ctx: recCtx } = createRecMonitorTexture(true);
  textures.add(recTex);
  const monScreenGeom = track(new THREE.PlaneGeometry(0.295, 0.168));
  const monScreenMat = track(new THREE.MeshBasicMaterial({ map: recTex }));
  const monScreen = new THREE.Mesh(monScreenGeom, monScreenMat);
  monScreen.position.z = 0.013;
  monitorGroup.add(monScreen);

  // --- 6. Right Studio Fresnel Light Stand + Left Softbox Light ---
  const fresnelGroup = new THREE.Group();
  fresnelGroup.position.set(2.92, 0, 1.35);
  fresnelGroup.rotation.y = -0.52;
  root.add(fresnelGroup);

  const mastGeom = track(new THREE.CylinderGeometry(0.02, 0.026, 2.02, 14));
  const mast = new THREE.Mesh(mastGeom, darkAlloyMat);
  mast.position.y = 1.01;
  fresnelGroup.add(mast);

  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2;
    const sLeg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.014, 0.014, 0.72, 10)), darkAlloyMat);
    sLeg.position.set(Math.cos(a) * 0.25, 0.22, Math.sin(a) * 0.25);
    sLeg.rotation.z = Math.cos(a) * 0.78;
    sLeg.rotation.x = -Math.sin(a) * 0.78;
    fresnelGroup.add(sLeg);
  }

  const lampHead = new THREE.Group();
  lampHead.position.set(0, 2.05, 0);
  lampHead.rotation.x = -0.25;
  lampHead.rotation.y = 0.22;
  fresnelGroup.add(lampHead);

  const lampHousing = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.16, 0.34, 20)), darkAlloyMat);
  lampHousing.rotation.x = Math.PI / 2;
  lampHead.add(lampHousing);

  const fresnelLensMat = track(new THREE.MeshBasicMaterial({ color: 0xffd299 }));
  const fresnelLens = new THREE.Mesh(track(new THREE.CircleGeometry(0.16, 24)), fresnelLensMat);
  fresnelLens.rotation.y = Math.PI;
  fresnelLens.position.z = -0.172;
  lampHead.add(fresnelLens);

  // Barn doors
  const barnDoorGeom = track(new THREE.BoxGeometry(0.28, 0.14, 0.012));
  for (const [bx, by, rz, rx] of [
    [0, 0.21, 0, -0.45],
    [0, -0.21, 0, 0.45],
    [0.21, 0, Math.PI / 2, -0.45],
    [-0.21, 0, Math.PI / 2, 0.45],
  ]) {
    const door = new THREE.Mesh(barnDoorGeom, darkAlloyMat);
    door.position.set(bx, by, -0.22);
    door.rotation.set(rx, 0, rz);
    lampHead.add(door);
  }

  const camFillLight = new THREE.PointLight(0xb8cad9, 6.5, 6, 2);
  camFillLight.position.set(-1.3, 1.65, 3.25);
  root.add(camFillLight);
  lights.push(camFillLight);

  const rightKeySpot = new THREE.SpotLight(0xffcda3, 18, 12, Math.PI / 3.6, 0.65, 1.4);
  rightKeySpot.position.set(2.8, 2.25, 1.1);
  rightKeySpot.target.position.set(0, 0.7, 0.15);
  root.add(rightKeySpot, rightKeySpot.target);
  lights.push(rightKeySpot, rightKeySpot.target);

  const leftSoftboxSpot = new THREE.SpotLight(0xffdfd0, 22, 12, Math.PI / 3.2, 0.72, 1.4);
  leftSoftboxSpot.position.set(-2.55, 2.35, 1.45);
  leftSoftboxSpot.target.position.set(0, 0.75, 0.15);
  root.add(leftSoftboxSpot, leftSoftboxSpot.target);
  lights.push(leftSoftboxSpot, leftSoftboxSpot.target);

  const burgundyRim = new THREE.PointLight(0x9b2946, 15, 10, 2);
  burgundyRim.position.set(1.6, 1.35, -1.8);
  root.add(burgundyRim);
  lights.push(burgundyRim);

  // --- 7. Director's Chair + Studio Flight Cases ---
  const chair = new THREE.Group();
  chair.position.set(2.22, 0, 2.15);
  chair.rotation.y = -0.68;
  root.add(chair);

  const canvasMat = track(new THREE.MeshStandardMaterial({
    color: 0x15161a,
    roughness: 0.85,
    metalness: 0.05,
  }));
  const woodMat = track(new THREE.MeshStandardMaterial({
    color: 0x1b1d22,
    roughness: 0.55,
    metalness: 0.25,
  }));
  const xLegGeom = track(new THREE.BoxGeometry(0.032, 0.66, 0.032));
  for (const sx of [-0.25, 0.25]) {
    for (const tilt of [-0.52, 0.52]) {
      const leg = new THREE.Mesh(xLegGeom, woodMat);
      leg.position.set(sx, 0.27, 0);
      leg.rotation.x = tilt;
      chair.add(leg);
    }
    const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.032, 0.62, 0.032)), woodMat);
    post.position.set(sx, 0.74, 0.22);
    chair.add(post);
    const arm = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.025, 0.48)), woodMat);
    arm.position.set(sx, 0.68, 0.02);
    chair.add(arm);
  }
  const seat = new THREE.Mesh(track(new THREE.BoxGeometry(0.48, 0.028, 0.42)), canvasMat);
  seat.position.set(0, 0.51, 0.02);
  chair.add(seat);

  const directorTex = createDirectorTextTexture();
  textures.add(directorTex);
  const backrestMat = track(new THREE.MeshStandardMaterial({
    map: directorTex,
    roughness: 0.85,
    metalness: 0.04,
  }));
  const backrest = new THREE.Mesh(track(new THREE.BoxGeometry(0.48, 0.19, 0.024)), backrestMat);
  backrest.position.set(0, 0.92, 0.22);
  chair.add(backrest);

  function addFlightCase(x: number, z: number, ry: number, w: number, h: number, d: number) {
    const fc = new THREE.Group();
    fc.position.set(x, 0, z);
    fc.rotation.y = ry;
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), canvasMat);
    body.position.y = h / 2;
    fc.add(body);
    const trim = new THREE.Mesh(track(new THREE.BoxGeometry(w + 0.018, 0.026, d + 0.018)), brushedSteelMat);
    trim.position.y = h * 0.72;
    fc.add(trim);
    const topTrim = new THREE.Mesh(track(new THREE.BoxGeometry(w + 0.018, 0.022, d + 0.018)), brushedSteelMat);
    topTrim.position.y = h;
    fc.add(topTrim);
    root.add(fc);
  }
  addFlightCase(-2.15, -1.75, 0.3, 0.62, 0.42, 0.44);
  addFlightCase(2.05, -1.35, -0.25, 0.58, 0.38, 0.42);

  // --- 8. Three Floating Frameless Cinema Screens + Optional Studio Light GLB ---
  const frameTrimMat = track(new THREE.MeshStandardMaterial({
    color: 0x8d96a3,
    metalness: 0.85,
    roughness: 0.22,
  }));

  const screenSpecs = [
    { url: cfg.screens.left, pos: [-1.85, 1.38, -1.25] as const, ry: 0.25, w: 2.04, h: 1.15, amp: 0.028, speed: 0.55, phase: 0.2 },
    { url: cfg.screens.upperRight, pos: [1.88, 1.88, -0.98] as const, ry: -0.26, w: 1.76, h: 0.99, amp: 0.025, speed: 0.62, phase: 1.8 },
    { url: cfg.screens.lowerRight, pos: [2.02, 0.72, -1.55] as const, ry: -0.2, w: 1.7, h: 0.96, amp: 0.022, speed: 0.48, phase: 3.1 },
  ];

  let disposed = false;
  let motionEnabled = true;
  let elapsed = 0;
  let lastRecState = true;

  const softboxGridTex = createSoftboxGridTexture();
  textures.add(softboxGridTex);

  const attachSoftbox = async (bufferPromise: Promise<ArrayBuffer | null>) => {
    const studioLightBuffer = await bufferPromise;
    if (!studioLightBuffer || signal.aborted || disposed) return;
    try {
      const gltf = await new GLTFLoader().parseAsync(studioLightBuffer, '');
      if (signal.aborted || disposed) return;
      const lightModel = gltf.scene;
      lightModel.scale.setScalar(1.04);
      lightModel.position.set(-2.78, 0, 1.65);
      lightModel.rotation.y = 0.88;
      lightModel.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(lightModel);
      lightModel.position.y -= box.min.y;
      lightModel.traverse(node => {
        if (node instanceof THREE.Mesh) {
          geometries.add(node.geometry);
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) {
            materials.add(m);
            if (m instanceof THREE.MeshStandardMaterial) {
              m.emissiveMap = softboxGridTex;
              m.emissive = new THREE.Color(0xffcfa2);
              m.emissiveIntensity = 0.85;
              m.needsUpdate = true;
            }
            for (const v of Object.values(m)) {
              if (v instanceof THREE.Texture) textures.add(v);
            }
          }
        }
      });
      root.add(lightModel);
    } catch {
      // Softbox GLB is optional; spot light still illuminates the set.
    }
  };

  const softboxPromise = loadCachedBinary(cfg.studioLightUrl).catch(() => null);
  const loadedTextures = await Promise.all(
    screenSpecs.map(spec => loadImageTexture(spec.url, signal)),
  );
  if (signal.aborted) {
    loadedTextures.forEach(t => t.dispose());
    throw abortError();
  }

  screenSpecs.forEach((spec, idx) => {
    const tex = loadedTextures[idx];
    textures.add(tex);
    const group = new THREE.Group();
    group.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    group.rotation.y = spec.ry;

    const screenMat = track(new THREE.MeshBasicMaterial({
      map: tex,
      toneMapped: false,
    }));
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(spec.w, spec.h)), screenMat);
    plane.position.z = 0.012;
    group.add(plane);

    const backing = new THREE.Mesh(track(new THREE.BoxGeometry(spec.w + 0.024, spec.h + 0.024, 0.018)), frameTrimMat);
    group.add(backing);

    root.add(group);
    screens.push({
      group,
      baseY: spec.pos[1],
      amp: spec.amp,
      speed: spec.speed,
      phase: spec.phase,
    });
  });

  if (awaitSoftbox) {
    await attachSoftbox(softboxPromise);
  } else {
    void attachSoftbox(softboxPromise);
  }

  return {
    root,
    update(delta) {
      if (disposed || !motionEnabled || delta <= 0) return;
      elapsed += delta;
      coneMat.uniforms.uTime.value = elapsed;

      for (const s of screens) {
        s.group.position.y = s.baseY + Math.sin(elapsed * s.speed + s.phase) * s.amp;
      }

      // Subtle REC dot blink every ~0.9s on camera monitor
      const recState = Math.sin(elapsed * 3.4) > -0.25;
      if (recState !== lastRecState) {
        lastRecState = recState;
        drawRecMonitor(recCtx, recState);
        recTex.needsUpdate = true;
      }
    },
    setMotionEnabled(enabled) {
      if (disposed) return;
      motionEnabled = enabled;
      if (!enabled) {
        for (const s of screens) s.group.position.y = s.baseY;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const l of lights) l.removeFromParent();
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
      root.clear();
    },
  };
}
