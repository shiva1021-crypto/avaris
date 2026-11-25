import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { digitalSceneConfig } from './config';

export interface CharacterHandle {
  root: THREE.Group;
  clipName: string;
  duration: number;
  update(delta: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

function abortError() {
  return new DOMException('Digital marketing scene load aborted', 'AbortError');
}

export async function loadCharacter(signal: AbortSignal): Promise<CharacterHandle> {
  const { character, floor } = digitalSceneConfig;
  const response = await fetch(character.url, { signal });
  if (!response.ok) throw new Error('The character model could not be loaded.');

  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(await response.arrayBuffer(), '');
  if (signal.aborted) throw abortError();

  const clip = gltf.animations.find(item => item.name === 'Armature|mixamo.com|Layer0') ?? gltf.animations[0];
  if (!clip) throw new Error('The character animation clip is missing.');

  const model = gltf.scene;
  model.scale.setScalar(character.scale);
  model.rotation.y = character.rotationY;
  model.position.set(character.position[0], 0, character.position[2]);

  const root = new THREE.Group();
  root.add(model);
  root.updateMatrixWorld(true);

  // The source model has its feet close to y = 0; measure after the configured
  // scale/yaw so the final alignment stays correct if either value changes.
  const bounds = new THREE.Box3().setFromObject(model);
  root.position.set(0, floor.y - bounds.min.y, 0);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const shoeMaterials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  model.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const wasArray = Array.isArray(node.material);
    // Every garment shares the body atlas. Give the shoes their own material
    // instance so they can be darkened without flattening the whole figure.
    const boundMaterials = node.name.includes('Shoes')
      ? sourceMaterials.map(material => {
          const clone = material.clone();
          shoeMaterials.add(clone);
          return clone;
        })
      : sourceMaterials;
    node.material = wasArray ? boundMaterials : boundMaterials[0];
    // Alpha hair cards cast rectangular shadows, so only opaque clothing and
    // body meshes contribute to the key-light shadow map.
    node.castShadow = boundMaterials.every(material => !material.transparent);
    node.receiveShadow = false;
    for (const material of boundMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });

  // Tune each shared material once. The source GLB is authored at metalness 0.5
  // with a glossy metallic-roughness map, which reads as latex under studio
  // lighting. The reference figure is matte fabric with bright footwear
  // removed, caught almost entirely by rim light.
  for (const material of materials) {
    if (material instanceof THREE.MeshStandardMaterial) {
      material.metalness = 0;
      material.metalnessMap = null;
      material.roughness = Math.max(material.roughness, 0.72);
      material.roughnessMap = null;
      material.envMapIntensity = 0.18;
      material.color.multiplyScalar(0.3);
      // The source shoes are light grey inside the shared atlas; the reference
      // figure is dark from head to toe, so only this isolated layer is reduced
      // further.
      if (shoeMaterials.has(material)) material.color.multiplyScalar(0.35);
      material.needsUpdate = true;
    }
    if (material instanceof THREE.MeshPhysicalMaterial) {
      material.specularIntensity = 0.32;
      material.clearcoat = 0;
      material.sheen = 0;
    }
  }

  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip);
  action.reset().play();
  mixer.setTime(0);

  let disposed = false;
  let motionEnabled = true;

  return {
    root,
    clipName: clip.name,
    duration: clip.duration,
    update(delta) {
      if (disposed || !motionEnabled || delta <= 0) return;
      mixer.update(delta);
    },
    setMotionEnabled(enabled) {
      if (disposed) return;
      motionEnabled = enabled;
      if (!enabled) mixer.setTime(0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      action.stop();
      mixer.uncacheRoot(model);
      textures.forEach(texture => texture.dispose());
      materials.forEach(material => material.dispose());
      geometries.forEach(geometry => geometry.dispose());
    },
  };
}
