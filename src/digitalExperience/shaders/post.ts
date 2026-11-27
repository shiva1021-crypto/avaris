export const fullscreenVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const blurFragmentShader = `
  uniform sampler2D uInput;
  uniform vec2 uTexel;
  uniform vec2 uDirection;
  varying vec2 vUv;

  void main() {
    vec2 stepUv = uTexel * uDirection;
    vec4 color = texture2D(uInput, vUv) * 0.227027;
    color += texture2D(uInput, vUv + stepUv * 1.384615) * 0.316216;
    color += texture2D(uInput, vUv - stepUv * 1.384615) * 0.316216;
    color += texture2D(uInput, vUv + stepUv * 3.230769) * 0.070270;
    color += texture2D(uInput, vUv - stepUv * 3.230769) * 0.070270;
    gl_FragColor = color;
  }
`;

export const bloomExtractFragmentShader = `
  uniform sampler2D uInput;
  uniform float uThreshold;
  uniform float uSoftKnee;
  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(uInput, vUv).rgb;
    float brightness = max(max(color.r, color.g), color.b);
    float soft = clamp((brightness - uThreshold + uSoftKnee) / (2.0 * uSoftKnee), 0.0, 1.0);
    soft = soft * soft * (3.0 - 2.0 * soft);
    float contribution = max(brightness - uThreshold, 0.0) + soft * uSoftKnee;
    contribution /= max(brightness, 0.0001);
    gl_FragColor = vec4(color * contribution, 1.0);
  }
`;

export const compositeFragmentShader = `
  uniform sampler2D uScene;
  uniform sampler2D uBloom;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uBloomStrength;
  uniform float uVignetteStrength;
  uniform float uDistortion;
  uniform float uGrain;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 centered = vUv * 2.0 - 1.0;
    float radius2 = dot(centered, centered);
    vec2 warpedUv = 0.5 + centered * (0.5 + radius2 * uDistortion);

    float edgeMask = 1.0;

    vec2 chroma = centered * radius2 * 0.00075;
    float red = texture2D(uScene, warpedUv + chroma).r;
    float green = texture2D(uScene, warpedUv).g;
    float blue = texture2D(uScene, warpedUv - chroma).b;
    vec3 scene = vec3(red, green, blue);
    vec3 bloom = texture2D(uBloom, warpedUv).rgb;

    vec3 color = scene + bloom * uBloomStrength;
    color = color / (color + vec3(0.68));
    color = pow(max(color, 0.0), vec3(0.91));

    float vignette = smoothstep(1.18, 0.22, length(centered * vec2(0.92, 1.08)));
    color *= mix(1.0 - uVignetteStrength, 1.0, vignette);

    float grain = hash(gl_FragCoord.xy + vec2(uTime * 57.0, -uTime * 31.0)) - 0.5;
    color += grain * uGrain;
    color *= edgeMask;

    gl_FragColor = vec4(color, 1.0);
  }
`;
