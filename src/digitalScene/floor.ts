import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { digitalSceneConfig } from './config';
import {
  contactShadowFragmentShader,
  contactShadowVertexShader,
  floorBaseFragmentShader,
  floorGlowFragmentShader,
  floorGlowVertexShader,
  floorOverlayFragmentShader,
  floorOverlayVertexShader,
  floorSheenFragmentShader,
  reflectorShader,
} from './shaders';

export interface FloorHandle {
  root: THREE.Group;
  hasPlanarReflection: boolean;
  dispose(): void;
}

function horizontalPlane(geometry: THREE.BufferGeometry, y: number) {
  const mesh = new THREE.Mesh(geometry);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

export function createFloor(mobile: boolean): FloorHandle {
  const { floor, character } = digitalSceneConfig;
  const root = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  let reflector: Reflector | undefined;

  const baseGeometry = new THREE.PlaneGeometry(floor.size, floor.size);
  // The base is unlit and fades out with distance so the floor dissolves into
  // the backdrop instead of ending on a hard horizon line. All visible sheen
  // comes from the reflection and localized glow layers.
  const baseMaterial = new THREE.ShaderMaterial({
    name: 'StudioFloorBase',
    uniforms: { uColor: { value: new THREE.Color(0x050608) } },
    vertexShader: floorOverlayVertexShader,
    fragmentShader: floorBaseFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const base = horizontalPlane(baseGeometry, floor.y - 0.012);
  base.material = baseMaterial;
  base.receiveShadow = false;
  base.renderOrder = -1;
  root.add(base);
  geometries.add(baseGeometry);
  materials.add(baseMaterial);

  if (!mobile) {
    // A compact plane keeps the 512px reflection target concentrated on the
    // figure and stage; a large plane wasted most of its pixels on black.
    const reflectorGeometry = new THREE.PlaneGeometry(26, 26);
    reflector = new Reflector(reflectorGeometry, {
      color: 0xc0b2b4,
      textureWidth: floor.reflectorSize,
      textureHeight: floor.reflectorSize,
      clipBias: 0.003,
      multisample: 0,
      shader: reflectorShader,
    });
    reflector.position.set(0, floor.y, character.position[2] - 0.15);
    reflector.rotation.x = -Math.PI / 2;
    reflector.renderOrder = 1;
    const reflectorMaterial = reflector.material as THREE.ShaderMaterial;
    reflectorMaterial.transparent = true;
    reflectorMaterial.depthWrite = false;
    root.add(reflector);
    geometries.add(reflectorGeometry);
    materials.add(reflectorMaterial);
  }

  const sheenGeometry = new THREE.PlaneGeometry(16, 10);
  const sheenMaterial = new THREE.ShaderMaterial({
    name: 'StudioFloorSheen',
    uniforms: {
      uColor: { value: new THREE.Color(0x536878) },
      uOpacity: { value: mobile ? 0.34 : 0.3 },
    },
    vertexShader: floorGlowVertexShader,
    fragmentShader: floorSheenFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sheen = horizontalPlane(sheenGeometry, floor.y + 0.003);
  sheen.position.z = character.position[2] - 0.6;
  sheen.material = sheenMaterial;
  sheen.renderOrder = 3;
  root.add(sheen);
  geometries.add(sheenGeometry);
  materials.add(sheenMaterial);

  // A second, warmer pool under the globe suggests its reflection without
  // turning the whole floor into a grey slab.
  const hazeGeometry = new THREE.PlaneGeometry(14, 7);
  const hazeMaterial = new THREE.ShaderMaterial({
    name: 'GlobeFloorReflection',
    uniforms: {
      uColor: { value: new THREE.Color(0x8a1f3b) },
      uOpacity: { value: mobile ? 0.18 : 0.14 },
    },
    vertexShader: floorGlowVertexShader,
    fragmentShader: floorSheenFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haze = horizontalPlane(hazeGeometry, floor.y + 0.0025);
  haze.position.z = -2.4;
  haze.material = hazeMaterial;
  haze.renderOrder = 3;
  root.add(haze);
  geometries.add(hazeGeometry);
  materials.add(hazeMaterial);

  const glowGeometry = new THREE.PlaneGeometry(8.4, 5.6);
  const glowMaterial = new THREE.ShaderMaterial({
    name: 'StudioFloorGlow',
    uniforms: {
      uColor: { value: new THREE.Color(0x8a1f3b) },
      uRingColor: { value: new THREE.Color(0xffe0dc) },
      uOpacity: { value: mobile ? 0.42 : 0.38 },
    },
    vertexShader: floorGlowVertexShader,
    fragmentShader: floorGlowFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = horizontalPlane(glowGeometry, floor.y + 0.004);
  glow.position.z = character.position[2] - 0.1;
  glow.material = glowMaterial;
  // The emissive stage rings read over the contact shadow; the shadow only
  // handles the figure's immediate grounding.
  glow.renderOrder = 5;
  root.add(glow);
  geometries.add(glowGeometry);
  materials.add(glowMaterial);

  const overlayGeometry = new THREE.PlaneGeometry(floor.size, floor.size);
  const overlayMaterial = new THREE.ShaderMaterial({
    name: 'StudioFloorFade',
    uniforms: {
      uColor: { value: new THREE.Color(0x030405) },
      uOpacity: { value: mobile ? 0.72 : 0.58 },
    },
    vertexShader: floorOverlayVertexShader,
    fragmentShader: floorOverlayFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const overlay = horizontalPlane(overlayGeometry, floor.y + 0.002);
  overlay.material = overlayMaterial;
  overlay.renderOrder = 2;
  root.add(overlay);
  geometries.add(overlayGeometry);
  materials.add(overlayMaterial);

  const contactGeometry = new THREE.PlaneGeometry(1.55, 1.05);
  const contactMaterial = new THREE.ShaderMaterial({
    name: 'CharacterContactShadow',
    vertexShader: contactShadowVertexShader,
    fragmentShader: contactShadowFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const contactShadow = horizontalPlane(contactGeometry, floor.y + 0.006);
  contactShadow.position.x = character.position[0];
  contactShadow.position.z = character.position[2] + 0.02;
  contactShadow.material = contactMaterial;
  contactShadow.renderOrder = 4;
  root.add(contactShadow);
  geometries.add(contactGeometry);
  materials.add(contactMaterial);

  let disposed = false;
  return {
    root,
    hasPlanarReflection: Boolean(reflector),
    dispose() {
      if (disposed) return;
      disposed = true;
      reflector?.dispose();
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      root.clear();
    },
  };
}
