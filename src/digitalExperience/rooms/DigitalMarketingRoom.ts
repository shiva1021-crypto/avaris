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

function createSmokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Studio smoke texture could not be created.');

  const lobes = [
    [128, 128, 118, 0.24],
    [92, 120, 82, 0.18],
    [164, 116, 86, 0.16],
    [126, 158, 78, 0.14],
  ];
  lobes.forEach(([x, y, radius, alpha]) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(218,224,232,${alpha})`);
    gradient.addColorStop(0.44, `rgba(132,145,158,${alpha * 0.4})`);
    gradient.addColorStop(1, 'rgba(12,16,22,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });

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
  const screenMaterialsByImage = new Map<string, THREE.ShaderMaterial[]>();
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
    '/assets/digital-marketing/screens/screen-social-media-management.jpg',
    '/assets/digital-marketing/screens/screen-product-serum.jpg',
    '/assets/digital-marketing/screens/screen-sunscreen-campaign.jpg',
    '/assets/digital-marketing/screens/screen-marketing-strategy.jpg',
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
  floorMaterial.uniforms.uReflectionStrength.value = 1.5;
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
  const wallGeometry = new THREE.CylinderGeometry(18, 18, 10, 96, 16, true);
  const wallPositions = wallGeometry.getAttribute('position') as THREE.BufferAttribute;
  const wallColors = new Float32Array(wallPositions.count * 3);
  const wallBottom = new THREE.Color(0x0b0d10);
  const wallBody = new THREE.Color(0x111419);
  const wallVertexColor = new THREE.Color();
  for (let index = 0; index < wallPositions.count; index += 1) {
    const blend = THREE.MathUtils.smoothstep(wallPositions.getY(index), -4.35, -3.1);
    wallVertexColor.copy(wallBottom).lerp(wallBody, blend);
    wallColors[index * 3] = wallVertexColor.r;
    wallColors[index * 3 + 1] = wallVertexColor.g;
    wallColors[index * 3 + 2] = wallVertexColor.b;
  }
  wallGeometry.setAttribute('color', new THREE.BufferAttribute(wallColors, 3));
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.03,
    vertexColors: true,
    side: THREE.BackSide,
  });
  const wall = trackMesh(new THREE.Mesh(wallGeometry, wallMaterial));
  wall.position.set(0, 4.35, 7.08);
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
      const height = width * 0.55;
      const softFocus = index % 5 === 0;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uAccent: { value: new THREE.Color(0x9ca3aa) },
          uTexture: { value: fallbackTexture },
          uTextureReady: { value: 0 },
          uFocusBlur: { value: softFocus ? (depthOffset < 0 ? 0.0025 : 0.0015) : 0 },
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
      const imageUsers = screenMaterialsByImage.get(imageUrl);
      if (imageUsers) {
        imageUsers.push(material);
      } else {
        screenMaterialsByImage.set(imageUrl, [material]);
        textureLoader.load(imageUrl, texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 8;
          texture.generateMipmaps = true;
          textures.add(texture);
          screenMaterialsByImage.get(imageUrl)?.forEach(user => {
            user.uniforms.uTexture.value = texture;
            user.uniforms.uTextureReady.value = 1;
          });
        });
      }

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
        min: angle - Math.PI,
        max: angle + Math.PI,
        speed: options.y > 2 ? 0.052 : -0.041,
        phase: options.y > 2 ? 0.35 : 2.1,
      });
    }

    root.add(ring);
    screenRings.push(ring);
  }

  addScreenRing({
    angles: Array.from({ length: 20 }, (_, index) => index * Math.PI / 10 + Math.PI / 20),
    radius: 9.25,
    y: 3.12,
    rowScale: mobile ? 0.58 : 0.84,
  });
  addScreenRing({
    angles: Array.from({ length: 20 }, (_, index) => index * Math.PI / 10 + Math.PI / 20),
    radius: 8.55,
    y: 1.68,
    rowScale: mobile ? 0.48 : 0.66,
  });
  // Sparse atmospheric particles are deliberately smaller and dimmer than the
  // future globe particles. Their job is only to reveal depth in the room.
  const dustTexture = createRadialTexture('rgba(255,255,255,1)', 'rgba(210,214,218,.42)');
  textures.add(dustTexture);
  const random = seededRandom(0x4d594249);

  // Low-density smoke lives behind the globe and gallery panels. Unlike the
  // previous full-width glow sprite, each wisp fades in 3D before the floor.
  const smokeTexture = createSmokeTexture();
  textures.add(smokeTexture);
  const smokeRoot = new THREE.Group();
  smokeRoot.name = 'MarketingBackgroundSmoke';
  root.add(smokeRoot);
  reflectionExclusions.push(smokeRoot);
  const smokeWisps: Array<{
    sprite: THREE.Sprite;
    origin: THREE.Vector3;
    phase: number;
    opacity: number;
  }> = [];
  const smokeCount = mobile ? 7 : 12;
  for (let index = 0; index < smokeCount; index += 1) {
    const x = (random() * 2 - 1) * 7.4;
    const y = 1.05 + random() * 2.5;
    const z = -4.5 - random() * 5.5;
    const opacity = (mobile ? 0.032 : 0.038) + random() * 0.026;
    const material = new THREE.SpriteMaterial({
      map: smokeTexture,
      color: index % 3 === 0 ? 0xc3d0da : 0x899aa8,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    materials.add(material);
    const sprite = new THREE.Sprite(material);
    const scale = 3.4 + random() * 3.2;
    sprite.scale.set(scale * 1.55, scale * 0.74, 1);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 0;
    smokeRoot.add(sprite);
    smokeWisps.push({
      sprite,
      origin: sprite.position.clone(),
      phase: random() * Math.PI * 2,
      opacity,
    });
  }

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

  const hemisphere = new THREE.HemisphereLight(0xc8cbd0, 0x050506, 0.68);
  const centreFill = new THREE.SpotLight(0xf0f2f3, 25, 30, 1.08, 1, 1.45);
  centreFill.position.set(0, 6.8, 2.5);
  centreFill.target.position.set(0, 0, -2.4);
  const wallFill = new THREE.SpotLight(0xd3dce3, 34, 30, 0.72, 1, 1.55);
  wallFill.position.set(0, 4.2, -0.2);
  wallFill.target.position.set(0, 2.1, -11.2);

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
  root.add(hemisphere, centreFill, centreFill.target, wallFill, wallFill.target, globeSpotlight.target);
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
      smokeWisps.forEach((wisp, index) => {
        const drift = elapsed * (0.035 + index * 0.0025) + wisp.phase;
        wisp.sprite.position.x = wisp.origin.x + Math.sin(drift) * 0.28;
        wisp.sprite.position.y = wisp.origin.y + Math.cos(drift * 0.82) * 0.09;
        wisp.sprite.material.opacity = wisp.opacity * (0.86 + Math.sin(drift * 0.7) * 0.14);
      });
      const positions = dustGeometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positions.array as Float32Array;
      for (let index = 0; index < dustCount; index += 1) {
        const phase = dustPhases[index];
        array[index * 3] = dustOrigins[index * 3] + Math.sin(elapsed * 0.12 + phase) * 0.045;
        array[index * 3 + 1] = dustOrigins[index * 3 + 1] + Math.cos(elapsed * 0.16 + phase) * 0.035;
      }
      positions.needsUpdate = true;

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
