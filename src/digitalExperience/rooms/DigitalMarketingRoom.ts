import * as THREE from 'three';
import { ReflectiveFloorMaterial } from '../materials/ReflectiveFloorMaterial';

export interface DigitalMarketingRoomHandle {
  root: THREE.Group;
  floor: THREE.Mesh;
  floorMaterial: ReflectiveFloorMaterial;
  reflectionExclusions: THREE.Object3D[];
  update(delta: number, elapsed: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

const screenVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const screenFragmentShader = `
  uniform vec3 uAccent;
  uniform sampler2D uTexture;
  uniform float uTextureReady;
  uniform float uFocusBlur;
  uniform float uEdgeFade;
  uniform float uIntensity;
  uniform float uPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float edge = 1.0 - smoothstep(0.82, 1.0, max(abs(p.x), abs(p.y)));
    float waveA = exp(-abs(p.y - sin((p.x + uPhase) * 2.2) * 0.28 - 0.08) * 6.5);
    float waveB = exp(-abs(p.y + cos((p.x - uPhase) * 2.8) * 0.19 + 0.22) * 11.0);
    float sideGlow = smoothstep(1.1, -0.65, p.x) * 0.42 + smoothstep(-1.1, 0.7, p.x) * 0.16;
    float grain = hash(floor(gl_FragCoord.xy * 0.55) + uPhase) * 0.018;
    float softField = 0.13 + waveA * 0.38 + waveB * 0.19 + sideGlow * 0.12;
    vec2 blurStep = vec2(uFocusBlur, uFocusBlur * 0.55);
    vec3 media = texture2D(uTexture, vUv).rgb * 0.4;
    media += texture2D(uTexture, vUv + vec2(blurStep.x, 0.0)).rgb * 0.15;
    media += texture2D(uTexture, vUv - vec2(blurStep.x, 0.0)).rgb * 0.15;
    media += texture2D(uTexture, vUv + vec2(0.0, blurStep.y)).rgb * 0.15;
    media += texture2D(uTexture, vUv - vec2(0.0, blurStep.y)).rgb * 0.15;
    float mediaLuma = dot(media, vec3(0.299, 0.587, 0.114));
    media = mix(media, media * uAccent * 1.12, 0.16);
    vec3 glass = vec3(0.018, 0.025, 0.038) + uAccent * softField;
    glass = mix(glass, media * (0.92 + mediaLuma * 0.18), uTextureReady * 0.97);
    glass += grain;
    float alpha = mix(0.9, 1.0, edge) * uIntensity * uEdgeFade;
    gl_FragColor = vec4(glass, alpha);
  }
`;

function createRadialTexture(inner: string, middle: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Studio atmosphere texture could not be created.');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.38, middle);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

export function createDigitalMarketingRoom(mobile: boolean): DigitalMarketingRoomHandle {
  const root = new THREE.Group();
  root.name = 'DigitalMarketingEmptyStudio';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const screenMaterials: THREE.ShaderMaterial[] = [];
  const screenRings: THREE.Group[] = [];
  const screenTracks: Array<{
    group: THREE.Group;
    material: THREE.ShaderMaterial;
    baseAngle: number;
    radius: number;
    y: number;
    min: number;
    max: number;
    speed: number;
    phase: number;
  }> = [];
  const reflectionExclusions: THREE.Object3D[] = [];
  const screenUrls = [
    '/assets/digital-marketing/screens/screen-01-camera-side.webp',
    '/assets/digital-marketing/screens/screen-02-camera-three-quarter.webp',
    '/assets/digital-marketing/screens/screen-03-studio-background.webp',
    '/assets/digital-marketing/screens/screen-04-studio-empty.webp',
    '/assets/digital-marketing/brand-films/screen-portrait-silk.webp',
    '/assets/digital-marketing/brand-films/screen-fragrance-macro.webp',
    '/assets/digital-marketing/brand-films/screen-coastal-drive.webp',
  ];
  const fallbackTexture = new THREE.DataTexture(new Uint8Array([5, 7, 11, 255]), 1, 1);
  fallbackTexture.needsUpdate = true;
  textures.add(fallbackTexture);
  const textureLoader = new THREE.TextureLoader();
  let screenAssetIndex = 0;

  const trackMesh = (mesh: THREE.Mesh) => {
    geometries.add(mesh.geometry);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach(material => materials.add(material));
    return mesh;
  };

  // Broad polished floor. The actual reflection texture is supplied by the
  // multipass renderer after the mirrored-camera blur passes.
  const floorMaterial = new ReflectiveFloorMaterial();
  floorMaterial.uniforms.uReflectionStrength.value = 0.72;
  floorMaterial.uniforms.uBaseColor.value.set(0x030406);
  materials.add(floorMaterial);
  const floorGeometry = new THREE.PlaneGeometry(80, 80);
  geometries.add(floorGeometry);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.name = 'ReflectiveStudioFloor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -6);
  root.add(floor);
  reflectionExclusions.push(floor);

  // A dark cylindrical acoustic wall supplies real parallax behind the screen
  // gallery while disappearing naturally into the fog.
  const wallGeometry = new THREE.CylinderGeometry(18, 18, 10, 96, 1, true);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x05070a,
    roughness: 0.92,
    metalness: 0.03,
    side: THREE.BackSide,
  });
  const wall = trackMesh(new THREE.Mesh(wallGeometry, wallMaterial));
  wall.position.set(0, 5, 7.08);
  root.add(wall);

  function addScreenRing(options: {
    angles: number[];
    radius: number;
    y: number;
    rowScale: number;
  }) {
    const ring = new THREE.Group();
    ring.position.set(0, 0, 7.08);
    const titanium = new THREE.Color(0x7d858d);
    const burgundy = new THREE.Color(0x716b70);

    for (let index = 0; index < options.angles.length; index += 1) {
      const progress = index / Math.max(1, options.angles.length - 1);
      const angle = options.angles[index];
      const edgeWeight = Math.pow(Math.abs(progress * 2 - 1), 0.78);
      const depthOffset = index % 2 === 0 ? -0.72 : 0.58;
      const panelRadius = options.radius + depthOffset;
      const foregroundScale = depthOffset < 0 ? 1.24 : 0.92;
      const width = THREE.MathUtils.lerp(1.2, 1.7, edgeWeight) * options.rowScale * foregroundScale;
      const height = width * 0.49;
      const accent = titanium.clone().lerp(burgundy, progress);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uAccent: { value: accent },
          uTexture: { value: fallbackTexture },
          uTextureReady: { value: 0 },
          uFocusBlur: { value: depthOffset < 0 ? 0.006 : 0.0008 },
          uEdgeFade: { value: 1 },
          uIntensity: { value: 1.0 },
          uPhase: { value: progress * 2.3 + options.y * 0.17 },
          uTime: { value: 0 },
        },
        vertexShader: screenVertexShader,
        fragmentShader: screenFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      materials.add(material);
      screenMaterials.push(material);
      const imageUrl = screenUrls[screenAssetIndex % screenUrls.length];
      screenAssetIndex += 1;
      textureLoader.load(imageUrl, texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 8;
        texture.generateMipmaps = true;
        textures.add(texture);
        material.uniforms.uTexture.value = texture;
        material.uniforms.uTextureReady.value = 1;
      });

      const panelGroup = new THREE.Group();
      const panelGeometry = new THREE.PlaneGeometry(width, height);
      geometries.add(panelGeometry);
      const panel = new THREE.Mesh(panelGeometry, material);
      panel.renderOrder = 1;
      panelGroup.add(panel);

      panelGroup.position.set(
        Math.sin(angle) * panelRadius,
        options.y + (index % 2 ? 0.08 : -0.05),
        -Math.cos(angle) * panelRadius,
      );
      panelGroup.lookAt(0, options.y, 0);
      ring.add(panelGroup);
      screenTracks.push({
        group: panelGroup,
        material,
        baseAngle: angle,
        radius: panelRadius,
        y: options.y,
        min: angle < 0 ? -0.88 : 0.28,
        max: angle < 0 ? -0.28 : 0.88,
        speed: options.y > 2 ? 0.052 : -0.041,
        phase: options.y > 2 ? 0.35 : 2.1,
      });
    }

    root.add(ring);
    screenRings.push(ring);
  }

  addScreenRing({
    angles: mobile
      ? [-0.67, -0.38, 0.38, 0.67]
      : [-0.72, -0.4, 0.4, 0.72],
    radius: 9.25,
    y: 3.12,
    rowScale: mobile ? 0.88 : 1.38,
  });
  addScreenRing({
    angles: mobile
      ? [-0.58, -0.3, 0.3, 0.58]
      : [-0.64, -0.34, 0.34, 0.64],
    radius: 8.55,
    y: 1.68,
    rowScale: mobile ? 0.72 : 1.02,
  });

  // A shallow recessed presentation aperture replaces the previous raised,
  // neon platform. It remains quiet until the hero objects arrive later.
  const apertureGeometry = new THREE.CylinderGeometry(2.65, 2.65, 0.035, 96);
  const apertureMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x020304,
    metalness: 0.45,
    roughness: 0.3,
    clearcoat: 0.35,
    clearcoatRoughness: 0.34,
  });
  const aperture = trackMesh(new THREE.Mesh(apertureGeometry, apertureMaterial));
  aperture.position.set(0, -0.012, -2.45);
  root.add(aperture);

  const apertureRimGeometry = new THREE.TorusGeometry(2.65, 0.014, 6, 192);
  const apertureRimMaterial = new THREE.MeshBasicMaterial({
    color: 0x777b80,
    transparent: true,
    opacity: 0.16,
    toneMapped: false,
  });
  geometries.add(apertureRimGeometry);
  materials.add(apertureRimMaterial);
  const apertureRim = new THREE.Mesh(apertureRimGeometry, apertureRimMaterial);
  apertureRim.rotation.x = Math.PI / 2;
  apertureRim.position.set(0, 0.014, -2.45);
  root.add(apertureRim);

  // Large diffused glows create the asymmetric titanium/burgundy light pools
  // from the approved reference without exposing any lamp geometry.
  const coolGlowTexture = createRadialTexture('rgba(220,224,228,.68)', 'rgba(92,98,106,.18)');
  const warmGlowTexture = createRadialTexture('rgba(216,218,222,.64)', 'rgba(82,86,92,.16)');
  textures.add(coolGlowTexture);
  textures.add(warmGlowTexture);
  const glowSprites: THREE.Sprite[] = [];
  for (const [x, z, color, texture] of [
    [-6.5, -4.8, 0xaeb3b8, coolGlowTexture],
    [6.5, -4.8, 0xa4a6aa, warmGlowTexture],
  ] as const) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: mobile ? 0.38 : 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.add(material);
    const glow = new THREE.Sprite(material);
    glow.position.set(x, 1.15, z);
    glow.scale.set(12.5, 7.2, 1);
    glow.renderOrder = 0;
    root.add(glow);
    glowSprites.push(glow);
    reflectionExclusions.push(glow);
  }

  // Sparse atmospheric particles are deliberately smaller and dimmer than the
  // future globe particles. Their job is only to reveal depth in the room.
  const dustTexture = createRadialTexture('rgba(255,255,255,1)', 'rgba(255,225,220,.42)');
  textures.add(dustTexture);
  const random = seededRandom(0x4d594249);
  const dustCount = mobile ? 55 : 130;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustOrigins = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);
  for (let index = 0; index < dustCount; index += 1) {
    dustPositions[index * 3] = (random() * 2 - 1) * 9.5;
    dustPositions[index * 3 + 1] = 0.3 + random() * 4.2;
    dustPositions[index * 3 + 2] = 1.6 - random() * 12.5;
    dustOrigins.set(dustPositions.subarray(index * 3, index * 3 + 3), index * 3);
    dustPhases[index] = random() * Math.PI * 2;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  geometries.add(dustGeometry);
  const dustMaterial = new THREE.PointsMaterial({
    map: dustTexture,
    color: 0xd8c5c4,
    size: 0.018,
    opacity: 0.25,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  materials.add(dustMaterial);
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  root.add(dust);
  reflectionExclusions.push(dust);

  const hemisphere = new THREE.HemisphereLight(0x73777c, 0x020203, 0.38);
  const coolLight = new THREE.PointLight(0xb8bdc2, 34, 18, 1.8);
  coolLight.position.set(-6.2, 1.3, -2.3);
  const warmLight = new THREE.PointLight(0xaeb0b4, 36, 18, 1.85);
  warmLight.position.set(6.2, 1.15, -2.8);
  const centreFill = new THREE.SpotLight(0xe6e9ea, 10, 20, 0.78, 0.9, 1.35);
  centreFill.position.set(0, 6.8, 2.5);
  centreFill.target.position.set(0, 0, -2.4);
  root.add(hemisphere, coolLight, warmLight, centreFill, centreFill.target);

  let disposed = false;
  let motionEnabled = true;
  return {
    root,
    floor,
    floorMaterial,
    reflectionExclusions,
    update(delta, elapsed) {
      if (disposed) return;
      floorMaterial.update(elapsed);
      screenMaterials.forEach(material => { material.uniforms.uTime.value = elapsed; });
      if (!motionEnabled || delta <= 0) return;
      screenTracks.forEach(track => {
        const span = track.max - track.min;
        const speedDrift = Math.sin(elapsed * 0.16 + track.phase) * 0.038;
        const travel = elapsed * track.speed + speedDrift;
        const angle = track.min + THREE.MathUtils.euclideanModulo(
          track.baseAngle - track.min + travel,
          span,
        );
        const edgeDistance = Math.min(angle - track.min, track.max - angle);
        track.material.uniforms.uEdgeFade.value = THREE.MathUtils.smoothstep(edgeDistance, 0.02, 0.14);
        track.group.position.set(
          Math.sin(angle) * track.radius,
          track.y,
          -Math.cos(angle) * track.radius,
        );
        track.group.rotation.y = -angle;
      });
      glowSprites.forEach((sprite, index) => {
        const base = mobile ? 0.38 : 0.46;
        sprite.material.opacity = base * (0.94 + Math.sin(elapsed * 0.24 + index * 1.7) * 0.06);
      });
      const positions = dustGeometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positions.array as Float32Array;
      for (let index = 0; index < dustCount; index += 1) {
        const phase = dustPhases[index];
        array[index * 3] = dustOrigins[index * 3] + Math.sin(elapsed * 0.12 + phase) * 0.045;
        array[index * 3 + 1] = dustOrigins[index * 3 + 1] + Math.cos(elapsed * 0.16 + phase) * 0.035;
      }
      positions.needsUpdate = true;
    },
    setMotionEnabled(enabled) {
      motionEnabled = enabled;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      root.clear();
    },
  };
}
