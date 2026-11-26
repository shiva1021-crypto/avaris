// Archived holographic globe and orbital ring shaders from the superseded globe concept.
// Kept for reference only; not imported by the active Business Marketing studio scene.

export const globeVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
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

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float gridLine(float value, float count, float width) {
    float cell = fract(value * count);
    float distanceToLine = min(cell, 1.0 - cell);
    return 1.0 - smoothstep(0.0, width, distanceToLine);
  }

  void main() {
    vec2 texel = vec2(1.0 / 1024.0, 1.0 / 512.0);
    float land = texture2D(uLandMask, vUv).r;
    land = smoothstep(0.32, 0.68, land);
    float north = texture2D(uLandMask, vUv + vec2(0.0, texel.y)).r;
    float south = texture2D(uLandMask, vUv - vec2(0.0, texel.y)).r;
    float east = texture2D(uLandMask, vUv + vec2(texel.x, 0.0)).r;
    float west = texture2D(uLandMask, vUv - vec2(texel.x, 0.0)).r;
    float edge = smoothstep(0.08, 0.62, abs(north - south) + abs(east - west));
    float light = clamp(dot(normalize(vWorldNormal), normalize(uLightDirection)), 0.0, 1.0);
    float sideRim = pow(clamp(dot(normalize(vWorldNormal), normalize(uRimDirection)), 0.0, 1.0), 1.6);
    vec2 dotGrid = vUv * vec2(190.0, 95.0);
    vec2 dotCell = fract(dotGrid) - 0.5;
    float dotSeed = hash(floor(dotGrid));
    float dots = (1.0 - smoothstep(0.08, 0.21, length(dotCell))) * (0.35 + 0.65 * dotSeed);
    float meridian = gridLine(vUv.x, 24.0, 0.012);
    float parallel = gridLine(vUv.y, 12.0, 0.012);
    float grid = max(meridian * 0.55, parallel * 0.42);
    float fresnel = pow(1.0 - max(dot(normalize(vNormalView), normalize(vViewDir)), 0.0), 2.8);
    float rim = fresnel * (0.3 + 0.7 * pow(light, 1.4));
    float warmRim = fresnel * sideRim;
    float scan = 0.5 + 0.5 * sin(vUv.y * 52.0 - uTime * 0.24);
    vec3 ocean = uOceanColor * (0.55 + scan * 0.12);
    vec3 landTint = uLandColor * (0.42 + dots * 0.5 + edge * 0.26) * (0.55 + 0.65 * light);
    vec3 colour = mix(ocean, landTint, land * 0.88);
    colour += uGridColor * grid * (0.1 + land * 0.05) * (0.6 + 0.5 * light);
    colour += uFresnelColor * rim * 0.9;
    colour += uRimColor * warmRim * 0.7;
    float alpha = uOpacity * (0.05 + land * 0.05 + dots * land * 0.28 + edge * 0.2 + grid * 0.05 + rim * 0.4 + warmRim * 0.26);
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.86));
  }
`;
