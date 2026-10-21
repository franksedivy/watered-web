import { SurfaceFoam } from "./foam.js";

// A density pass supports two surface treatments. Optical detail
// is a 2D shading approximation; particle inspection bypasses it completely.
const particleVertex = `#version 300 es
in vec2 position;
in float foam;
flat out float particleFoam;
uniform vec2 size;
uniform float diameter;
flat out float particleId;
void main() {
  vec2 p = position / size * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0, 1);
  gl_PointSize = diameter;
  particleId = float(gl_VertexID);
  particleFoam = foam * mix(0.65, 1.0, fract(particleId * 0.618));
}`;
const particleFragment = `#version 300 es
precision mediump float;
flat in float particleId;
flat in float particleFoam;
uniform int displayMode;
out vec4 color;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  if (displayMode > 0) {
    float radius = length(p);
    float edge = max(fwidth(radius), 0.015);
    float alpha = 1.0 - smoothstep(1.0 - edge, 1.0, radius);
    if (displayMode == 2) {
      alpha *= smoothstep(1.0 - edge * 3.0, 1.0 - edge * 2.0, radius) * 0.2;
      color = vec4(0.25, 0.17, 0.08, alpha);
    } else {
      vec3 fill = mix(vec3(0.9, 0.4, 0.12), vec3(0.97, 0.76, 0.33), fract(particleId * 0.618));
      fill = mix(fill, vec3(0.19, 0.12, 0.07), smoothstep(0.78, 0.9, radius));
      fill = mix(fill, vec3(1.0), 1.0 - smoothstep(0.1, 0.2, radius));
      color = vec4(fill, alpha);
    }
    return;
  }
  float density = max(0.0, exp(-dot(p, p) * 4.0) - 0.018);
  color = vec4(density, density * particleFoam, 0, density);
}`;
const surfaceVertex = `#version 300 es
out vec2 uv;
void main() {
  uv = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(uv * 2.0 - 1.0, 0, 1);
}`;
const surfaceFragment = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D densityMap;
uniform vec2 texel;
uniform int surfaceStyle;
uniform float time;
uniform bool foamEnabled;
uniform float foamDepth;
uniform bool refractionEnabled;
uniform sampler2D iconMap;
uniform vec4 iconRect;
uniform sampler2D creditMap;
uniform vec4 creditRect;
uniform vec3 backdropTop;
uniform vec3 backdropBottom;
uniform vec2 backdropTransform;
out vec4 color;

// Reconstruct the known tank backdrop behind the water. A DOM element cannot
// be sampled by WebGL, so known foreground elements are uploaded as textures.
vec3 backdrop(vec2 point) {
  float progress = clamp((1.0 - point.y) * backdropTransform.x + backdropTransform.y, 0.0, 1.0);
  vec3 sky = mix(backdropTop, backdropBottom, progress);
  vec2 iconUV = (point - iconRect.xy) / max(iconRect.zw, vec2(0.0001));
  float inside = step(0.0, iconUV.x) * step(iconUV.x, 1.0)
    * step(0.0, iconUV.y) * step(iconUV.y, 1.0);
  vec4 icon = texture(iconMap, clamp(iconUV, 0.0, 1.0));
  sky = mix(sky, icon.rgb, icon.a * inside);
  vec2 creditUV = (point - creditRect.xy) / max(creditRect.zw, vec2(0.0001));
  float withinCredit = step(0.0, creditUV.x) * step(creditUV.x, 1.0)
    * step(0.0, creditUV.y) * step(creditUV.y, 1.0);
  vec4 credit = texture(creditMap, clamp(creditUV, 0.0, 1.0));
  return mix(sky, credit.rgb, credit.a * withinCredit);
}

// One family of nearly parallel shafts enters from the upper left. Stable
// per-shaft variation avoids a regular comb without forming intersecting webs.
float lightHash(vec2 p) {
  vec3 h = fract(vec3(p.xyx) * 0.1031);
  h += dot(h, h.yzx + 33.33);
  return fract((h.x + h.y) * h.z);
}
float lightField(vec2 p) {
  float across = (p.x + p.y * 0.42) * 6.0 + sin(time * 0.11) * 0.035;
  float cell = floor(across);
  float beams = 0.0;
  for (int i = -1; i <= 1; i++) {
    float id = cell + float(i);
    float seed = lightHash(vec2(id, 4.7));
    float centre = id + mix(0.14, 0.86, seed)
      + sin(time * (0.09 + seed * 0.04) + seed * 14.0) * 0.025;
    float width = mix(0.035, 0.12, lightHash(vec2(id, 9.3)));
    float distance = (across - centre) / width;
    float core = exp(-distance * distance * 0.5);
    float halo = exp(-distance * distance * 0.04) * 0.13;
    float strength = mix(0.25, 1.0, lightHash(vec2(id, 18.2)));
    float shimmer = 0.7 + sin(time * 0.17 + seed * 21.0) * 0.3;
    beams += (core + halo) * strength * shimmer;
  }
  return min(1.2, beams) / (1.0 + max(0.0, p.x) * 0.18);
}
void main() {
  float density = texture(densityMap, uv).r;
  float alpha = smoothstep(0.43, 0.53, density);
  float above = texture(densityMap, uv + vec2(0, texel.y * 2.0)).r;
  // Green carries motion-driven particle foam in the existing density pass.
  // An upward density sample confines whitening to the exposed surface band.
  float foam = foamEnabled ? smoothstep(0.015, 0.6, texture(densityMap, uv).g)
    * (1.0 - smoothstep(0.35, 0.8,
      texture(densityMap, uv + vec2(0, texel.y * foamDepth)).r)) : 0.0;
  float rim = smoothstep(0.12, 0.4, density - above);
  vec3 blue = mix(vec3(0.01, 0.33, 0.98), vec3(0.05, 0.79, 1.0), uv.y);
  blue = mix(blue, vec3(0.76, 0.98, 1.0), rim * 0.85);
  if (surfaceStyle == 0) {
    blue = mix(blue, vec3(0.94, 0.99, 1.0), foam * 0.88);
    color = vec4(blue * alpha, alpha);
    return;
  }
  if (alpha == 0.0) {
    color = vec4(0.0);
    return;
  }

  // Estimate the distance to the surface with a bounded upward search. This
  // follows sloshing and droplets rather than assuming a fixed horizontal level.
  float depth = 0.0;
  float stride = 2.0;
  for (int i = 0; i < 13; i++) {
    float sampleY = uv.y + (depth + stride) * texel.y;
    if (sampleY >= 1.0 || texture(densityMap, vec2(uv.x, sampleY)).r < 0.48) {
      // Refine the first crossing so the expanding search does not create
      // horizontal colour bands as its sample spacing grows.
      float low = depth;
      float high = min(depth + stride, (1.0 - uv.y) / texel.y);
      for (int j = 0; j < 6; j++) {
        float middle = (low + high) * 0.5;
        if (texture(densityMap, uv + vec2(0, middle * texel.y)).r >= 0.48) low = middle;
        else high = middle;
      }
      depth = (low + high) * 0.5;
      break;
    }
    depth += stride;
    stride *= 1.4;
  }
  float absorption = 1.0 - exp(-depth / 90.0);
  vec2 gradient = vec2(
    texture(densityMap, uv + vec2(texel.x * 2.0, 0)).r
      - texture(densityMap, uv - vec2(texel.x * 2.0, 0)).r,
    above - texture(densityMap, uv - vec2(0, texel.y * 2.0)).r);
  vec2 world = uv / texel / 400.0;
  vec2 ripple = vec2(
    sin(world.x * 12.0 + world.y * 6.0 - time * 0.8),
    cos(world.y * 15.0 - world.x * 4.0 + time * 0.65));
  vec3 normal = normalize(vec3(-gradient * 3.0 + ripple * 0.035, 1.0));
  vec3 light = normalize(vec3(-0.35, 0.65, 0.7));
  vec3 halfLight = normalize(light + vec3(0, 0, 1));
  float specular = pow(max(dot(normal, halfLight), 0.0), 65.0);
  float fresnel = pow(1.0 - max(normal.z, 0.0), 3.0);
  vec2 refracted = world + normal.xy * 0.18 + ripple * 0.008;
  float caustic = lightField(refracted) * exp(-depth / 150.0);
  vec3 water = mix(vec3(0.08, 0.79, 0.95), vec3(0.005, 0.36, 0.7), absorption);
  water += vec3(0.12, 0.3, 0.28) * caustic * 0.32;
  // Soft broad reflected light plus a narrow meniscus, leaving the body clear.
  water += vec3(0.65, 0.86, 0.95) * specular * 0.48;
  water = mix(water, vec3(0.77, 0.94, 0.98), min(0.7, rim * 0.68 + fresnel * 0.28));
  water = mix(water, vec3(0.94, 0.99, 1.0), foam * 0.88);
  float opacity = alpha * mix(mix(0.8, 0.96, absorption), 0.98, foam);
  if (refractionEnabled) {
    vec2 pixels = uv / texel;
    // Small travelling horizontal bands suggest the broken outlines seen
    // through rippling water. Scale displacement to the reference icon.
    float amplitude = min(3.5, iconRect.z / texel.x * 0.04);
    vec2 wobble = vec2(
      sin(pixels.y * 0.16 + sin(pixels.x * 0.025 + time * 0.7) - time * 1.5),
      cos(pixels.x * 0.065 + pixels.y * 0.075 - time * 0.9) * 0.35);
    vec2 offset = (wobble + normal.xy * 1.2) * amplitude * texel;
    vec3 behind = backdrop(clamp(uv + offset, vec2(0.0), vec2(1.0)));
    float tint = opacity / max(alpha, 0.0001);
    // Replace the covered backdrop, rather than layering a displaced icon on
    // top of the original and leaving a second, undistorted outline beneath it.
    color = vec4(mix(behind, water, tint) * alpha, alpha);
  } else {
    color = vec4(water * opacity, opacity);
  }
}`;

function program(gl, vertex, fragment) {
  const result = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    gl.attachShader(result, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(result);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(result));
  }
  return result;
}

export class FluidRenderer {
  constructor(canvas, capacity, referenceImage) {
    this.canvas = canvas;
    this.time = 0;
    this.surfaceStyle = "abstract";
    this.showFoam = true;
    this.showRefraction = true;
    this.referenceRect = [0, 0, 0, 0];
    this.creditRect = [0, 0, 0, 0];
    this.backdropTop = [181 / 255, 223 / 255, 238 / 255];
    this.backdropBottom = [226 / 255, 244 / 255, 251 / 255];
    this.backdropTransform = [1, 0];
    this.foam = new SurfaceFoam(capacity);
    this.positions = new Float32Array(capacity * 2);
    this.gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false });
    if (!this.gl) {
      this.context = canvas.getContext("2d");
      if (!this.context) throw new Error("No canvas renderer available.");
      this.baseBackend = "Canvas 2D particles";
      return;
    }
    this.baseBackend = "WebGL2 surface";
    const gl = this.gl;
    this.particles = program(gl, particleVertex, particleFragment);
    this.surface = program(gl, surfaceVertex, surfaceFragment);
    this.buffer = gl.createBuffer();
    this.vertexArray = gl.createVertexArray();
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions.byteLength, gl.DYNAMIC_DRAW);
    const location = gl.getAttribLocation(this.particles, "position");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    this.foamBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.foamBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.foam.values.byteLength, gl.DYNAMIC_DRAW);
    const foamLocation = gl.getAttribLocation(this.particles, "foam");
    gl.enableVertexAttribArray(foamLocation);
    gl.vertexAttribPointer(foamLocation, 1, gl.FLOAT, false, 0, 0);
    this.emptyArray = gl.createVertexArray();
    this.locations = {
      size: gl.getUniformLocation(this.particles, "size"),
      displayMode: gl.getUniformLocation(this.particles, "displayMode"),
      diameter: gl.getUniformLocation(this.particles, "diameter"),
      texel: gl.getUniformLocation(this.surface, "texel"),
      surfaceStyle: gl.getUniformLocation(this.surface, "surfaceStyle"),
      time: gl.getUniformLocation(this.surface, "time"),
      foamEnabled: gl.getUniformLocation(this.surface, "foamEnabled"),
      foamDepth: gl.getUniformLocation(this.surface, "foamDepth"),
      refractionEnabled: gl.getUniformLocation(this.surface, "refractionEnabled"),
      iconMap: gl.getUniformLocation(this.surface, "iconMap"),
      iconRect: gl.getUniformLocation(this.surface, "iconRect"),
      creditMap: gl.getUniformLocation(this.surface, "creditMap"),
      creditRect: gl.getUniformLocation(this.surface, "creditRect"),
      backdropTop: gl.getUniformLocation(this.surface, "backdropTop"),
      backdropBottom: gl.getUniformLocation(this.surface, "backdropBottom"),
      backdropTransform: gl.getUniformLocation(this.surface, "backdropTransform"),
    };
    this.maximumPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
    this.iconTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.iconTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.hasReferenceImage = Boolean(referenceImage?.complete && referenceImage.naturalWidth);
    if (this.hasReferenceImage) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, referenceImage);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array(4));
    }
    this.creditTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.creditTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array(4));
    gl.activeTexture(gl.TEXTURE0);
  }

  // Upload on layout changes, never during the animation loop.
  setCreditBackdrop({ source, rect }) {
    const gl = this.gl;
    if (!gl) return;
    this.creditRect = rect;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.creditTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE0);
  }

  get backend() {
    if (this.particleView) return `${this.gl ? "WebGL2" : "Canvas 2D"} particle view`;
    return this.gl && this.surfaceStyle === "realistic" ? "WebGL2 light & depth" : this.baseBackend;
  }

  clearFoam() {
    this.foam.clear();
  }

  advance(dt, engine) {
    // Advance only alongside physics: Pause, calm mode and suspension freeze it.
    this.time = (this.time + dt) % 3600;
    this.foam.update(engine, dt);
  }

  // The raw view changes only drawing. It never changes engine positions,
  // velocities, radii, stepping or particle count.
  drawRaw(engine) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.particles);
    gl.uniform2f(this.locations.size, engine.width, engine.height);
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions.subarray(0, engine.count * 2));
    const circles = (radius, mode) => {
      gl.uniform1i(this.locations.displayMode, mode);
      gl.uniform1f(this.locations.diameter,
        Math.min(this.maximumPointSize, radius * 2 * this.canvas.width / engine.width));
      gl.drawArrays(gl.POINTS, 0, engine.count);
    };
    if (this.showInteractionRadius && engine.smoothingRadius) circles(engine.smoothingRadius, 2);
    circles(3 * (engine.particleScale || 1), 1);
  }

  resize(width, height) {
    // Limit the density pass to one pixel per CSS pixel, regardless of Retina DPR.
    this.canvas.width = Math.max(1, Math.round(width));
    this.canvas.height = Math.max(1, Math.round(height));
    if (!this.gl) return;
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.target) gl.deleteFramebuffer(this.target);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.canvas.width, this.canvas.height,
      0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this.target = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Water render target unavailable.");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(engine) {
    if (!this.gl) {
      const ctx = this.context;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.scale(this.canvas.width / engine.width, this.canvas.height / engine.height);
      if (this.particleView) {
        const radius = 3 * (engine.particleScale || 1);
        ctx.lineWidth = engine.width / this.canvas.width;
        if (this.showInteractionRadius && engine.smoothingRadius) {
          ctx.strokeStyle = "rgb(64 43 20 / 20%)";
          ctx.beginPath();
          for (let i = 0; i < engine.count; i++) {
            ctx.moveTo(engine.x[i] + engine.smoothingRadius, engine.y[i]);
            ctx.arc(engine.x[i], engine.y[i], engine.smoothingRadius, 0, Math.PI * 2);
          }
          ctx.stroke();
        }
        for (let i = 0; i < engine.count; i++) {
          ctx.fillStyle = i % 2 ? "#edaa40" : "#e66b24";
          ctx.strokeStyle = "#402b14";
          ctx.beginPath();
          ctx.arc(engine.x[i], engine.y[i], radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      ctx.fillStyle = "#078cf5";
      ctx.beginPath();
      for (let i = 0; i < engine.count; i++) {
        ctx.moveTo(engine.x[i] + 8 * (engine.particleScale || 1), engine.y[i]);
        ctx.arc(engine.x[i], engine.y[i], 8 * (engine.particleScale || 1), 0, Math.PI * 2);
      }
      ctx.fill();
      if (this.showFoam) {
        ctx.fillStyle = "#effcff";
        for (let i = 0; i < engine.count; i++) {
          if (this.foam.values[i] < 0.02) continue;
          ctx.globalAlpha = this.foam.values[i] * 0.88;
          ctx.beginPath();
          ctx.arc(engine.x[i], engine.y[i], 7 * (engine.particleScale || 1), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      return;
    }
    const gl = this.gl;
    for (let i = 0; i < engine.count; i++) {
      this.positions[i * 2] = engine.x[i];
      this.positions[i * 2 + 1] = engine.y[i];
    }
    if (this.particleView) {
      this.drawRaw(engine);
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.target);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.particles);
    gl.uniform1i(this.locations.displayMode, 0);
    gl.uniform2f(this.locations.size, engine.width, engine.height);
    gl.uniform1f(this.locations.diameter,
      Math.min(this.maximumPointSize, 32 * (engine.particleScale || 1) * this.canvas.width / engine.width));
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions.subarray(0, engine.count * 2));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.foamBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.foam.values.subarray(0, engine.count));
    // Unbind the sampled texture while writing to it (no framebuffer feedback).
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.drawArrays(gl.POINTS, 0, engine.count);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.surface);
    gl.uniform2f(this.locations.texel, 1 / this.canvas.width, 1 / this.canvas.height);
    gl.uniform1i(this.locations.surfaceStyle, this.surfaceStyle === "realistic" ? 1 : 0);
    gl.uniform1f(this.locations.time, this.time);
    gl.uniform1i(this.locations.foamEnabled, this.showFoam ? 1 : 0);
    gl.uniform1f(this.locations.foamDepth,
      9 * (engine.particleScale || 1) * this.canvas.width / engine.width);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.locations.refractionEnabled,
      this.showRefraction && this.hasReferenceImage ? 1 : 0);
    gl.uniform4fv(this.locations.iconRect, this.referenceRect);
    gl.uniform3fv(this.locations.backdropTop, this.backdropTop);
    gl.uniform3fv(this.locations.backdropBottom, this.backdropBottom);
    gl.uniform2fv(this.locations.backdropTransform, this.backdropTransform);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.iconTexture);
    gl.uniform1i(this.locations.iconMap, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.creditTexture);
    gl.uniform1i(this.locations.creditMap, 2);
    gl.uniform4fv(this.locations.creditRect, this.creditRect);
    // Keep the density texture on the active unit for resize and the next pass.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(this.emptyArray);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    gl.deleteTexture(this.texture);
    gl.deleteTexture(this.iconTexture);
    gl.deleteTexture(this.creditTexture);
    gl.deleteFramebuffer(this.target);
    gl.deleteBuffer(this.buffer);
    gl.deleteBuffer(this.foamBuffer);
    gl.deleteVertexArray(this.vertexArray);
    gl.deleteVertexArray(this.emptyArray);
    gl.deleteProgram(this.particles);
    gl.deleteProgram(this.surface);
  }

}
