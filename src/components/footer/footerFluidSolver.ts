type Field = { texture: WebGLTexture; buffer: WebGLFramebuffer };
type Pair = { read: Field; write: Field; swap: () => void };
type Program = {
  value: WebGLProgram;
  locations: Map<string, WebGLUniformLocation | null>;
};
type Readback = { buffer: WebGLBuffer; sync: WebGLSync | null; sequence: number };

export type FluidImpulse = {
  x: number;
  y: number;
  dx: number;
  dy: number;
};

const VERTEX = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 result;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_aspect;
uniform sampler2D u_source;
`;

const SHADERS = {
  splat: `
uniform vec2 u_point;
uniform vec3 u_force;
uniform float u_radius;
void main() {
  vec2 d = v_uv - u_point;
  d.x *= u_aspect;
  float drop = exp(-dot(d, d) / u_radius);
  result = texture(u_source, v_uv) + vec4(u_force * drop, 0.0);
}`,
  advect: `
uniform sampler2D u_velocity;
uniform float u_decay;
vec4 sampleLinear(sampler2D field, vec2 uv) {
  vec2 p = clamp(uv, u_texel * 0.5, 1.0 - u_texel * 0.5) / u_texel - 0.5;
  vec2 base = floor(p), f = fract(p);
  vec2 a = (base + 0.5) * u_texel;
  return mix(mix(texture(field, a), texture(field, a + vec2(u_texel.x, 0.0)), f.x),
             mix(texture(field, a + vec2(0.0, u_texel.y)), texture(field, a + u_texel), f.x), f.y);
}
void main() {
  vec2 velocity = texture(u_velocity, v_uv).xy;
  result = sampleLinear(u_source, v_uv - u_dt * velocity * u_texel) * exp(-u_decay * u_dt);
}`,
  curl: `
void main() {
  float l = texture(u_source, v_uv - vec2(u_texel.x, 0.0)).y;
  float r = texture(u_source, v_uv + vec2(u_texel.x, 0.0)).y;
  float b = texture(u_source, v_uv - vec2(0.0, u_texel.y)).x;
  float t = texture(u_source, v_uv + vec2(0.0, u_texel.y)).x;
  result = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}`,
  vorticity: `
uniform sampler2D u_curl;
void main() {
  float l = abs(texture(u_curl, v_uv - vec2(u_texel.x, 0.0)).r);
  float r = abs(texture(u_curl, v_uv + vec2(u_texel.x, 0.0)).r);
  float b = abs(texture(u_curl, v_uv - vec2(0.0, u_texel.y)).r);
  float t = abs(texture(u_curl, v_uv + vec2(0.0, u_texel.y)).r);
  float c = texture(u_curl, v_uv).r;
  vec2 force = vec2(t - b, l - r);
  force *= 18.0 * c / (length(force) + 0.0001);
  vec2 velocity = texture(u_source, v_uv).xy;
  result = vec4(clamp(velocity + force * u_dt, -180.0, 180.0), 0.0, 1.0);
}`,
  divergence: `
void main() {
  vec2 c = texture(u_source, v_uv).xy;
  float l = texture(u_source, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture(u_source, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture(u_source, v_uv - vec2(0.0, u_texel.y)).y;
  float t = texture(u_source, v_uv + vec2(0.0, u_texel.y)).y;
  if (v_uv.x < u_texel.x) l = -c.x;
  if (v_uv.x > 1.0 - u_texel.x) r = -c.x;
  if (v_uv.y < u_texel.y) b = -c.y;
  if (v_uv.y > 1.0 - u_texel.y) t = -c.y;
  result = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`,
  pressure: `
uniform sampler2D u_divergence;
void main() {
  float l = texture(u_source, v_uv - vec2(u_texel.x, 0.0)).r;
  float r = texture(u_source, v_uv + vec2(u_texel.x, 0.0)).r;
  float b = texture(u_source, v_uv - vec2(0.0, u_texel.y)).r;
  float t = texture(u_source, v_uv + vec2(0.0, u_texel.y)).r;
  float d = texture(u_divergence, v_uv).r;
  result = vec4((l + r + b + t - d) * 0.25, 0.0, 0.0, 1.0);
}`,
  project: `
uniform sampler2D u_pressure;
void main() {
  float l = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).r;
  float r = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).r;
  float b = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).r;
  float t = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).r;
  vec2 velocity = texture(u_source, v_uv).xy - 0.5 * vec2(r - l, t - b);
  if (v_uv.x < u_texel.x || v_uv.x > 1.0 - u_texel.x) velocity.x = 0.0;
  if (v_uv.y < u_texel.y || v_uv.y > 1.0 - u_texel.y) velocity.y = 0.0;
  result = vec4(velocity, 0.0, 1.0);
}`,
  waves: `
void main() {
  vec3 q = texture(u_source, v_uv).rgb;
  float l = texture(u_source, v_uv - vec2(u_texel.x, 0.0)).g;
  float r = texture(u_source, v_uv + vec2(u_texel.x, 0.0)).g;
  float b = texture(u_source, v_uv - vec2(0.0, u_texel.y)).g;
  float t = texture(u_source, v_uv + vec2(0.0, u_texel.y)).g;
  q.b = (q.b + (l + r + b + t - 4.0 * q.g) * 850.0 * u_dt) * exp(-2.4 * u_dt);
  q.g = (q.g + q.b * u_dt) * exp(-0.45 * u_dt);
  result = vec4(clamp(q, vec3(0.0, -0.8, -12.0), vec3(2.0, 0.8, 12.0)), 1.0);
}`,
  displacement: `
uniform sampler2D u_velocity;
float heightAt(vec2 uv) {
  vec2 q = texture(u_source, uv).rg;
  return q.y + q.x * 0.12;
}
void main() {
  float l = heightAt(v_uv - vec2(u_texel.x, 0.0));
  float r = heightAt(v_uv + vec2(u_texel.x, 0.0));
  float b = heightAt(v_uv - vec2(0.0, u_texel.y));
  float t = heightAt(v_uv + vec2(0.0, u_texel.y));
  vec2 q = texture(u_source, v_uv).rg;
  vec2 velocity = texture(u_velocity, v_uv).xy;
  float strength = smoothstep(0.001, 0.035, q.r + abs(q.g));
  // R follows screen x; G reverses WebGL y to follow the SVG image's screen y.
  vec2 warp = (vec2(r - l, b - t) * 4.8 + vec2(velocity.x, -velocity.y) * 0.0035) * strength;
  warp = clamp(warp, vec2(-0.48), vec2(0.48));
  result = vec4(vec2(128.0 / 255.0) + warp, 0.0, 1.0);
}`,
  display: `
float heightAt(vec2 uv) {
  vec2 q = texture(u_source, uv).rg;
  return q.y + q.x * 0.12;
}
void main() {
  float l = heightAt(v_uv - vec2(u_texel.x, 0.0));
  float r = heightAt(v_uv + vec2(u_texel.x, 0.0));
  float b = heightAt(v_uv - vec2(0.0, u_texel.y));
  float t = heightAt(v_uv + vec2(0.0, u_texel.y));
  vec3 n = normalize(vec3((l - r) * 26.0, (b - t) * 26.0, 1.0));
  vec3 reflection = reflect(vec3(0.0, 0.0, -1.0), n);
  float strip = exp(-pow((reflection.x + 0.30) / 0.12, 2.0))
              * exp(-pow((reflection.y - 0.38) / 0.80, 2.0));
  vec3 halfLight = normalize(vec3(-0.48, 0.65, 1.8));
  float specular = pow(max(dot(n, halfLight), 0.0), 52.0);
  float wet = clamp(texture(u_source, v_uv).r, 0.0, 1.0);
  float edge = 1.0 - pow(n.z, 3.0);
  float motion = smoothstep(0.005, 0.09, abs(l - r) + abs(b - t));
  vec3 color = vec3(0.075, 0.078, 0.065) * wet * 0.60
             + vec3(0.38, 0.43, 0.27) * edge * 0.27
             + vec3(0.78, 0.81, 0.68) * (strip * 0.48 + specular * 0.30) * motion;
  // Transparent resting pixels leave the exact CSS footer ground visible.
  result = vec4(color, clamp(wet * 0.24 + edge * 0.44 + (strip + specular) * motion * 0.5, 0.0, 0.76));
}`,
} as const;

/** A footer-local GPU solver; it never reads or changes the document's content. */
export function createFooterFluid(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) return null;

  const programs = new Map<keyof typeof SHADERS, Program>();
  const fields = new Set<Field>();
  const shaders = new Set<WebGLShader>();
  const vao = gl.createVertexArray();
  let width = 1, height = 1, aspect = 1, dt = 1 / 60;
  let velocity: Pair, surface: Pair, pressure: Pair, curl: Field, divergence: Field;
  let displacement: Field | null = null;
  let mapWidth = 1, mapHeight = 1;
  let mapCanvas: HTMLCanvasElement | null = null;
  let mapContext: CanvasRenderingContext2D | null = null;
  let mapPixels: Uint8Array | null = null;
  let mapImage: ImageData | null = null;
  const readbacks: Readback[] = [];
  let readbackSequence = 0;
  let shortSide = 128;
  let pressureSteps = 8;
  let disposed = false;

  const resetReadbacks = (deleteBuffers: boolean) => {
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    for (const slot of readbacks) {
      if (slot.sync) gl.deleteSync(slot.sync);
      slot.sync = null;
      if (deleteBuffers) gl.deleteBuffer(slot.buffer);
    }
    if (deleteBuffers) readbacks.length = 0;
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    resetReadbacks(true);
    fields.forEach(({ texture, buffer }) => {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(buffer);
    });
    fields.clear();
    programs.forEach(({ value }) => gl.deleteProgram(value));
    programs.clear();
    shaders.forEach((shader) => gl.deleteShader(shader));
    shaders.clear();
    gl.deleteVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    displacement = null;
    mapCanvas = null;
    mapContext = null;
    mapPixels = null;
    mapImage = null;
  };

  const compile = (type: number, code: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Footer fluid shader unavailable");
    shaders.add(shader);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Footer fluid shader failed");
    }
    return shader;
  };

  const field = (targetWidth = width, targetHeight = height, byte = false): Field => {
    const texture = gl.createTexture();
    const buffer = gl.createFramebuffer();
    if (!texture || !buffer) {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(buffer);
      throw new Error("Footer fluid buffer unavailable");
    }
    const value = { texture, buffer };
    fields.add(value);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // WebGL2's 16-bit float targets are filterable without the 32-bit float extension.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, byte ? gl.RGBA8 : gl.RGBA16F, targetWidth, targetHeight, 0, gl.RGBA, byte ? gl.UNSIGNED_BYTE : gl.HALF_FLOAT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Footer fluid floating point target unsupported");
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return value;
  };

  const pair = (): Pair => {
    const value = { read: field(), write: field(), swap: () => {
      [value.read, value.write] = [value.write, value.read];
    } };
    return value;
  };

  const location = (program: Program, name: string) => {
    if (!program.locations.has(name)) {
      program.locations.set(name, gl.getUniformLocation(program.value, name));
    }
    return program.locations.get(name)!;
  };
  const scalar = (program: Program, name: string, value: number) =>
    gl.uniform1f(location(program, name), value);
  const texture = (program: Program, name: string, field: Field, unit: number) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, field.texture);
    gl.uniform1i(location(program, name), unit);
  };

  const pass = (name: keyof typeof SHADERS, target: Field | null, setup: (p: Program) => void, targetWidth = width, targetHeight = height) => {
    const program = programs.get(name)!;
    gl.useProgram(program.value);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.buffer ?? null);
    gl.viewport(0, 0, target ? targetWidth : canvas.width, target ? targetHeight : canvas.height);
    gl.uniform2f(location(program, "u_texel"), 1 / width, 1 / height);
    scalar(program, "u_dt", dt);
    scalar(program, "u_aspect", aspect);
    setup(program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const clear = () => {
    // Pending images belong to the old trail and must never warp a new interaction.
    resetReadbacks(true);
    fields.forEach((value) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, value.buffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const resize = (cssWidth: number, cssHeight: number, quality = 1) => {
    resetReadbacks(true);
    aspect = cssWidth / cssHeight;
    const mapScale = Math.min((quality <= 0.5 ? 48 : quality < 1 ? 80 : 128) / cssWidth,
      (quality <= 0.5 ? 32 : quality < 1 ? 48 : 80) / cssHeight);
    const nextMapWidth = Math.max(2, Math.round(cssWidth * mapScale));
    const nextMapHeight = Math.max(2, Math.round(cssHeight * mapScale));
    if (displacement && (nextMapWidth !== mapWidth || nextMapHeight !== mapHeight)) {
      gl.deleteTexture(displacement.texture);
      gl.deleteFramebuffer(displacement.buffer);
      fields.delete(displacement);
      displacement = null;
    }
    mapWidth = nextMapWidth;
    mapHeight = nextMapHeight;
    shortSide = quality <= 0.5 ? 64 : quality < 1 ? 96 : 128;
    pressureSteps = quality <= 0.5 ? 3 : quality < 1 ? 5 : 8;
    const simScale = Math.min(shortSide / Math.min(cssWidth, cssHeight), 300 / Math.max(cssWidth, cssHeight));
    const nextWidth = Math.max(2, Math.round(cssWidth * simScale));
    const nextHeight = Math.max(2, Math.round(cssHeight * simScale));
    const dpr = Math.min(window.devicePixelRatio || 1, quality < 1 ? 1 : 1.35);
    const renderScale = Math.min(dpr, Math.sqrt((quality < 1 ? 700_000 : 1_300_000) / (cssWidth * cssHeight)));
    canvas.width = Math.max(1, Math.round(cssWidth * renderScale));
    canvas.height = Math.max(1, Math.round(cssHeight * renderScale));
    if (nextWidth === width && nextHeight === height && fields.size) return;
    fields.forEach(({ texture, buffer }) => {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(buffer);
    });
    fields.clear();
    displacement = null;
    width = nextWidth;
    height = nextHeight;
    velocity = pair();
    surface = pair();
    pressure = pair();
    curl = field();
    divergence = field();
    canvas.dataset.fluidResolution = `${width}x${height}`;
  };

  const impulse = ({ x, y, dx, dy }: FluidImpulse, cssShortSide: number) => {
    // The shader's aspect-correct distance is measured in footer-height units.
    const cssHeight = aspect < 1 ? cssShortSide / aspect : cssShortSide;
    const radius = Math.max(18, Math.min(32, cssShortSide * 0.035)) / cssHeight;
    const splat = (target: Pair, a: number, b: number, c: number) => {
      pass("splat", target.write, (p) => {
        texture(p, "u_source", target.read, 0);
        gl.uniform2f(location(p, "u_point"), x, y);
        gl.uniform3f(location(p, "u_force"), a, b, c);
        scalar(p, "u_radius", radius * radius);
      });
      target.swap();
    };
    splat(velocity, Math.max(-120, Math.min(120, dx * width * 8)), Math.max(-120, Math.min(120, dy * height * 8)), 0);
    splat(surface, 0.62, -0.14, -0.8);
  };

  const render = () => pass("display", null, (p) => texture(p, "u_source", surface.read, 0));
  const readDisplacement = (): string | null => {
    const start = performance.now();
    if (!displacement) displacement = field(mapWidth, mapHeight, true);
    if (!mapCanvas) {
      mapCanvas = document.createElement("canvas");
      // PNG encoding reads CPU pixels; keep this tiny staging canvas off the GPU.
      mapContext = mapCanvas.getContext("2d", { willReadFrequently: true });
      if (!mapContext) throw new Error("Footer displacement image unavailable");
    }
    if (!mapPixels || !mapImage || mapCanvas.width !== mapWidth || mapCanvas.height !== mapHeight) {
      mapCanvas.width = mapWidth;
      mapCanvas.height = mapHeight;
      mapPixels = new Uint8Array(mapWidth * mapHeight * 4);
      mapImage = mapContext!.createImageData(mapWidth, mapHeight);
    }
    if (!readbacks.length) {
      for (let i = 0; i < 2; i++) {
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error("Footer displacement readback unavailable");
        readbacks.push({ buffer, sync: null, sequence: 0 });
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, mapPixels.byteLength, gl.STREAM_DRAW);
      }
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    }

    const readStart = performance.now();
    const completed: Readback[] = [];
    for (const slot of readbacks) {
      if (!slot.sync) continue;
      // Zero timeout only polls; an unfinished GPU frame never blocks input or rendering.
      const status = gl.clientWaitSync(slot.sync, 0, 0);
      if (status === gl.WAIT_FAILED) throw new Error("Footer displacement readback failed");
      if (status !== gl.ALREADY_SIGNALED && status !== gl.CONDITION_SATISFIED) continue;
      completed.push(slot);
    }

    // Consume every completed PBO before reuse, so ANGLE can keep its fenced shadow copy.
    completed.sort((a, b) => a.sequence - b.sequence);
    for (const slot of completed) {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, slot.buffer);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, mapPixels);
      gl.deleteSync(slot.sync!);
      slot.sync = null;
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const readBufferMs = performance.now() - readStart;

    let image: string | null = null;
    const pngStart = performance.now();
    if (completed.length) {
      // readPixels is bottom-first; feImage and ImageData are top-first.
      const stride = mapWidth * 4;
      for (let row = 0; row < mapHeight; row++) {
        mapImage.data.set(mapPixels.subarray((mapHeight - row - 1) * stride, (mapHeight - row) * stride), row * stride);
      }
      mapContext!.putImageData(mapImage, 0, 0);
      image = mapCanvas.toDataURL("image/png");
    }
    const pngMs = performance.now() - pngStart;

    const enqueueStart = performance.now();
    const free = readbacks.find((slot) => !slot.sync);
    if (free) {
      pass("displacement", displacement, (p) => {
        texture(p, "u_source", surface.read, 0);
        texture(p, "u_velocity", velocity.read, 1);
      }, mapWidth, mapHeight);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, free.buffer);
      gl.readPixels(0, 0, mapWidth, mapHeight, gl.RGBA, gl.UNSIGNED_BYTE, 0);
      free.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!free.sync) throw new Error("Footer displacement fence unavailable");
      free.sequence = ++readbackSequence;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      gl.flush();
    }
    const enqueueMs = performance.now() - enqueueStart;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    canvas.dataset.fluidMapMs = (performance.now() - start).toFixed(2);
    canvas.dataset.fluidReadBufferMs = readBufferMs.toFixed(2);
    canvas.dataset.fluidEnqueueMs = enqueueMs.toFixed(2);
    canvas.dataset.fluidPngMs = pngMs.toFixed(2);
    canvas.dataset.fluidMapResolution = `${mapWidth}x${mapHeight}`;
    return image;
  };
  const step = (seconds: number) => {
    // The damped wave stencil stays below its two-dimensional CFL limit.
    dt = Math.min(1 / 50, Math.max(1 / 240, seconds));
    pass("advect", velocity.write, (p) => {
      texture(p, "u_source", velocity.read, 0);
      texture(p, "u_velocity", velocity.read, 1);
      scalar(p, "u_decay", 1.45);
    });
    velocity.swap();
    pass("curl", curl, (p) => texture(p, "u_source", velocity.read, 0));
    pass("vorticity", velocity.write, (p) => {
      texture(p, "u_source", velocity.read, 0);
      texture(p, "u_curl", curl, 1);
    });
    velocity.swap();
    pass("divergence", divergence, (p) => texture(p, "u_source", velocity.read, 0));
    // Warm-start pressure, but remove the last frame's accumulated offset.
    pass("advect", pressure.write, (p) => {
      texture(p, "u_source", pressure.read, 0);
      texture(p, "u_velocity", velocity.read, 1);
      scalar(p, "u_decay", 12);
    });
    pressure.swap();
    for (let i = 0; i < pressureSteps; i++) {
      pass("pressure", pressure.write, (p) => {
        texture(p, "u_source", pressure.read, 0);
        texture(p, "u_divergence", divergence, 1);
      });
      pressure.swap();
    }
    pass("project", velocity.write, (p) => {
      texture(p, "u_source", velocity.read, 0);
      texture(p, "u_pressure", pressure.read, 1);
    });
    velocity.swap();
    pass("advect", surface.write, (p) => {
      texture(p, "u_source", surface.read, 0);
      texture(p, "u_velocity", velocity.read, 1);
      scalar(p, "u_decay", 0.7);
    });
    surface.swap();
    pass("waves", surface.write, (p) => texture(p, "u_source", surface.read, 0));
    surface.swap();
    render();
  };

  try {
    gl.bindVertexArray(vao);
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    Object.entries(SHADERS).forEach(([name, code]) => {
      const fragment = compile(gl.FRAGMENT_SHADER, HEADER + code);
      const value = gl.createProgram();
      if (!value) throw new Error("Footer fluid program unavailable");
      const program = { value, locations: new Map<string, WebGLUniformLocation | null>() };
      programs.set(name as keyof typeof SHADERS, program);
      gl.attachShader(value, vertex);
      gl.attachShader(value, fragment);
      gl.linkProgram(value);
      if (!gl.getProgramParameter(value, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(value) || "Footer fluid program failed");
      }
      gl.deleteShader(fragment);
      shaders.delete(fragment);
    });
    gl.deleteShader(vertex);
    shaders.delete(vertex);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    return { resize, impulse, step, render, readDisplacement, clear, dispose };
  } catch (error) {
    canvas.dataset.fluidError = error instanceof Error ? error.message : "WebGL initialization failed";
    dispose();
    return null;
  }
}
