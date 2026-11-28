import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadCachedBinary } from './assetCache';
import { digitalSceneConfig } from './config';

export interface WeddingsEventsHandle {
  root: THREE.Group;
  update(delta: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

export async function loadWeddingsEventsSet(
  signal: AbortSignal,
  mobile: boolean,
): Promise<WeddingsEventsHandle> {
  if (signal.aborted) throw new DOMException('Wedding scene load aborted', 'AbortError');
  const config = digitalSceneConfig.weddingsEvents;
  const buffer = await loadCachedBinary(config.modelUrl);
  if (signal.aborted) throw new DOMException('Wedding scene load aborted', 'AbortError');

  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(buffer, '');
  if (signal.aborted) throw new DOMException('Wedding scene load aborted', 'AbortError');

  const root = new THREE.Group();
  root.name = 'WeddingsEventsSculptureRoom';
  root.position.set(...config.position);
  root.rotation.y = config.rotationY;

  const floatingGroup = new THREE.Group();
  floatingGroup.name = 'FloatingWeddingSculpture';
  root.add(floatingGroup);

  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const longestAxis = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.0001);
  model.scale.setScalar(config.modelHeight / longestAxis);
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
    const solidMaterials = sourceMaterials.map(source => {
      const material = source.clone();
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }

      // Keep every original GLB colour and texture, while ensuring the moving
      // gallery cannot show through Blender materials exported as alpha blend.
      material.transparent = false;
      material.opacity = 1;
      material.depthTest = true;
      material.depthWrite = true;
      material.alphaTest = 0;
      material.blending = THREE.NormalBlending;
      material.side = THREE.FrontSide;

      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = 0;
        material.emissive.set(0x000000);
        material.emissiveIntensity = 0;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0;
          material.thickness = 0;
          material.clearcoat = 0;
          material.iridescence = 0;
          material.sheen = 0;
        }
        material.needsUpdate = true;
      }
      return material;
    });
    node.material = Array.isArray(node.material) ? solidMaterials : solidMaterials[0];
  });

  // These neutral lights travel with the isolated foreground model. They show
  // the porcelain and satin colours without receiving the room's bloom/grain.
  const keyLight = new THREE.PointLight(0xfff4ea, mobile ? 9 : 13, 7, 1.8);
  keyLight.position.set(-1.9, 2.8, 3);
  const fillLight = new THREE.HemisphereLight(0xffffff, 0x151515, mobile ? 0.75 : 1.15);
  const edgeLight = new THREE.DirectionalLight(0xdce7ef, mobile ? 1 : 1.55);
  edgeLight.position.set(2.2, 2.6, 2.4);
  edgeLight.target.position.set(0, config.floatHeight, 0);
  root.add(keyLight, fillLight, edgeLight, edgeLight.target);

  let disposed = false;
  let motionEnabled = true;
  let animationTime = 0;

  return {
    root,
    update(delta) {
      if (disposed || !motionEnabled || delta <= 0) return;
      animationTime += Math.min(delta, 0.05);
      floatingGroup.position.y = config.floatHeight + Math.sin(animationTime * 0.64) * 0.055;
      floatingGroup.rotation.y = animationTime * 0.12 + Math.sin(animationTime * 0.27) * 0.045;
      floatingGroup.rotation.x = Math.sin(animationTime * 0.31) * 0.008;
      floatingGroup.rotation.z = Math.sin(animationTime * 0.39) * 0.012;
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
