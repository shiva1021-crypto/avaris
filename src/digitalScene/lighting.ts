import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { digitalSceneConfig } from './config';

export interface LightingHandle {
  dispose(): void;
}

function reflectionPanel(
  room: THREE.Scene,
  position: THREE.Vector3,
  width: number,
  height: number,
  power: number,
  color: THREE.ColorRepresentation,
) {
  const geometry = new THREE.PlaneGeometry(width, height, 24, 16);
  const uv = geometry.getAttribute('uv');
  const tint = new THREE.Color(color);
  const colors: number[] = [];
  for (let index = 0; index < uv.count; index += 1) {
    const x = 2 * uv.getX(index) - 1;
    const y = 2 * uv.getY(index) - 1;
    const level = power * Math.max(0, 1 - x ** 4) * Math.max(0, 1 - y ** 2);
    colors.push(tint.r * level, tint.g * level, tint.b * level);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const panel = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
  panel.position.copy(position);
  panel.lookAt(0, 0, 0);
  room.add(panel);
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The atmospheric glow could not be created.');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.22, 'rgba(255, 225, 220, 0.5)');
  gradient.addColorStop(0.48, 'rgba(210, 90, 110, 0.2)');
  gradient.addColorStop(1, 'rgba(120, 20, 45, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer, mobile: boolean): LightingHandle {
  const { lighting } = digitalSceneConfig;
  const room = new RoomEnvironment();
  reflectionPanel(room, new THREE.Vector3(-3.4, 3.6, 2.2), 6, 2.8, 7, 0xb9cbdc);
  reflectionPanel(room, new THREE.Vector3(3.1, 2.2, -2.8), 3.6, 1.8, 4, 0x9b2946);
  reflectionPanel(room, new THREE.Vector3(-2.8, 1.1, -1.6), 2.6, 2, 2.5, 0xe5e4e2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.035);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = lighting.environment;

  // A soft burgundy bloom sits behind the globe. It is the only "atmosphere"
  // element in this phase and gives the scene its low, warm centre of gravity.
  const glowTexture = createGlowTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x8f2440,
    transparent: true,
    opacity: mobile ? 0.46 : 0.54,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.set(0, 1.75, -4.15);
  glow.scale.set(6.8, 3.4, 1);
  glow.renderOrder = 1;
  // Layer 1 is enabled on the main camera only so the broad halo stays behind
  // the scene and does not wash across the solid floor.
  glow.layers.set(1);
  scene.add(glow);

  const key = new THREE.DirectionalLight(0xbdd2e6, lighting.key);
  key.position.set(-3.2, 4.4, 2.6);
  key.target.position.set(0, 1.2, 0);
  key.castShadow = !mobile;
  if (key.castShadow) {
    Object.assign(key.shadow.camera, {
      left: -3.6, right: 3.6, top: 4.4, bottom: -2.6, near: 0.5, far: 14,
    });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.0006;
    key.shadow.bias = -0.00012;
  }

  // The alabaster rim does most of the figure reading: it grazes the shoulders,
  // head and the right side of the body without flattening the silhouette.
  const rim = new THREE.DirectionalLight(0xf0dfd9, lighting.rim);
  rim.position.set(2.4, 2.8, -3.6);
  rim.target.position.set(0, 1.35, 0);

  const burgundy = new THREE.PointLight(0x9b2946, lighting.burgundy, 12, 2);
  burgundy.position.set(2.4, 1.5, -2.4);

  const accent = new THREE.PointLight(0x7b1d36, lighting.accent, 9, 2);
  accent.position.set(-2.2, 0.7, -2.6);

  const fill = new THREE.HemisphereLight(0x2b3d49, 0x020304, lighting.fill);
  const lights = [key, key.target, rim, rim.target, burgundy, accent, fill];
  for (const light of lights) scene.add(light);

  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const light of lights) light.removeFromParent();
      key.shadow.dispose();
      glow.removeFromParent();
      glowMaterial.dispose();
      glowTexture.dispose();
      scene.environment = null;
      environment.dispose();
    },
  };
}
