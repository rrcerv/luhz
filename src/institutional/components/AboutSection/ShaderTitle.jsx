import { useEffect, useRef } from 'react';
import styles from './ShaderTitle.module.css';

const VERTEX_SRC = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

/*
 * Ember-glow title. The word is drawn to a two-tone texture (body color +
 * amber accent). A warm light band sweeps across it continuously (idle motion)
 * and the letters flicker like embers; under the cursor they ignite into a
 * brighter amber bloom with a faint heat shimmer. Distinct from the contact
 * "Luhz" effect, which is a liquid push + chromatic split.
 */
const FRAGMENT_SRC = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uTime;
  uniform vec3 uGlow;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;

    vec2 d = uv - uMouse;
    d.x *= aspect;
    float dist = length(d);
    float glow = exp(-dist * dist * 11.0);

    // Gentle idle undulation so the letters keep drifting at rest
    uv.y += sin(uv.x * 4.0 + uTime * 0.6) * 0.006;
    uv.x += sin(uv.y * 6.0 + uTime * 0.4) * 0.001;

    // Heat shimmer — always a touch, stronger under the cursor
    float shimmer = noise(vec2(uv.y * 20.0, uTime * 1.6)) - 0.5;
    uv.x += shimmer * 0.004 * (0.25 + uHover * glow * 2.5);

    vec4 tex = texture2D(uTex, uv);
    vec3 base = tex.rgb;
    float alpha = tex.a;

    // Travelling warm light band (visible while idle)
    float band = sin(uv.x * 3.2 - uTime * 1.15);
    band = smoothstep(0.55, 1.0, band);

    // Ember flicker
    float ember = 0.82 + 0.18 * noise(vec2(uv.x * 9.0, uTime * 0.9));

    // Cursor ignition
    float ignite = glow * uHover;

    float bright = ember + band * 0.8 + ignite * 1.2;
    vec3 color = base * bright;
    color = mix(color, uGlow, clamp(band * 0.3 + ignite * 0.85, 0.0, 1.0));

    gl_FragColor = vec4(color, alpha);
  }
`;

export default function ShaderTitle({ text, accent }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const glOpts = { alpha: true, premultipliedAlpha: false, antialias: true };
    const gl =
      canvas.getContext('webgl', glOpts) ||
      canvas.getContext('experimental-webgl', glOpts);

    if (!gl) {
      wrap.classList.add(styles.noGL);
      return undefined;
    }

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
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {
      tex: gl.getUniformLocation(program, 'uTex'),
      res: gl.getUniformLocation(program, 'uResolution'),
      mouse: gl.getUniformLocation(program, 'uMouse'),
      hover: gl.getUniformLocation(program, 'uHover'),
      time: gl.getUniformLocation(program, 'uTime'),
      glow: gl.getUniformLocation(program, 'uGlow'),
    };

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.uniform1i(U.tex, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');

    // Colors resolved through a probe so CSS var chains collapse
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(probe);
    const readColorString = (expr) => {
      probe.style.color = expr;
      return getComputedStyle(probe).color;
    };
    const toFloats = (rgbString) => {
      const parts = rgbString.match(/[\d.]+/g);
      if (!parts) return [1, 1, 1];
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    };

    const words = [
      ...text.split(' ').map((w) => ({ w, accent: false })),
      ...accent.split(' ').map((w) => ({ w, accent: true })),
    ];

    let lastWidth = 0;

    function buildTexture() {
      const cssW = wrap.clientWidth;
      if (!cssW) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fontCss = Math.min(50, Math.max(30, window.innerWidth * 0.052));
      const fontPx = fontCss * dpr;
      const lineH = fontPx * 1.18;
      const padY = fontPx * 0.28;
      const W = Math.floor(cssW * dpr);
      const maxLineW = W * 0.98;

      textCtx.font = `700 ${fontPx}px Sora, sans-serif`;
      const spaceW = textCtx.measureText(' ').width;

      // Word wrap
      const lines = [];
      let cur = [];
      let curW = 0;
      words.forEach((item) => {
        const wordW = textCtx.measureText(item.w).width;
        const add = cur.length ? spaceW + wordW : wordW;
        if (cur.length && curW + add > maxLineW) {
          lines.push(cur);
          cur = [item];
          curW = wordW;
        } else {
          cur.push(item);
          curW += add;
        }
      });
      if (cur.length) lines.push(cur);

      const H = Math.ceil(lines.length * lineH + padY * 2);
      canvas.width = W;
      canvas.height = H;
      gl.viewport(0, 0, W, H);
      textCanvas.width = W;
      textCanvas.height = H;

      textCtx.font = `700 ${fontPx}px Sora, sans-serif`;
      textCtx.textBaseline = 'middle';
      const bodyColor = readColorString('var(--color-text)');
      const accentColor = readColorString('var(--color-accent)');

      lines.forEach((line, i) => {
        const widths = line.map((it) => textCtx.measureText(it.w).width);
        const lineW =
          widths.reduce((a, b) => a + b, 0) + spaceW * (line.length - 1);
        let x = (W - lineW) / 2;
        const y = padY + (i + 0.5) * lineH;
        line.forEach((it, j) => {
          textCtx.fillStyle = it.accent ? accentColor : bodyColor;
          textCtx.fillText(it.w, x, y);
          x += widths[j] + spaceW;
        });
      });

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
      gl.uniform2f(U.res, W, H);
    }

    let glow = toFloats(readColorString('var(--brand-amber-300)'));

    // Ambient only — no pointer interaction. Cursor terms stay neutral.
    const mouse = [0.5, 0.5];
    const hover = 0;
    let time = 0;
    let last = performance.now();
    let raf = 0;

    function render() {
      gl.uniform2f(U.mouse, mouse[0], mouse[1]);
      gl.uniform1f(U.hover, hover);
      gl.uniform1f(U.time, time);
      gl.uniform3f(U.glow, glow[0], glow[1], glow[2]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      render();
      raf = requestAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(() => {
      const cssW = wrap.clientWidth;
      if (cssW === lastWidth) return; // ignore height changes we caused
      lastWidth = cssW;
      buildTexture();
      if (reduce) render();
    });
    resizeObserver.observe(wrap);

    const themeObserver = new MutationObserver(() => {
      glow = toFloats(readColorString('var(--brand-amber-300)'));
      buildTexture();
      if (reduce) render();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

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

    let viewObserver;
    let disposed = false;
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
      if (disposed) return;
      lastWidth = wrap.clientWidth;
      buildTexture();
      if (reduce) {
        render();
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
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [text, accent]);

  return (
    <h2 ref={wrapRef} className={styles.title}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <span className={styles.fallback}>
        {text} <span className={styles.fallbackAccent}>{accent}</span>
      </span>
    </h2>
  );
}
