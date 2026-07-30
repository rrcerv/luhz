import { useEffect, useRef } from 'react';
import styles from './ShowcaseBackground.module.css';

/*
 * Curl-noise flow field with a feedback trail. Particles are advected by a
 * divergence-free velocity field (the curl of an evolving noise potential), so
 * they drift like ink in water — filaments, eddies and slow vortices that
 * continuously form and dissolve, with no attractor points to collapse into.
 *
 * The trail is a ping-pong framebuffer: each frame the previous frame is
 * redrawn slightly faded and the particles are stamped on top, so they paint
 * onto the screen and the paint decays. The buffer stores a colorless "ink"
 * amount and the theme color is applied at composite time, so flipping the
 * theme recolors the whole existing trail at once.
 */

// ---------------------------------------------------------------------------
// TUNING — overall pace.
//   FLOW_SPEED scales simulation time: the field's evolution and the particle
//   motion slow down or speed up together.
//     1.0 = default,  < 1 = calmer/slower,  > 1 = livelier/faster.
//   e.g. 0.4 = very calm, 0.5 = calm (current), 1.0 = default, 1.6 = energetic.
// ---------------------------------------------------------------------------
const FLOW_SPEED = 0.5;

// ---------------------------------------------------------------------------
// TUNING — character of the flow.
//   FIELD_SCALE    size of the eddies. Lower = big sweeping currents,
//                  higher = many small swirls. (1.5 broad … 4 busy)
//   FIELD_EVOLVE   how fast the field itself morphs into new shapes.
//                  Lower = the same currents persist longer.
//   FLOW_STRENGTH  how fast particles travel along the field.
//   WANDER         tiny random jitter so the drift never looks mechanical.
// ---------------------------------------------------------------------------
const FIELD_SCALE = 2.2;
const FIELD_EVOLVE = 0.12;
const FLOW_STRENGTH = 0.12;
const WANDER = 0.012;

// ---------------------------------------------------------------------------
// TUNING — the painted trail.
//   TRAIL_FADE  how fast the trail fades, per second. Lower = longer, more
//               painterly smears; higher = shorter, crisper tails.
//               e.g. 0.5 = long ribbons, 1.2 = medium (current), 3 = short tail.
//   INK         how much each particle deposits per frame. Because deposits
//               accumulate, small values still build up along a path.
// ---------------------------------------------------------------------------
const TRAIL_FADE = 0.5;
const INK = 0.25;

// ---------------------------------------------------------------------------
// TUNING — keep-clear zones around the content.
//   Any element marked `data-repel` inside the section pushes particles away,
//   so the copy stays legible. Rects are measured from the live DOM (and
//   re-measured on resize / reflow / language change), so this is automatically
//   correct on mobile and desktop.
//     REPEL_MARGIN    how far out the push reaches, in units of half the canvas
//                     height (0.2 ≈ a tenth of the height).
//     REPEL_STRENGTH  how firmly particles are pushed out.
// ---------------------------------------------------------------------------
const REPEL_SELECTOR = '[data-repel]';
const REPEL_MARGIN = 0.5;
const REPEL_STRENGTH = 0.35;

// Resolution of the vector field the particles sample (bilinearly interpolated)
const GRID_W = 60;
const GRID_H = 38;

/* Fast 3D value noise — the potential the flow field is derived from. */
function hash3(i, j, k) {
  let n =
    (Math.imul(i, 374761393) +
      Math.imul(j, 668265263) +
      Math.imul(k, 1274126177)) |
    0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function fade(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise3(x, y, z) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const ux = fade(x - i);
  const uy = fade(y - j);
  const uz = fade(z - k);

  const c000 = hash3(i, j, k);
  const c100 = hash3(i + 1, j, k);
  const c010 = hash3(i, j + 1, k);
  const c110 = hash3(i + 1, j + 1, k);
  const c001 = hash3(i, j, k + 1);
  const c101 = hash3(i + 1, j, k + 1);
  const c011 = hash3(i, j + 1, k + 1);
  const c111 = hash3(i + 1, j + 1, k + 1);

  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;
  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}

// ---------------------------------------------------------------------------
// TUNING — per-theme look. Dark particles on a light background read weaker
//   than bright particles on a dark background, so light mode can use more
//   opacity + slightly larger points to match the perceived contrast.
//     size  = point diameter in CSS px      (bigger = more visible)
//     alpha = opacity of the composited ink (higher = stronger contrast)
// ---------------------------------------------------------------------------
const LOOK = {
  dark: { size: 2.0, alpha: 0.6 },
  light: { size: 2.4, alpha: 0.6 },
};

const PARTICLE_VERT = `
  attribute vec2 aPos;
  attribute vec2 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vTwinkle;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
    gl_PointSize = uSize * uPixelRatio;
    vTwinkle = 0.55 + 0.45 * sin(uTime * 2.0 + aSeed.x * 10.0);
  }
`;

/* Particles deposit colorless ink into the trail buffer (additive blending). */
const PARTICLE_FRAG = `
  precision mediump float;
  uniform float uInk;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float disc = smoothstep(0.5, 0.22, length(c));
    float ink = disc * uInk * vTwinkle;
    gl_FragColor = vec4(ink, ink, ink, ink);
  }
`;

const QUAD_VERT = `
  attribute vec2 aQuad;
  varying vec2 vUv;
  void main() {
    vUv = aQuad * 0.5 + 0.5;
    gl_Position = vec4(aQuad, 0.0, 1.0);
  }
`;

/*
 * Redraws the previous frame at reduced strength — this is the fade-out.
 * The extra subtraction matters: the trail buffer is 8-bit, so multiplying
 * alone stalls at 1/255 (it rounds back to itself) and leaves a permanent
 * haze. Subtracting a floor guarantees the trail reaches zero.
 */
const FADE_FRAG = `
  precision mediump float;
  uniform sampler2D uTex;
  uniform float uDecay;
  varying vec2 vUv;
  void main() {
    vec4 faded = texture2D(uTex, vUv) * uDecay - 1.2 / 255.0;
    gl_FragColor = max(faded, vec4(0.0));
  }
`;

/* Tints the accumulated ink with the current theme color. */
const COMPOSITE_FRAG = `
  precision mediump float;
  uniform sampler2D uTex;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float ink = texture2D(uTex, vUv).r;
    gl_FragColor = vec4(uColor, min(1.0, ink) * uIntensity);
  }
`;

export default function ShowcaseBackground() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const glOpts = { alpha: true, antialias: false, premultipliedAlpha: false };
    const gl =
      canvas.getContext('webgl', glOpts) ||
      canvas.getContext('experimental-webgl', glOpts);
    if (!gl) return undefined;

    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    const link = (vertSrc, fragSrc, label) => {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertSrc));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSrc));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(`ShowcaseBackground ${label} link error:`, gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    };

    const particleProgram = link(PARTICLE_VERT, PARTICLE_FRAG, 'particle');
    const fadeProgram = link(QUAD_VERT, FADE_FRAG, 'fade');
    const compositeProgram = link(QUAD_VERT, COMPOSITE_FRAG, 'composite');
    if (!particleProgram || !fadeProgram || !compositeProgram) return undefined;

    const P = {
      pos: gl.getAttribLocation(particleProgram, 'aPos'),
      seed: gl.getAttribLocation(particleProgram, 'aSeed'),
      time: gl.getUniformLocation(particleProgram, 'uTime'),
      pixelRatio: gl.getUniformLocation(particleProgram, 'uPixelRatio'),
      size: gl.getUniformLocation(particleProgram, 'uSize'),
      ink: gl.getUniformLocation(particleProgram, 'uInk'),
    };
    const F = {
      quad: gl.getAttribLocation(fadeProgram, 'aQuad'),
      tex: gl.getUniformLocation(fadeProgram, 'uTex'),
      decay: gl.getUniformLocation(fadeProgram, 'uDecay'),
    };
    const C = {
      quad: gl.getAttribLocation(compositeProgram, 'aQuad'),
      tex: gl.getUniformLocation(compositeProgram, 'uTex'),
      color: gl.getUniformLocation(compositeProgram, 'uColor'),
      intensity: gl.getUniformLocation(compositeProgram, 'uIntensity'),
    };

    const posBuffer = gl.createBuffer();
    const seedBuffer = gl.createBuffer();
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    // Ping-pong render targets holding the trail
    let targets = [];
    const createTarget = (w, h) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { texture, framebuffer };
    };
    const disposeTargets = () => {
      targets.forEach(({ texture, framebuffer }) => {
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(framebuffer);
      });
      targets = [];
    };

    // Colors via a probe so CSS var chains collapse; re-read on theme change
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(probe);
    let color = [1, 0.85, 0.55];
    const readColor = () => {
      probe.style.color = 'var(--color-particle)';
      const parts = getComputedStyle(probe).color.match(/[\d.]+/g);
      if (parts) color = [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    };
    readColor();

    const readLook = () =>
      LOOK[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
    let look = readLook();

    // Particle state
    let count = 0;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let posArray = new Float32Array(0);
    let dpr = 1;
    let aspect = 1;
    let width = 0;
    let height = 0;

    /*
     * Keep-clear zones, measured from the live DOM so they follow the real
     * layout at any breakpoint. Rects are expressed in the same -1..1 space the
     * particles live in, relative to this canvas.
     */
    let zones = [];
    function measureZones() {
      const host = wrap.parentElement;
      if (!host) return;
      const base = wrap.getBoundingClientRect();
      if (!base.width || !base.height) return;
      const next = [];
      host.querySelectorAll(REPEL_SELECTOR).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const x0 = ((r.left - base.left) / base.width) * 2 - 1;
        const x1 = ((r.right - base.left) / base.width) * 2 - 1;
        const yTop = 1 - ((r.top - base.top) / base.height) * 2;
        const yBottom = 1 - ((r.bottom - base.top) / base.height) * 2;
        next.push({
          cx: (x0 + x1) / 2,
          cy: (yTop + yBottom) / 2,
          hx: Math.abs(x1 - x0) / 2,
          hy: Math.abs(yTop - yBottom) / 2,
        });
      });
      zones = next;
    }

    // Flow field: noise potential + the velocity field derived from its curl
    const potential = new Float32Array(GRID_W * GRID_H);
    const fieldX = new Float32Array(GRID_W * GRID_H);
    const fieldY = new Float32Array(GRID_W * GRID_H);
    const stepX = 2 / (GRID_W - 1);
    const stepY = 2 / (GRID_H - 1);

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      if (!cssW || !cssH) return;
      width = Math.floor(cssW * dpr);
      height = Math.floor(cssH * dpr);
      canvas.width = width;
      canvas.height = height;
      aspect = width / height;

      disposeTargets();
      targets = [createTarget(width, height), createTarget(width, height)];

      count = Math.max(100, Math.min(100, Math.floor((cssW * cssH) / 1300)));
      px = new Float32Array(count);
      py = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      posArray = new Float32Array(count * 2);
      const seed = new Float32Array(count * 2);
      for (let i = 0; i < count; i += 1) {
        px[i] = Math.random() * 2 - 1;
        py[i] = Math.random() * 2 - 1;
        posArray[i * 2] = px[i];
        posArray[i * 2 + 1] = py[i];
        seed[i * 2] = Math.random();
        seed[i * 2 + 1] = Math.random();
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, posArray, gl.DYNAMIC_DRAW);

      measureZones();
    }

    // Rebuild the velocity field: sample the noise potential, then take its
    // curl (v = ∂ψ/∂y, -∂ψ/∂x). Curl fields are divergence-free, so particles
    // swirl and stream instead of piling up.
    function updateField(time) {
      const z = time * FIELD_EVOLVE;
      for (let j = 0; j < GRID_H; j += 1) {
        const ny = (j / (GRID_H - 1)) * 2 - 1;
        for (let i = 0; i < GRID_W; i += 1) {
          const nx = (i / (GRID_W - 1)) * 2 - 1;
          // aspect-corrected sampling so eddies stay round on screen
          potential[j * GRID_W + i] = valueNoise3(
            nx * aspect * FIELD_SCALE,
            ny * FIELD_SCALE,
            z
          );
        }
      }

      for (let j = 0; j < GRID_H; j += 1) {
        const jm = j > 0 ? j - 1 : 0;
        const jp = j < GRID_H - 1 ? j + 1 : GRID_H - 1;
        const dy = (jp - jm) * stepY;
        for (let i = 0; i < GRID_W; i += 1) {
          const im = i > 0 ? i - 1 : 0;
          const ip = i < GRID_W - 1 ? i + 1 : GRID_W - 1;
          const dx = (ip - im) * stepX;
          const idx = j * GRID_W + i;
          fieldX[idx] =
            (potential[jp * GRID_W + i] - potential[jm * GRID_W + i]) / dy;
          fieldY[idx] =
            -(potential[j * GRID_W + ip] - potential[j * GRID_W + im]) / dx;
        }
      }
    }

    function step(dt, time) {
      updateField(time);

      const ease = Math.min(1, dt * 2.5); // inertia toward the field velocity
      for (let i = 0; i < count; i += 1) {
        // Bilinear sample of the flow field at the particle position
        let gx = ((px[i] + 1) / 2) * (GRID_W - 1);
        let gy = ((py[i] + 1) / 2) * (GRID_H - 1);
        gx = gx < 0 ? 0 : gx > GRID_W - 1 ? GRID_W - 1 : gx;
        gy = gy < 0 ? 0 : gy > GRID_H - 1 ? GRID_H - 1 : gy;
        const i0 = Math.floor(gx);
        const j0 = Math.floor(gy);
        const i1 = i0 < GRID_W - 1 ? i0 + 1 : i0;
        const j1 = j0 < GRID_H - 1 ? j0 + 1 : j0;
        const tx = gx - i0;
        const ty = gy - j0;
        const a = j0 * GRID_W + i0;
        const b = j0 * GRID_W + i1;
        const c = j1 * GRID_W + i0;
        const d = j1 * GRID_W + i1;
        const fx =
          (fieldX[a] + (fieldX[b] - fieldX[a]) * tx) * (1 - ty) +
          (fieldX[c] + (fieldX[d] - fieldX[c]) * tx) * ty;
        const fy =
          (fieldY[a] + (fieldY[b] - fieldY[a]) * tx) * (1 - ty) +
          (fieldY[c] + (fieldY[d] - fieldY[c]) * tx) * ty;

        // Ease toward the field velocity
        vx[i] += (fx * FLOW_STRENGTH - vx[i]) * ease;
        vy[i] += (fy * FLOW_STRENGTH - vy[i]) * ease;

        // Push out of the keep-clear zones. Applied at integration time (not
        // to the stored velocity) so the flow field can never cancel it out.
        let rx = 0;
        let ry = 0;
        for (let z = 0; z < zones.length; z += 1) {
          const zone = zones[z];
          // work in aspect-corrected units so the margin looks even on screen
          const sx = (px[i] - zone.cx) * aspect;
          const sy = py[i] - zone.cy;
          const gapX = Math.abs(sx) - zone.hx * aspect;
          const gapY = Math.abs(sy) - zone.hy;
          if (gapX > REPEL_MARGIN || gapY > REPEL_MARGIN) continue;

          // Distance to the rectangle, with the outward direction
          let nx;
          let ny;
          let dist;
          if (gapX > 0 && gapY > 0) {
            dist = Math.sqrt(gapX * gapX + gapY * gapY);
            if (dist > REPEL_MARGIN) continue;
            nx = (sx < 0 ? -gapX : gapX) / dist;
            ny = (sy < 0 ? -gapY : gapY) / dist;
          } else if (gapX > gapY) {
            dist = gapX;
            nx = sx < 0 ? -1 : 1;
            ny = 0;
          } else {
            dist = gapY;
            nx = 0;
            ny = sy < 0 ? -1 : 1;
          }

          // Full force inside the rect, easing off toward the margin
          let strength;
          if (dist < 0) {
            strength = 1.5;
          } else {
            const t = 1 - dist / REPEL_MARGIN;
            strength = t * t;
          }
          rx += (nx / aspect) * strength * REPEL_STRENGTH;
          ry += ny * strength * REPEL_STRENGTH;
        }

        // Integrate, adding the push and a little wander
        px[i] += (vx[i] + rx + (Math.random() - 0.5) * WANDER) * dt;
        py[i] += (vy[i] + ry + (Math.random() - 0.5) * WANDER) * dt;

        // Wrap around the edges so the field keeps an even density
        if (px[i] > 1.02) px[i] -= 2.04;
        else if (px[i] < -1.02) px[i] += 2.04;
        if (py[i] > 1.02) py[i] -= 2.04;
        else if (py[i] < -1.02) py[i] += 2.04;

        posArray[i * 2] = px[i];
        posArray[i * 2 + 1] = py[i];
      }
    }

    function drawQuad(attrib) {
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(attrib);
      gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function draw(dt, time) {
      if (!count || targets.length < 2) return;
      const [src, dst] = targets;

      // 1. Fade the previous frame into the new target — the trail decay
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
      gl.viewport(0, 0, width, height);
      gl.disable(gl.BLEND);
      gl.useProgram(fadeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.texture);
      gl.uniform1i(F.tex, 0);
      gl.uniform1f(F.decay, Math.exp(-TRAIL_FADE * dt));
      drawQuad(F.quad);

      // 2. Stamp the particles on top, adding ink
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(particleProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, posArray);
      gl.enableVertexAttribArray(P.pos);
      gl.vertexAttribPointer(P.pos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
      gl.enableVertexAttribArray(P.seed);
      gl.vertexAttribPointer(P.seed, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(P.time, time);
      gl.uniform1f(P.pixelRatio, dpr);
      gl.uniform1f(P.size, look.size);
      gl.uniform1f(P.ink, INK);
      gl.drawArrays(gl.POINTS, 0, count);

      // 3. Composite the accumulated ink to the screen in the theme color
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(compositeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dst.texture);
      gl.uniform1i(C.tex, 0);
      gl.uniform3f(C.color, color[0], color[1], color[2]);
      gl.uniform1f(C.intensity, look.alpha);
      drawQuad(C.quad);

      targets = [dst, src];
    }

    let time = 0;
    let last = performance.now();
    let sinceMeasure = 0;
    let raf = 0;
    function frame(now) {
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Cheap periodic re-measure: catches movement a ResizeObserver misses,
      // such as the section's GSAP reveal transform settling.
      sinceMeasure += real;
      if (sinceMeasure > 0.5) {
        sinceMeasure = 0;
        measureZones();
      }

      // Scale simulation time by FLOW_SPEED so one knob controls the whole pace
      const dt = real * FLOW_SPEED;
      time += dt;
      step(dt, time);
      draw(real, time);
      raf = requestAnimationFrame(frame);
    }

    const start = () => {
      if (!raf && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    let lastW = 0;
    let lastH = 0;
    const resizeObserver = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return;
      lastW = w;
      lastH = h;
      build();
      if (reduce) draw(1 / 60, 0);
    });
    resizeObserver.observe(wrap);

    // Re-measure whenever a keep-clear element changes size or moves — covers
    // reflow, font loading, breakpoint changes and language switches.
    const zoneObserver = new ResizeObserver(() => measureZones());
    const host = wrap.parentElement;
    if (host) {
      host.querySelectorAll(REPEL_SELECTOR).forEach((el) => zoneObserver.observe(el));
    }

    const themeObserver = new MutationObserver(() => {
      readColor();
      look = readLook();
      if (reduce) draw(1 / 60, 0);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    lastW = wrap.clientWidth;
    lastH = wrap.clientHeight;
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    let disposed = false;
    let viewObserver;
    fontsReady.then(() => {
      if (disposed) return;
      build();
      if (reduce) {
        draw(1 / 60, 0);
        return;
      }
      viewObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      });
      viewObserver.observe(wrap);
    });

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      zoneObserver.disconnect();
      themeObserver.disconnect();
      if (viewObserver) viewObserver.disconnect();
      probe.remove();
      disposeTargets();
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(seedBuffer);
      gl.deleteBuffer(quadBuffer);
      gl.deleteProgram(particleProgram);
      gl.deleteProgram(fadeProgram);
      gl.deleteProgram(compositeProgram);
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
