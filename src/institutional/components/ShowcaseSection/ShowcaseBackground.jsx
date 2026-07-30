import { useEffect, useRef } from 'react';
import styles from './ShowcaseBackground.module.css';

/*
 * Curl-noise flow field. Particles are advected by a divergence-free velocity
 * field (the curl of an evolving noise potential), so they drift like ink in
 * water — filaments, eddies and slow vortices that continuously form and
 * dissolve, with no attractor points to collapse into.
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
//   than bright particles on a dark background, so light mode uses more
//   opacity + slightly larger points to match the perceived contrast.
//     size  = point diameter in CSS px      (bigger = more visible)
//     alpha = peak opacity of a particle    (higher = stronger contrast)
// ---------------------------------------------------------------------------
const LOOK = {
  dark: { size: 3.0, alpha: 0.6 },
  light: { size: 3.4, alpha: 0.6 },
};

const VERTEX_SRC = `
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

const FRAGMENT_SRC = `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float disc = smoothstep(0.5, 0.22, length(c));
    gl_FragColor = vec4(uColor, disc * uAlpha * vTwinkle);
  }
`;

export default function ShowcaseBackground() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const glOpts = { alpha: true, antialias: true, premultipliedAlpha: false };
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

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SRC));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('ShowcaseBackground link error:', gl.getProgramInfoLog(program));
      return undefined;
    }
    gl.useProgram(program);

    const A = {
      pos: gl.getAttribLocation(program, 'aPos'),
      seed: gl.getAttribLocation(program, 'aSeed'),
    };
    const U = {
      time: gl.getUniformLocation(program, 'uTime'),
      pixelRatio: gl.getUniformLocation(program, 'uPixelRatio'),
      size: gl.getUniformLocation(program, 'uSize'),
      color: gl.getUniformLocation(program, 'uColor'),
      alpha: gl.getUniformLocation(program, 'uAlpha'),
    };

    const posBuffer = gl.createBuffer();
    const seedBuffer = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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
      const W = Math.floor(cssW * dpr);
      const H = Math.floor(cssH * dpr);
      canvas.width = W;
      canvas.height = H;
      gl.viewport(0, 0, W, H);
      aspect = W / H;

      count = Math.max(500, Math.min(1500, Math.floor((cssW * cssH) / 1300)));
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

        // Ease toward the field velocity, then add a little wander
        vx[i] += (fx * FLOW_STRENGTH - vx[i]) * ease;
        vy[i] += (fy * FLOW_STRENGTH - vy[i]) * ease;
        px[i] += (vx[i] + (Math.random() - 0.5) * WANDER) * dt;
        py[i] += (vy[i] + (Math.random() - 0.5) * WANDER) * dt;

        // Wrap around the edges so the field keeps an even density
        if (px[i] > 1.02) px[i] -= 2.04;
        else if (px[i] < -1.02) px[i] += 2.04;
        if (py[i] > 1.02) py[i] -= 2.04;
        else if (py[i] < -1.02) py[i] += 2.04;

        posArray[i * 2] = px[i];
        posArray[i * 2 + 1] = py[i];
      }
    }

    function draw(time) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!count) return;

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, posArray);
      gl.enableVertexAttribArray(A.pos);
      gl.vertexAttribPointer(A.pos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
      gl.enableVertexAttribArray(A.seed);
      gl.vertexAttribPointer(A.seed, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(U.time, time);
      gl.uniform1f(U.pixelRatio, dpr);
      gl.uniform1f(U.size, look.size);
      gl.uniform1f(U.alpha, look.alpha);
      gl.uniform3f(U.color, color[0], color[1], color[2]);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    let time = 0;
    let last = performance.now();
    let raf = 0;
    function frame(now) {
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Scale simulation time by FLOW_SPEED so one knob controls the whole pace
      const dt = real * FLOW_SPEED;
      time += dt;
      step(dt, time);
      draw(time);
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
      if (reduce) draw(0);
    });
    resizeObserver.observe(wrap);

    const themeObserver = new MutationObserver(() => {
      readColor();
      look = readLook();
      if (reduce) draw(0);
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
        draw(0);
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
      themeObserver.disconnect();
      if (viewObserver) viewObserver.disconnect();
      probe.remove();
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(seedBuffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
