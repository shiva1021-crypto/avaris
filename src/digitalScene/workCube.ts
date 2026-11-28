import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { digitalSceneConfig } from './config';

export interface WorkCubeHandle {
  root: THREE.Group;
  update(delta: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

export function createWorkCube(mobile: boolean): WorkCubeHandle {
  const config = digitalSceneConfig.workCube;
  const root = new THREE.Group();
  root.name = 'OurWorkPortfolioCubeRoom';
  root.position.set(...config.position);
  root.rotation.y = config.rotationY;

  const presentation = new THREE.Group();
  presentation.name = 'PortfolioCubePresentation';
  presentation.position.y = config.floatHeight;
  presentation.rotation.set(config.rotationX, config.rotationYLocal, config.rotationZ);
  root.add(presentation);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let disposed = false;
  let motionEnabled = true;

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x17191c,
    metalness: 0.4,
    roughness: 0.38,
    envMapIntensity: 0.6,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x9a9da0,
    metalness: 0.78,
    roughness: 0.3,
    envMapIntensity: 0.8,
  });
  materials.add(coreMaterial);
  materials.add(edgeMaterial);

  const size = config.size;
  const half = size / 2;
  const edgeThickness = config.edgeThickness;
  const edgeOffset = half + edgeThickness * 0.08;

  const coreGeometry = new RoundedBoxGeometry(size, size, size, 6, config.coreRadius);
  geometries.add(coreGeometry);
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.name = 'GraphiteCubeCore';
  core.castShadow = true;
  core.receiveShadow = true;
  presentation.add(core);

  const makeEdge = (
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const geometry = new RoundedBoxGeometry(width, height, depth, 4, edgeThickness * 0.42);
    geometries.add(geometry);
    const edge = new THREE.Mesh(geometry, edgeMaterial);
    edge.name = name;
    edge.position.set(x, y, z);
    edge.castShadow = true;
    edge.receiveShadow = true;
    presentation.add(edge);
  };

  // Four horizontal edges on the X axis.
  for (const y of [-edgeOffset, edgeOffset]) {
    for (const z of [-edgeOffset, edgeOffset]) {
      makeEdge('MetalFrameEdgeX', size + edgeThickness, edgeThickness, edgeThickness, 0, y, z);
    }
  }

  // Four vertical edges on the Y axis.
  for (const x of [-edgeOffset, edgeOffset]) {
    for (const z of [-edgeOffset, edgeOffset]) {
      makeEdge('MetalFrameEdgeY', edgeThickness, size + edgeThickness, edgeThickness, x, 0, z);
    }
  }

  // Phase B: six independent photographic panels sit above the graphite core.
  // They are deliberately separate meshes so later phases can focus, animate,
  // or replace one project face without rebuilding the cube.
  const panelGeometry = new THREE.PlaneGeometry(
    size - edgeThickness * 2.7,
    size - edgeThickness * 2.7,
  );
  geometries.add(panelGeometry);

  const panelOffset = half + edgeThickness * 0.16;
  const panelFaces = [
    {
      name: 'FashionCampaignPanel',
      url: '/assets/digital-marketing/work/beauty-editorial.jpg',
      position: [0, 0, panelOffset] as const,
      rotation: [0, 0, 0] as const,
    },
    {
      name: 'AutomotiveFilmPanel',
      url: '/assets/digital-marketing/work/automotive-film.jpg',
      position: [panelOffset, 0, 0] as const,
      rotation: [0, Math.PI / 2, 0] as const,
    },
    {
      name: 'ProductFilmPanel',
      url: '/assets/digital-marketing/work/product-film.jpg',
      position: [0, -panelOffset, 0] as const,
      rotation: [Math.PI / 2, 0, 0] as const,
    },
    {
      name: 'WeddingFilmPanel',
      url: '/assets/digital-marketing/work/wedding-film.jpg',
      position: [-panelOffset, 0, 0] as const,
      rotation: [0, -Math.PI / 2, 0] as const,
    },
    {
      name: 'CommercialCampaignPanel',
      url: '/assets/digital-marketing/work/commercial-campaign.jpg',
      position: [0, panelOffset, 0] as const,
      rotation: [-Math.PI / 2, 0, 0] as const,
    },
    {
      name: 'BrandIdentityPanel',
      url: '/assets/digital-marketing/work/brand-identity.png',
      position: [0, 0, -panelOffset] as const,
      rotation: [0, Math.PI, 0] as const,
    },
  ];

  const textureLoader = new THREE.TextureLoader();
  panelFaces.forEach(face => {
    const material = new THREE.MeshBasicMaterial({
      color: 0x17191c,
      toneMapped: false,
    });
    materials.add(material);

    const panel = new THREE.Mesh(panelGeometry, material);
    panel.name = face.name;
    panel.position.set(face.position[0], face.position[1], face.position[2]);
    panel.rotation.set(face.rotation[0], face.rotation[1], face.rotation[2]);
    panel.renderOrder = 1;
    presentation.add(panel);

    textureLoader.load(
      face.url,
      texture => {
        if (disposed) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 8;
        textures.add(texture);
        material.map = texture;
        material.color.setHex(0xffffff);
        material.needsUpdate = true;
      },
      undefined,
      () => {
        // The graphite placeholder remains visible if an individual image fails.
      },
    );
  });

  // Four depth edges on the Z axis.
  for (const x of [-edgeOffset, edgeOffset]) {
    for (const y of [-edgeOffset, edgeOffset]) {
      makeEdge('MetalFrameEdgeZ', edgeThickness, edgeThickness, size + edgeThickness, x, y, 0);
    }
  }

  const keyLight = new THREE.PointLight(0xffffff, mobile ? 7 : 10, 8, 1.8);
  keyLight.position.set(-2.6, 3.4, 3.2);
  const fillLight = new THREE.HemisphereLight(0xe7edf2, 0x111317, mobile ? 0.8 : 1.2);
  const rimLight = new THREE.PointLight(0xd8e2ea, mobile ? 6 : 8, 7, 1.8);
  rimLight.position.set(2.8, 2.4, -2.4);
  root.add(keyLight, fillLight, rimLight);

  return {
    root,
    update(delta) {
      if (motionEnabled && delta > 0) {
        presentation.rotation.y += Math.min(delta, 0.05) * 0.12;
      }
    },
    setMotionEnabled(enabled) {
      motionEnabled = enabled;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      textures.forEach(texture => texture.dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      root.clear();
    },
  };
}
