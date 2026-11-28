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

function createLightGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The brand films light glow could not be created.');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(245,248,255,.82)');
  gradient.addColorStop(0.28, 'rgba(220,230,240,.28)');
  gradient.addColorStop(1, 'rgba(220,230,240,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBackdropTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The brand films backdrop could not be created.');
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(1,2,4,.92)');
  gradient.addColorStop(0.48, 'rgba(2,3,5,.75)');
  gradient.addColorStop(0.78, 'rgba(3,4,6,.28)');
  gradient.addColorStop(1, 'rgba(3,4,6,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function loadBrandFilmsSet(
  signal: AbortSignal,
  mobile: boolean,
  _awaitAssets = false,
): Promise<BrandFilmsHandle> {
  if (signal.aborted) throw new DOMException('Brand films scene load aborted', 'AbortError');
  const config = digitalSceneConfig.brandFilms;
  const buffer = await loadCachedBinary(config.headphonesUrl);
  if (signal.aborted) throw new DOMException('Brand films scene load aborted', 'AbortError');

  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(buffer, '');
  if (signal.aborted) throw new DOMException('Brand films scene load aborted', 'AbortError');

  const root = new THREE.Group();
  root.name = 'BrandFilmsHeadphoneRoom';
  root.position.set(...config.position);
  root.rotation.y = config.rotationY;

  const floatingGroup = new THREE.Group();
  floatingGroup.name = 'FloatingHeadphones';
  root.add(floatingGroup);

  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const longestAxis = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.0001);
  model.scale.setScalar(config.headphonesHeight / longestAxis);
  model.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  const scaledCentre = scaledBounds.getCenter(new THREE.Vector3());
  model.position.sub(scaledCentre);
  floatingGroup.position.y = config.floatHeight;
  floatingGroup.add(model);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  model.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = true;
    geometries.add(node.geometry);
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const tuned = sourceMaterials.map(source => {
      const material = source.clone();
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      if (material instanceof THREE.MeshStandardMaterial) {
        const materialName = `${material.name} ${node.name}`.toLowerCase();
        const isSoftSurface = /leather|cushion|pad|foam|fabric/.test(materialName);
        const isMetalAccent = /metal|gold|bronze|copper|ring|trim|hinge/.test(materialName) || material.metalness > 0.45;
        material.envMapIntensity = isMetalAccent ? 1.55 : 1.08;
        material.roughness = isSoftSurface
          ? THREE.MathUtils.clamp(material.roughness, 0.48, 0.7)
          : THREE.MathUtils.clamp(material.roughness, 0.24, 0.52);
        if (isMetalAccent) material.metalness = Math.max(material.metalness, 0.72);
        material.color.multiplyScalar(isSoftSurface ? 1.08 : 1.16);
        material.needsUpdate = true;
      }
      return material;
    });
    node.material = Array.isArray(node.material) ? tuned : tuned[0];
  });

  // A feathered dark halo separates the product from the moving media wall
  // while remaining transparent at its edges.
  const backdropTexture = createBackdropTexture();
  textures.add(backdropTexture);
  const backdropMaterial = new THREE.SpriteMaterial({
    map: backdropTexture,
    color: 0x050608,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(backdropMaterial);
  const backdrop = new THREE.Sprite(backdropMaterial);
  backdrop.name = 'HeadphoneSeparationHalo';
  backdrop.position.set(0, config.floatHeight, -0.52);
  backdrop.scale.set(mobile ? 3.6 : 4.15, mobile ? 3.9 : 4.45, 1);
  backdrop.renderOrder = 0;
  root.add(backdrop);

  // Use the same restrained hanging diffuser as the business marketing room.
  const lightY = 3.5;
  const lamp = new THREE.Group();
  lamp.position.y = lightY;
  const cordMaterial = new THREE.MeshBasicMaterial({ color: 0x727a80, toneMapped: false });
  const shadeMaterial = new THREE.MeshBasicMaterial({
    color: 0x343a40,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const diffuserMaterial = new THREE.MeshBasicMaterial({ color: 0xdfe6eb, toneMapped: false });
  materials.add(cordMaterial);
  materials.add(shadeMaterial);
  materials.add(diffuserMaterial);
  const cordGeometry = new THREE.CylinderGeometry(0.018, 0.018, 2.2, 10);
  const shadeGeometry = new THREE.CylinderGeometry(0.15, 0.5, 0.44, 40, 1, true);
  const rimGeometry = new THREE.TorusGeometry(0.49, 0.018, 8, 48);
  const diffuserGeometry = new THREE.CircleGeometry(0.35, 40);
  geometries.add(cordGeometry);
  geometries.add(shadeGeometry);
  geometries.add(rimGeometry);
  geometries.add(diffuserGeometry);
  const cord = new THREE.Mesh(cordGeometry, cordMaterial);
  cord.position.y = 1.3;
  const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
  shade.position.y = 0.02;
  const shadeRim = new THREE.Mesh(rimGeometry, cordMaterial);
  shadeRim.rotation.x = Math.PI / 2;
  shadeRim.position.y = -0.2;
  const diffuser = new THREE.Mesh(diffuserGeometry, diffuserMaterial);
  diffuser.rotation.x = Math.PI / 2;
  diffuser.position.y = -0.2;
  const glowTexture = createLightGlowTexture();
  textures.add(glowTexture);
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xe9edf0,
    opacity: 0.4,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  materials.add(glowMaterial);
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.y = -0.26;
  glow.scale.set(0.8, 0.8, 1);
  glow.renderOrder = 2;
  const bulbLight = new THREE.PointLight(0xf1f3f4, 12, 10, 1.8);
  bulbLight.position.y = -0.28;
  lamp.add(cord, shade, shadeRim, diffuser, glow, bulbLight);
  lamp.scale.setScalar(0.72);
  root.add(lamp);

  const spotlight = new THREE.SpotLight(0xe9edf0, mobile ? 22 : 27, 11, 0.6, 1, 1.7);
  spotlight.position.set(0, lightY - 0.2, 0);
  spotlight.target.position.set(0, config.floatHeight - 0.12, 0);
  spotlight.castShadow = !mobile;
  if (!mobile) {
    spotlight.shadow.mapSize.set(1024, 1024);
    spotlight.shadow.bias = -0.0004;
    spotlight.shadow.normalBias = 0.025;
    spotlight.shadow.camera.near = 0.5;
    spotlight.shadow.camera.far = 9;
  }
  root.add(spotlight, spotlight.target);

  const warmRim = new THREE.PointLight(0xc56b45, mobile ? 8 : 13, 7, 1.8);
  warmRim.position.set(-1.7, 2.25, 0.9);
  const headphoneKey = new THREE.PointLight(0xe2edf7, mobile ? 21 : 34, 5.5, 1.8);
  headphoneKey.position.set(0, 2.4, 2.2);
  const ambientFill = new THREE.HemisphereLight(0xd0d9e2, 0x15191e, mobile ? 2.6 : 5.2);
  const coolFill = new THREE.DirectionalLight(0xa9bdcf, mobile ? 3.4 : 6.2);
  coolFill.position.set(2.2, 2.5, 2.8);
  coolFill.target.position.set(0, config.floatHeight, 0);
  const edgeRim = new THREE.PointLight(0xe9edf0, mobile ? 7 : 12, 6, 1.8);
  edgeRim.position.set(1.7, 2.7, -1.15);
  root.add(warmRim, headphoneKey, ambientFill, coolFill, coolFill.target, edgeRim);

  let disposed = false;
  let motionEnabled = true;

  return {
    root,
    update(delta) {
      if (disposed || !motionEnabled || delta <= 0) return;
      const time = performance.now() * 0.001;
      floatingGroup.position.y = config.floatHeight + Math.sin(time * 0.72) * 0.075;
      floatingGroup.rotation.y = Math.sin(time * 0.28) * 0.13;
      floatingGroup.rotation.z = Math.sin(time * 0.41) * 0.018;
    },
    setMotionEnabled(enabled) {
      motionEnabled = enabled;
      if (!enabled) {
        floatingGroup.position.y = config.floatHeight;
        floatingGroup.rotation.set(0, 0, 0);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      textures.forEach(texture => texture.dispose());
      materials.forEach(material => material.dispose());
      geometries.forEach(geometry => geometry.dispose());
      root.clear();
    },
  };
}
