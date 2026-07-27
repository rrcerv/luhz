import { useEffect, useRef } from 'react';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import styles from './LuhzText.module.css';

const WORD = 'Luhz';

const VERTEX_SRC = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

/*
 * The word is a white alpha-mask texture; the shader tints it with the current
 * theme color and warps the UVs toward the cursor (liquid push + wobble + a
 * small chromatic split near the pointer). Inspired by partizan.com/contact.
 */
const FRAGMENT_SRC = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uAccent;

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;

    vec2 d = uv - uMouse;
    d.x *= aspect;
    float dist = length(d);
    float infl = exp(-dist * dist * 16.0) * uHover;
    vec2 dir = d / (dist + 1e-4);
    vec2 push = vec2(dir.x / aspect, dir.y);

    // Liquid displacement away from the cursor
    uv -= push * infl * 0.06;

    // Wobble that only wakes up under the pointer
    float w = 0.006 * uHover;
    uv.x += sin(uv.y * 12.0 + uTime * 1.6) * w;
    uv.y += cos(uv.x * 12.0 + uTime * 1.3) * w;

    // Chromatic split near the cursor
    vec2 off = push * infl * 0.02;
    float aR = texture2D(uTex, uv + off).a;
    float aG = texture2D(uTex, uv).a;
    float aB = texture2D(uTex, uv - off).a;

    float alpha = max(aR, max(aG, aB));
    vec3 color = mix(uColor, uAccent, clamp(aR - aB, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function LuhzText() {
  const { t } = useLanguage();
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
      color: gl.getUniformLocation(program, 'uColor'),
      accent: gl.getUniformLocation(program, 'uAccent'),
    };

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(U.tex, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');

    function buildTexture() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.floor(wrap.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      textCanvas.width = w;
      textCanvas.height = h;

      textCtx.clearRect(0, 0, w, h);
      textCtx.textAlign = 'center';
      textCtx.textBaseline = 'middle';
      let fontSize = h * 0.7;
      textCtx.font = `700 ${fontSize}px Sora, sans-serif`;
      const maxW = w * 0.92;
      const measured = textCtx.measureText(WORD).width;
      if (measured > maxW) {
        fontSize *= maxW / measured;
        textCtx.font = `700 ${fontSize}px Sora, sans-serif`;
      }
      textCtx.fillStyle = '#ffffff';
      textCtx.fillText(WORD, w / 2, h * 0.54);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
      gl.uniform2f(U.res, w, h);
    }

    // Resolve theme colors through a probe so CSS var chains fully collapse
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(probe);
    let color = [0.95, 0.94, 0.9];
    let accent = [1, 0.76, 0.3];
    const readColor = (expr) => {
      probe.style.color = expr;
      const parts = getComputedStyle(probe).color.match(/[\d.]+/g);
      if (!parts) return [1, 1, 1];
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    };
    const readColors = () => {
      color = readColor('var(--color-text)');
      accent = readColor('var(--color-accent)');
    };
    readColors();

    const mouse = [0.5, 0.55];
    const target = [0.5, 0.55];
    let hover = 0;
    let hoverTarget = 0;
    let time = 0;
    let last = performance.now();
    let raf = 0;

    function render() {
      gl.uniform2f(U.mouse, mouse[0], mouse[1]);
      gl.uniform1f(U.hover, hover);
      gl.uniform1f(U.time, time);
      gl.uniform3f(U.color, color[0], color[1], color[2]);
      gl.uniform3f(U.accent, accent[0], accent[1], accent[2]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      mouse[0] += (target[0] - mouse[0]) * Math.min(1, dt * 8);
      mouse[1] += (target[1] - mouse[1]) * Math.min(1, dt * 8);
      hover += (hoverTarget - hover) * Math.min(1, dt * 6);
      render();
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      target[0] = (e.clientX - rect.left) / rect.width;
      target[1] = 1 - (e.clientY - rect.top) / rect.height;
    };
    const onEnter = () => {
      hoverTarget = 1;
    };
    const onLeave = () => {
      hoverTarget = 0;
    };

    if (!reduce) {
      wrap.addEventListener('pointermove', onMove);
      wrap.addEventListener('pointerenter', onEnter);
      wrap.addEventListener('pointerleave', onLeave);
    }

    const resizeObserver = new ResizeObserver(() => {
      buildTexture();
      if (reduce) render();
    });
    resizeObserver.observe(wrap);

    const themeObserver = new MutationObserver(() => {
      readColors();
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
      buildTexture();
      if (reduce) {
        render();
        return;
      }
      // Only spend GPU while the wordmark is on screen
      viewObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      });
      viewObserver.observe(wrap);
    });

    return () => {
      disposed = true;
      stop();
      if (!reduce) {
        wrap.removeEventListener('pointermove', onMove);
        wrap.removeEventListener('pointerenter', onEnter);
        wrap.removeEventListener('pointerleave', onLeave);
      }
      resizeObserver.disconnect();
      themeObserver.disconnect();
      if (viewObserver) viewObserver.disconnect();
      probe.remove();
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      role="img"
      aria-label={t.contact.wordmarkLabel}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <span className={styles.fallback} aria-hidden="true">
        {WORD}
      </span>
    </div>
  );
}
