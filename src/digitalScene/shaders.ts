export const globeVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;
  varying vec3 vSpherePosition;

  void main() {
    vUv = uv;
    vSpherePosition = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 viewPosition = viewMatrix * worldPosition;
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const globeFragmentShader = `
  uniform sampler2D uLandMask;
  uniform vec3 uLandColor;
  uniform vec3 uOceanColor;
  uniform vec3 uGridColor;
  uniform vec3 uFresnelColor;
  uniform vec3 uRimColor;
  uniform vec3 uLightDirection;
  uniform vec3 uRimDirection;
  uniform float uOpacity;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;
  varying vec3 vSpherePosition;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float gridLine(float value, float count, float width) {
    float cell = fract(value * count);
    float distanceToLine = min(cell, 1.0 - cell);
    return 1.0 - smoothstep(0.0, width, distanceToLine);
  }

  void main() {
    // Derive an equirectangular coordinate from the actual sphere position.
    // This avoids the stretched islands and broken seams produced by the
    // generated IcosahedronGeometry UVs and matches the particle map exactly.
    vec3 spherePosition = normalize(vSpherePosition);
    float longitude = atan(spherePosition.z, -spherePosition.x);
    vec2 sphereUv = vec2(
      fract(longitude / (2.0 * 3.14159265359) + 0.5),
      1.0 - acos(clamp(spherePosition.y, -1.0, 1.0)) / 3.14159265359
    );
    vec2 texel = vec2(1.0 / 1024.0, 1.0 / 512.0);
    float land = texture2D(uLandMask, sphereUv).r;
    land = smoothstep(0.32, 0.68, land);

    // A cheap coastline edge so continents read as linework rather than a
    // solid white mask. The mask is 4x wider than it is tall, hence texel.
    float north = texture2D(uLandMask, sphereUv + vec2(0.0, texel.y)).r;
    float south = texture2D(uLandMask, sphereUv - vec2(0.0, texel.y)).r;
    float east = texture2D(uLandMask, sphereUv + vec2(texel.x, 0.0)).r;
    float west = texture2D(uLandMask, sphereUv - vec2(texel.x, 0.0)).r;
    float edge = smoothstep(0.08, 0.62, abs(north - south) + abs(east - west));

    float light = clamp(dot(normalize(vWorldNormal), normalize(uLightDirection)), 0.0, 1.0);
    float sideRim = pow(clamp(dot(normalize(vWorldNormal), normalize(uRimDirection)), 0.0, 1.0), 1.6);

    // Fine geographic dot matrix, drawn only over land. Each dot varies in
    // strength so continents read as clustered settlements rather than a
    // uniform halftone.
    vec2 dotGrid = sphereUv * vec2(190.0, 95.0);
    vec2 dotCell = fract(dotGrid) - 0.5;
    float dotSeed = hash(floor(dotGrid));
    float dots = (1.0 - smoothstep(0.08, 0.21, length(dotCell))) * (0.35 + 0.65 * dotSeed);

    float meridian = gridLine(sphereUv.x, 24.0, 0.012);
    float parallel = gridLine(sphereUv.y, 12.0, 0.012);
    float grid = max(meridian * 0.55, parallel * 0.42);

    float fresnel = pow(1.0 - max(dot(normalize(vNormalView), normalize(vViewDir)), 0.0), 2.8);
    float rim = fresnel * (0.3 + 0.7 * pow(light, 1.4));
    float directionalRim = fresnel * sideRim;
    float scan = 0.5 + 0.5 * sin(sphereUv.y * 52.0 - uTime * 0.24);

    vec3 ocean = uOceanColor * (0.55 + scan * 0.12);
    vec3 landTint = uLandColor * (0.42 + dots * 0.5 + edge * 0.26) * (0.55 + 0.65 * light);
    vec3 colour = mix(ocean, landTint, land * 0.88);
    colour += uGridColor * grid * (0.1 + land * 0.05) * (0.6 + 0.5 * light);
    colour += uFresnelColor * rim * 0.9;
    colour += uRimColor * directionalRim * 0.7;

    float alpha = uOpacity * (
      0.065 +
      land * 0.075 +
      dots * land * 0.34 +
      edge * 0.24 +
      grid * 0.05 +
      rim * 0.4 +
      directionalRim * 0.26
    );
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.86));
  }
`;

export const floorOverlayVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

// The far floor fades into the page rather than ending on a hard horizon
// edge. The same distance fade is applied to the overlay so the two layers
// cannot separate into visible bands.
export const floorBaseFragmentShader = `
  uniform vec3 uColor;

  varying vec3 vWorldPosition;

  void main() {
    float distanceFromCentre = length(vWorldPosition.xz);
    float fade = 1.0 - smoothstep(26.0, 52.0, distanceFromCentre);
    gl_FragColor = vec4(uColor, fade);
  }
`;

export const floorOverlayFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float radial = distance(vUv, vec2(0.5)) * 2.0;
    float fade = smoothstep(0.04, 0.92, radial);
    float grain = hash(floor(vWorldPosition.xz * 3.0)) * 0.04;
    float horizon = 1.0 - smoothstep(26.0, 52.0, length(vWorldPosition.xz));
    float alpha = uOpacity * (0.16 + fade * 0.84 + grain * 0.5) * horizon;
    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.94));
  }
`;

export const floorGlowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const floorGlowFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uRingColor;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    vec2 point = vUv * 2.0 - 1.0;
    float distanceFromCentre = length(point);
    float pool = pow(smoothstep(1.0, 0.0, distanceFromCentre), 2.8);
    float nearRing = smoothstep(0.007, 0.0, abs(distanceFromCentre - 0.19));
    float innerRing = smoothstep(0.008, 0.0, abs(distanceFromCentre - 0.4));
    float rings = nearRing * 0.95 + innerRing * 0.7;

    vec3 colour = uColor * pool + uRingColor * rings;
    float alpha = uOpacity * (pool * 0.18 + rings);
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.8));
  }
`;

export const floorSheenFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    vec2 point = vUv * 2.0 - 1.0;
    float distanceFromCentre = length(point);
    float pool = pow(smoothstep(1.0, 0.0, distanceFromCentre), 2.3);
    gl_FragColor = vec4(uColor, pool * uOpacity);
  }
`;

export const contactShadowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const contactShadowFragmentShader = `
  varying vec2 vUv;

  void main() {
    float distanceFromCentre = length(vUv * 2.0 - 1.0);
    float alpha = (1.0 - smoothstep(0.08, 1.0, distanceFromCentre)) * 0.58;
    gl_FragColor = vec4(0.004, 0.005, 0.007, alpha);
  }
`;

export const ringVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const ringFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPhase;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    float sweep = 0.5 + 0.5 * sin(vUv.x * 48.0 - uTime * 0.55 + uPhase);
    float signal = smoothstep(0.72, 1.0, sweep);
    float edge = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.35);
    float alpha = uOpacity * (0.38 + signal * 0.46 + edge * 0.2);
    gl_FragColor = vec4(uColor * (0.92 + signal * 0.42), alpha);
  }
`;

