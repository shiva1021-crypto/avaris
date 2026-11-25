/** Time-evolving, domain-warped smoke. No raster smoke texture or 3D model. */
export class LiveSmokeRenderer {
  readonly canvas = document.createElement('canvas');
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private shaders: WebGLShader[] = [];
  private cursor: WebGLUniformLocation | null;
  private scroll: WebGLUniformLocation | null;
  private time: WebGLUniformLocation | null;
  private resolution: WebGLUniformLocation | null;

  static create() {
    try { return new LiveSmokeRenderer(); } catch { return null; }
  }

  private constructor() {
    const gl = this.canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: false, antialias: false,
      depth: false, stencil: false, powerPreference: 'low-power',
    });
    if (!gl) throw new Error('Shader smoke is unavailable.');
    this.gl = gl;
    const vertex = this.compile(gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `);
    const fragment = this.compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec4 u_cursor;
      uniform float u_scroll;

      float hash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * 0.1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = 0.0, weight = 0.55;
        mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
        for (int i = 0; i < 4; i++) {
          value += noise(p) * weight;
          p = turn * p * 2.03 + vec2(7.1, 13.7);
          weight *= 0.5;
        }
        return value;
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        uv.y = 1.0 - uv.y;
        float t = u_time;
        vec2 p = vec2(uv.x * u_resolution.x / u_resolution.y, uv.y) * 3.6;
        // Continuous crosswind and slow lift; nested fields fold the wisps.
        p += vec2(-t * 0.105, t * 0.04 + u_scroll);
        // Pull the wisps along the pointer and curl the edges of the wake.
        vec2 relative = (uv - u_cursor.xy) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float influence = exp(-dot(relative, relative) * 85.0);
        vec2 swirl = vec2(-relative.y, relative.x) * length(u_cursor.zw);
        p -= influence * (u_cursor.zw * 4.0 + swirl * 18.0);
        vec2 eddy = vec2(
          fbm(p * 0.72 + vec2(t * 0.055, -t * 0.045)),
          fbm(p * 0.72 + vec2(4.7, 8.2) + vec2(-t * 0.04, t * 0.035))
        );
        float body = fbm(p + eddy * 3.4);
        float folds = fbm(p * 1.8 - eddy * 2.1 + vec2(t * 0.035, -t * 0.06));
        float density = smoothstep(0.28, 0.73, body * 0.73 + folds * 0.34);
        // Small scale variation makes ribbons of mist instead of a flat haze.
        density *= 0.62 + folds * 0.7;
        float vertical = smoothstep(0.04, 0.2, uv.y) * (1.0 - smoothstep(0.72, 0.9, uv.y));
        float lateral = 0.64 + 0.36 * (1.0 - smoothstep(0.12, 1.0, uv.x));
        float light = clamp(1.0 - length((uv - vec2(0.22, 0.12)) * vec2(0.8, 0.7)), 0.0, 1.0);
        vec3 color = mix(vec3(0.34, 0.4, 0.48), vec3(0.67, 0.73, 0.8), light);
        gl_FragColor = vec4(color, density * vertical * lateral * 0.46);
      }
    `);
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program); this.shaders.forEach(shader => gl.deleteShader(shader));
      throw new Error('Smoke shader linking failed.');
    }
    this.program = program;
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.cursor = gl.getUniformLocation(program, 'u_cursor');
    this.scroll = gl.getUniformLocation(program, 'u_scroll');
    this.time = gl.getUniformLocation(program, 'u_time');
    this.resolution = gl.getUniformLocation(program, 'u_resolution');
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  }

  private compile(type: number, source: string) {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source); this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      this.gl.deleteShader(shader);
      this.shaders.forEach(item => this.gl.deleteShader(item));
      throw new Error('Smoke shader compilation failed.');
    }
    this.shaders.push(shader);
    return shader;
  }

  resize(width: number, height: number) {
    this.canvas.width = width; this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  render(seconds: number, cursor: { x: number; y: number; dx: number; dy: number }, scroll: number) {
    const gl = this.gl;
    if (gl.isContextLost()) return false;
    gl.useProgram(this.program);
    gl.uniform4f(this.cursor, cursor.x, cursor.y, cursor.dx, cursor.dy);
    gl.uniform1f(this.scroll, scroll);
    gl.uniform1f(this.time, seconds);
    gl.uniform2f(this.resolution, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  dispose() {
    this.gl.deleteBuffer(this.buffer); this.gl.deleteProgram(this.program);
    this.shaders.forEach(shader => this.gl.deleteShader(shader));
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
