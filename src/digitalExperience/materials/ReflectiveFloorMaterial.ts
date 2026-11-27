import * as THREE from 'three';

const floorVertexShader = `
  uniform mat4 uReflectionMatrix;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec4 vClipPosition;
  varying vec4 vReflectionCoord;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vClipPosition = projectionMatrix * viewMatrix * world;
    vReflectionCoord = uReflectionMatrix * world;
    gl_Position = vClipPosition;
  }
`;

const floorFragmentShader = `
  uniform sampler2D uReflection;
  uniform float uReflectionStrength;
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uBurgundy;
  uniform vec3 uSlate;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec4 vClipPosition;
  varying vec4 vReflectionCoord;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }

  void main() {
    vec2 screenUv = vReflectionCoord.xy / max(vReflectionCoord.w, 0.0001);
    vec3 reflection = texture2D(uReflection, screenUv).rgb;

    vec2 detailUv = vWorldPosition.xz;
    float broad = noise(detailUv * 0.42);
    float fine = noise(detailUv * 3.4 + 19.0);
    float hairline = smoothstep(0.485, 0.515, noise(detailUv * 0.85 + vec2(7.0, 13.0)));
    float surface = broad * 0.055 + fine * 0.018 + hairline * 0.012;

    float sideBlend = smoothstep(-8.0, 7.0, vWorldPosition.x);
    vec3 tint = mix(uSlate, uBurgundy, sideBlend);
    float distanceFade = 1.0 - smoothstep(5.0, 28.0, length(vWorldPosition.xz - vec2(0.0, -2.5)));
    float horizonFade = smoothstep(-19.0, 2.0, vWorldPosition.z);
    float reflectionMask = distanceFade * horizonFade;

    float centerDistance = length((vWorldPosition.xz - vec2(0.0, -2.45)) * vec2(0.72, 1.0));
    float centerGlow = exp(-centerDistance * 0.52);
    vec3 base = uBaseColor + tint * (0.1 + surface);
    base += vec3(0.018, 0.019, 0.021) * centerGlow;
    float leftWash = exp(-pow((vWorldPosition.x + 5.5) * 0.22, 2.0) - pow((vWorldPosition.z + 2.0) * 0.11, 2.0));
    float rightWash = exp(-pow((vWorldPosition.x - 5.5) * 0.22, 2.0) - pow((vWorldPosition.z + 2.0) * 0.11, 2.0));
    base += vec3(0.012) * (leftWash + rightWash);
    base += vec3(surface * 0.35);
    reflection *= mix(vec3(0.92), tint * 2.2 + 0.7, 0.2);

    vec3 finalColor = base + reflection * uReflectionStrength * reflectionMask * (0.96 - surface * 1.4);
    float edgeFade = 1.0 - smoothstep(22.0, 38.0, length(vWorldPosition.xz));
    gl_FragColor = vec4(finalColor, edgeFade);
  }
`;

export class ReflectiveFloorMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      name: 'MYBIReflectiveStudioFloor',
      uniforms: {
        uReflection: { value: null },
        uReflectionMatrix: { value: new THREE.Matrix4() },
        uReflectionStrength: { value: 0.72 },
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(0x030406) },
        uBurgundy: { value: new THREE.Color(0x17191d) },
        uSlate: { value: new THREE.Color(0x20242a) },
      },
      vertexShader: floorVertexShader,
      fragmentShader: floorFragmentShader,
      transparent: true,
      depthWrite: true,
      depthTest: true,
    });
  }

  setReflection(texture: THREE.Texture) {
    this.uniforms.uReflection.value = texture;
  }

  setReflectionMatrix(matrix: THREE.Matrix4) {
    this.uniforms.uReflectionMatrix.value.copy(matrix);
  }

  update(time: number) {
    this.uniforms.uTime.value = time;
  }
}
