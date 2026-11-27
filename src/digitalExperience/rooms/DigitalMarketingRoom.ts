import * as THREE from 'three';
import { digitalSceneConfig } from '../../digitalScene/config';
import { ReflectiveFloorMaterial } from '../materials/ReflectiveFloorMaterial';

export interface DigitalMarketingRoomHandle {
  root: THREE.Group;
  floor: THREE.Mesh;
  floorMaterial: ReflectiveFloorMaterial;
  reflectionExclusions: THREE.Object3D[];
  pendant: THREE.Group;
  globeSpotlight: THREE.SpotLight;
  update(delta: number, elapsed: number): void;
  setPointerTarget(x: number): void;
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
    vec3 glass = vec3(0.024) + uAccent * softField;
    glass = mix(glass, media * (0.92 + mediaLuma * 0.18), uTextureReady * 0.97);
    glass += grain;
    glass *= uIntensity;
    float alpha = mix(0.9, 1.0, edge) * uEdgeFade;
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
  const pendant = new THREE.Group();
  pendant.name = 'GlobePendantLamp';
  const spotlightConfig = digitalSceneConfig.lighting.spotlight;
  pendant.position.set(...spotlightConfig.anchor);
  root.add(pendant);
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
  let lampAngle = 0;
  let lampAngularVelocity = 0;
  let lampPointerTarget = 0;
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
  floorMaterial.uniforms.uReflectionStrength.value = 0.78;
  floorMaterial.uniforms.uBaseColor.value.set(0x0b0d10);
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
    color: 0x111419,
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
    for (let index = 0; index < options.angles.length; index += 1) {
      const progress = index / Math.max(1, options.angles.length - 1);
      const angle = options.angles[index];
      const edgeWeight = Math.pow(Math.abs(progress * 2 - 1), 0.78);
      const depthOffset = index % 2 === 0 ? -0.72 : 0.58;
      const panelRadius = options.radius + depthOffset;
      const foregroundScale = depthOffset < 0 ? 1.24 : 0.92;
      const width = THREE.MathUtils.lerp(1.2, 1.7, edgeWeight) * options.rowScale * foregroundScale;
      const height = width * 0.49;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uAccent: { value: new THREE.Color(0x9ca3aa) },
          uTexture: { value: fallbackTexture },
          uTextureReady: { value: 0 },
          uFocusBlur: { value: depthOffset < 0 ? 0.006 : 0.0008 },
          uEdgeFade: { value: 1 },
          uIntensity: { value: 1.4 },
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

  // A low-profile titanium and smoked-glass levitation plinth gives the globe
  // a believable physical anchor without reading as a black opening.
  const platform = new THREE.Group();
  platform.name = 'GlobeLevitationPlinth';
  platform.position.set(0, 0, -2.45);
  root.add(platform);

  const platformBase = trackMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(2.84, 2.94, 0.12, 96),
    new THREE.MeshPhysicalMaterial({
      color: 0x171b20,
      metalness: 0.82,
      roughness: 0.24,
      clearcoat: 0.68,
      clearcoatRoughness: 0.2,
    }),
  ));
  platformBase.position.y = 0.045;
  platform.add(platformBase);

  const platformGlass = trackMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(2.66, 2.66, 0.055, 96),
    new THREE.MeshPhysicalMaterial({
      color: 0x343b42,
      metalness: 0.46,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.9,
    }),
  ));
  platformGlass.position.y = 0.125;
  platform.add(platformGlass);

  const platformRim = trackMesh(new THREE.Mesh(
    new THREE.TorusGeometry(2.72, 0.035, 10, 192),
    new THREE.MeshStandardMaterial({
      color: 0xaeb6bd,
      metalness: 1,
      roughness: 0.18,
    }),
  ));
  platformRim.rotation.x = Math.PI / 2;
  platformRim.position.y = 0.153;
  platform.add(platformRim);

  const platformHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xc7d0d6,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const haloRadii = [2.34, 2.53];
  haloRadii.forEach((radius, index) => {
    const geometry = new THREE.TorusGeometry(radius, index === 0 ? 0.009 : 0.014, 6, 160);
    geometries.add(geometry);
    const halo = new THREE.Mesh(geometry, platformHaloMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.158;
    platform.add(halo);
  });
  materials.add(platformHaloMaterial);

  const floorPoolTexture = createRadialTexture('rgba(230,235,238,.28)', 'rgba(170,180,188,.055)');
  textures.add(floorPoolTexture);
  const floorPoolMaterial = new THREE.MeshBasicMaterial({
    map: floorPoolTexture,
    color: 0xd8dde1,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(floorPoolMaterial);
  const floorPoolGeometry = new THREE.PlaneGeometry(11.5, 7.2);
  geometries.add(floorPoolGeometry);
  const floorPool = new THREE.Mesh(floorPoolGeometry, floorPoolMaterial);
  floorPool.rotation.x = -Math.PI / 2;
  floorPool.position.set(0, 0.008, -2.45);
  floorPool.renderOrder = 1;
  root.add(floorPool);
  reflectionExclusions.push(floorPool);

  // A single neutral haze keeps the room focused without colored side pools.
  const centreGlowTexture = createRadialTexture('rgba(235,235,235,.62)', 'rgba(190,195,200,.12)');
  textures.add(centreGlowTexture);
  const glowSprites: THREE.Sprite[] = [];
  const centreGlowMaterial = new THREE.SpriteMaterial({
    map: centreGlowTexture,
    color: 0xffffff,
    transparent: true,
    opacity: mobile ? 0.68 : 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.add(centreGlowMaterial);
  const centreGlow = new THREE.Sprite(centreGlowMaterial);
  centreGlow.position.set(0, 1.15, -4.8);
  centreGlow.scale.set(23, 12, 1);
  centreGlow.renderOrder = 0;
  root.add(centreGlow);
  glowSprites.push(centreGlow);
  reflectionExclusions.push(centreGlow);

  // Sparse atmospheric particles are deliberately smaller and dimmer than the
  // future globe particles. Their job is only to reveal depth in the room.
  const dustTexture = createRadialTexture('rgba(255,255,255,1)', 'rgba(210,214,218,.42)');
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
    color: 0xd8dadd,
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

  const glowParticleCount = mobile ? 32 : 80;
  const glowParticlePositions = new Float32Array(glowParticleCount * 3);
  const glowParticleOrigins = new Float32Array(glowParticleCount * 3);
  const glowParticlePhases = new Float32Array(glowParticleCount);
  const glowParticleBrightness = new Float32Array(glowParticleCount);
  const glowParticleColors = new Float32Array(glowParticleCount * 3);
  for (let index = 0; index < glowParticleCount; index += 1) {
    const height = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = 1.8 + random() * 2.2;
    const horizontalRadius = Math.sqrt(1 - height * height) * radius;
    glowParticlePositions[index * 3] = Math.cos(angle) * horizontalRadius;
    glowParticlePositions[index * 3 + 1] = 1.62 + height * radius;
    glowParticlePositions[index * 3 + 2] = -1.8 + Math.sin(angle) * horizontalRadius;
    glowParticleOrigins.set(glowParticlePositions.subarray(index * 3, index * 3 + 3), index * 3);
    glowParticlePhases[index] = random() * Math.PI * 2;
    glowParticleBrightness[index] = 0.62 + random() * 0.38;
    glowParticleColors.fill(glowParticleBrightness[index], index * 3, index * 3 + 3);
  }
  const glowParticleGeometry = new THREE.BufferGeometry();
  glowParticleGeometry.setAttribute('position', new THREE.BufferAttribute(glowParticlePositions, 3));
  glowParticleGeometry.setAttribute('color', new THREE.BufferAttribute(glowParticleColors, 3));
  geometries.add(glowParticleGeometry);
  const glowParticleMaterial = new THREE.PointsMaterial({
    map: dustTexture,
    color: 0xe9edf0,
    size: mobile ? 0.052 : 0.066,
    sizeAttenuation: true,
    opacity: mobile ? 0.68 : 0.78,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    toneMapped: false,
  });
  materials.add(glowParticleMaterial);
  const glowParticles = new THREE.Points(glowParticleGeometry, glowParticleMaterial);
  glowParticles.renderOrder = 7;
  root.add(glowParticles);
  reflectionExclusions.push(glowParticles);

  const hemisphere = new THREE.HemisphereLight(0xc8cbd0, 0x050506, 0.68);
  const centreFill = new THREE.SpotLight(0xf0f2f3, 25, 30, 1.08, 1, 1.45);
  centreFill.position.set(0, 6.8, 2.5);
  centreFill.target.position.set(0, 0, -2.4);

  const cordMaterial = new THREE.MeshBasicMaterial({
    color: 0x727a80,
    toneMapped: false,
  });
  const shadeMaterial = new THREE.MeshBasicMaterial({
    color: 0x343a40,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const cord = trackMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, spotlightConfig.cordLength, 8),
    cordMaterial,
  ));
  cord.position.y = -spotlightConfig.cordLength / 2;
  pendant.add(cord);

  const lampCap = trackMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.12, 24),
    shadeMaterial,
  ));
  lampCap.position.y = -spotlightConfig.cordLength + 0.02;
  pendant.add(lampCap);

  const shadeHeight = 0.44;
  const shade = trackMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.5, shadeHeight, 40, 1, true),
    shadeMaterial,
  ));
  shade.position.y = -spotlightConfig.cordLength - shadeHeight / 2;
  pendant.add(shade);

  const shadeRim = trackMesh(new THREE.Mesh(
    new THREE.TorusGeometry(0.49, 0.018, 8, 48),
    cordMaterial,
  ));
  shadeRim.rotation.x = Math.PI / 2;
  shadeRim.position.y = -spotlightConfig.cordLength - shadeHeight;
  pendant.add(shadeRim);

  const bulbY = -spotlightConfig.cordLength - shadeHeight;
  const diffuser = trackMesh(new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 40),
    new THREE.MeshBasicMaterial({ color: 0xdfe6eb, toneMapped: false }),
  ));
  diffuser.rotation.x = Math.PI / 2;
  diffuser.position.y = bulbY;
  pendant.add(diffuser);

  const beamHazeTexture = createRadialTexture('rgba(245,247,248,.34)', 'rgba(218,223,227,.1)');
  textures.add(beamHazeTexture);
  const hazeLayers = [
    { y: bulbY - 0.72, width: 1.65, height: 1.85, opacity: mobile ? 0.17 : 0.21 },
    { y: bulbY - 1.45, width: 3.15, height: 2.45, opacity: mobile ? 0.105 : 0.13 },
    { y: bulbY - 2.05, width: 4.8, height: 3.25, opacity: mobile ? 0.052 : 0.07 },
  ];
  hazeLayers.forEach(layer => {
    const material = new THREE.SpriteMaterial({
      map: beamHazeTexture,
      color: spotlightConfig.color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: layer.opacity,
      toneMapped: false,
    });
    materials.add(material);
    const haze = new THREE.Sprite(material);
    haze.position.y = layer.y;
    haze.scale.set(layer.width, layer.height, 1);
    haze.renderOrder = 2;
    pendant.add(haze);
  });

  const bulbGlowTexture = createRadialTexture('rgba(255,255,255,.82)', 'rgba(230,235,240,.2)');
  textures.add(bulbGlowTexture);
  const bulbGlowMaterial = new THREE.SpriteMaterial({
    map: bulbGlowTexture,
    color: spotlightConfig.color,
    opacity: 0.4,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  materials.add(bulbGlowMaterial);
  const bulbGlow = new THREE.Sprite(bulbGlowMaterial);
  bulbGlow.position.y = bulbY - 0.06;
  bulbGlow.scale.set(0.8, 0.8, 1);
  bulbGlow.renderOrder = 2;
  pendant.add(bulbGlow);

  const bulbLight = new THREE.PointLight(0xf1f3f4, 12, 10, 1.8);
  bulbLight.position.set(0, bulbY - 0.08, 0);
  pendant.add(bulbLight);

  const globeSpotlight = new THREE.SpotLight(
    spotlightConfig.color,
    spotlightConfig.intensity,
    spotlightConfig.distance,
    spotlightConfig.angle,
    spotlightConfig.penumbra,
    spotlightConfig.decay,
  );
  globeSpotlight.position.set(0, bulbY, 0);
  globeSpotlight.target.position.set(...spotlightConfig.target);
  pendant.add(globeSpotlight);
  root.add(hemisphere, centreFill, centreFill.target, globeSpotlight.target);
  reflectionExclusions.push(pendant);

  let disposed = false;
  let motionEnabled = true;
  return {
    root,
    floor,
    floorMaterial,
    reflectionExclusions,
    pendant,
    globeSpotlight,
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
        const base = mobile ? 0.68 : 0.82;
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

      const particleColors = glowParticleGeometry.getAttribute('color') as THREE.BufferAttribute;
      const colorArray = particleColors.array as Float32Array;
      for (let index = 0; index < glowParticleCount; index += 1) {
        const phase = glowParticlePhases[index];
        const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(elapsed * 1.15 + phase));
        const brightness = glowParticleBrightness[index] * pulse;
        colorArray[index * 3] = brightness;
        colorArray[index * 3 + 1] = brightness;
        colorArray[index * 3 + 2] = brightness;
        glowParticlePositions[index * 3] = glowParticleOrigins[index * 3] + Math.sin(elapsed * 0.22 + phase) * 0.035;
        glowParticlePositions[index * 3 + 1] = glowParticleOrigins[index * 3 + 1] + Math.cos(elapsed * 0.28 + phase) * 0.035;
        glowParticlePositions[index * 3 + 2] = glowParticleOrigins[index * 3 + 2] + Math.sin(elapsed * 0.19 + phase) * 0.035;
      }
      particleColors.needsUpdate = true;
      (glowParticleGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      const desiredLampAngle = lampPointerTarget * 0.2;
      const lampAcceleration = (desiredLampAngle - lampAngle) * 7.2 - lampAngularVelocity * 2.7;
      lampAngularVelocity += lampAcceleration * delta;
      lampAngle += lampAngularVelocity * delta;
      pendant.rotation.z = lampAngle;
    },
    setPointerTarget(x) {
      if (!motionEnabled) return;
      lampPointerTarget = THREE.MathUtils.clamp(x, -1, 1);
    },
    setMotionEnabled(enabled) {
      motionEnabled = enabled;
      if (!enabled) {
        lampPointerTarget = 0;
        lampAngle = 0;
        lampAngularVelocity = 0;
        pendant.rotation.z = 0;
      }
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
