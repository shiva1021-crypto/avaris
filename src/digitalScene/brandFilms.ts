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

      // The product must be a fully solid object. Ignore any transparency or
      // blending flags stored in the source GLB so the moving wall can never
      // bleed through the headphone surfaces.
      material.transparent = false;
      material.opacity = 1;
      material.depthTest = true;
      material.depthWrite = true;
      material.alphaTest = 0;
      material.blending = THREE.NormalBlending;
      material.side = THREE.FrontSide;

      if (material instanceof THREE.MeshStandardMaterial) {
        // Keep the GLB's original base colour, texture, metalness and
        // roughness. Only external room reflections are disabled.
        material.envMapIntensity = 0;
        material.emissive.set(0x000000);
        material.emissiveIntensity = 0;

        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0;
          material.thickness = 0;
          material.clearcoat = 0;
          material.clearcoatRoughness = 1;
          material.iridescence = 0;
          material.sheen = 0;
        }
        material.needsUpdate = true;
      }
      return material;
    });
    node.material = Array.isArray(node.material) ? tuned : tuned[0];
  });

  // Neutral illumination only: no coloured rims or environment reflections.
  // This reveals the GLB's original base colours without adding an effect.
  const headphoneKey = new THREE.PointLight(0xffffff, mobile ? 8 : 12, 6.5, 1.8);
  headphoneKey.position.set(-1.8, 2.65, 2.8);
  const neutralFill = new THREE.HemisphereLight(0xffffff, 0x151515, mobile ? 0.7 : 1.1);
  const frontFill = new THREE.DirectionalLight(0xffffff, mobile ? 1 : 1.5);
  frontFill.position.set(1.8, 2.2, 3.4);
  frontFill.target.position.set(0, config.floatHeight, 0);
  root.add(headphoneKey, neutralFill, frontFill, frontFill.target);

  let disposed = false;
  let motionEnabled = true;
  let animationTime = 0;

  return {
    root,
    update(delta) {
      if (disposed || !motionEnabled || delta <= 0) return;
      animationTime += Math.min(delta, 0.05);
      floatingGroup.position.y = config.floatHeight + Math.sin(animationTime * 0.72) * 0.085;
      floatingGroup.rotation.y = animationTime * 0.12 + Math.sin(animationTime * 0.31) * 0.08;
      floatingGroup.rotation.x = Math.sin(animationTime * 0.38) * 0.016;
      floatingGroup.rotation.z = Math.sin(animationTime * 0.46) * 0.022;
    },
    setMotionEnabled(enabled) {
      motionEnabled = enabled;
      if (!enabled) {
        animationTime = 0;
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
