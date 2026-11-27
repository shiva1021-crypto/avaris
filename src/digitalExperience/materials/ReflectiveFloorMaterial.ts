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

    float distanceFade = 1.0 - smoothstep(5.0, 28.0, length(vWorldPosition.xz - vec2(0.0, -2.5)));
    float horizonFade = smoothstep(-19.0, 2.0, vWorldPosition.z);
    float reflectionMask = distanceFade * horizonFade;

    vec2 glowOffset = (vWorldPosition.xz - vec2(0.0, 3.2)) * vec2(0.8, 1.0);
    float centerGlow = exp(-dot(glowOffset, glowOffset) * 0.11);
    float innerGlow = exp(-dot(glowOffset, glowOffset) * 0.3);
    vec3 base = uBaseColor + vec3(surface * 0.1);
    base += vec3(0.055, 0.058, 0.061) * centerGlow;
    base += vec3(0.012) * innerGlow;
    base += vec3(surface * 0.35);
    reflection *= vec3(0.94);

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
