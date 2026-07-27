import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import * as engine from './audioEngine';
import styles from './RotaryPhone.module.css';

const DIAL_CENTER = { x: 100, y: 134 };
const MAX_ROTATION = 320;
const NOTCH = 32; // degrees between "click" positions

/*
 * Drag the dial clockwise and release: it spins back with the classic
 * tick-tick-tick, then chirps like an incoming call.
 */
export default function RotaryPhone() {
  const { t } = useLanguage();
  const svgRef = useRef(null);
  const dialRef = useRef(null);
  const drag = useRef({
    dragging: false,
    prevAngle: 0,
    rotation: 0,
    maxReached: 0,
    lastNotch: 0,
  });

  const { contextSafe } = useGSAP(
    () => {
      gsap.set(dialRef.current, {
        svgOrigin: `${DIAL_CENTER.x} ${DIAL_CENTER.y}`,
      });
    },
    { scope: svgRef }
  );

  const pointerAngle = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + (rect.width * DIAL_CENTER.x) / 200;
    const cy = rect.top + (rect.height * DIAL_CENTER.y) / 200;
    return (
      (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI
    );
  };

  const tickOnNotchChange = (rotation) => {
    const notch = Math.floor(rotation / NOTCH);
    if (notch !== drag.current.lastNotch) {
      drag.current.lastNotch = notch;
      engine.playTick();
    }
  };

  const springBack = contextSafe(() => {
    const state = drag.current;
    const distance = state.rotation;
    gsap.to(dialRef.current, {
      rotation: 0,
      duration: 0.25 + (distance / MAX_ROTATION) * 0.9,
      ease: 'power1.inOut',
      onUpdate: () => {
        const current = Number(gsap.getProperty(dialRef.current, 'rotation'));
        state.rotation = current;
        tickOnNotchChange(current);
      },
      onComplete: () => {
        if (state.maxReached > 40) engine.playRing();
        state.maxReached = 0;
      },
    });
  });

  const onPointerDown = (event) => {
    engine.unlock();
    gsap.killTweensOf(dialRef.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current.dragging = true;
    drag.current.prevAngle = pointerAngle(event);
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state.dragging) return;
    const angle = pointerAngle(event);
    let delta = angle - state.prevAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    state.prevAngle = angle;
    state.rotation = gsap.utils.clamp(0, MAX_ROTATION, state.rotation + delta);
    state.maxReached = Math.max(state.maxReached, state.rotation);
    gsap.set(dialRef.current, { rotation: state.rotation });
    tickOnNotchChange(state.rotation);
  };

  const onPointerUp = () => {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    springBack();
  };

  // Keyboard fallback: a scripted spin-and-return
  const onKeyDown = contextSafe((event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    engine.unlock();
    const state = drag.current;
    gsap.killTweensOf(dialRef.current);
    gsap
      .timeline()
      .to(dialRef.current, {
        rotation: 200,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          const current = Number(gsap.getProperty(dialRef.current, 'rotation'));
          state.maxReached = Math.max(state.maxReached, current);
          tickOnNotchChange(current);
        },
      })
      .add(() => {
        state.rotation = 200;
        springBack();
      });
  });

  return (
    <svg
      ref={svgRef}
      className={styles.phone}
      viewBox="0 0 200 200"
      role="img"
      aria-label={t.lab.phone.title}
    >
      {/* Body */}
      <path
        data-draw
        d="M45 172 C 38 128, 58 96, 100 94 C 142 96, 162 128, 155 172 C 118 176, 82 176, 45 172 Z"
      />
      {/* Handset */}
      <path
        data-draw
        className={styles.handset}
        d="M52 70 C 76 48, 124 48, 148 70"
      />
      <path data-draw d="M64 88 L60 72" />
      <path data-draw d="M136 88 L140 72" />
      {/* Finger stop */}
      <path data-draw d="M132 162 L141 170" />

      {/* Dial (rotates) */}
      <g ref={dialRef}>
        <circle data-draw cx="100" cy="134" r="36" />
        <circle data-draw cx="100" cy="134" r="9" />
        <circle data-draw cx="122.1" cy="146.8" r="5" />
        <circle data-draw cx="108.7" cy="158" r="5" />
        <circle data-draw cx="91.3" cy="158" r="5" />
        <circle data-draw cx="77.9" cy="146.8" r="5" />
        <circle data-draw cx="74.9" cy="129.6" r="5" />
        <circle data-draw cx="83.6" cy="114.5" r="5" />
        <circle data-draw cx="100" cy="108.5" r="5" />
        <circle data-draw cx="116.4" cy="114.5" r="5" />
      </g>

      {/* Invisible drag surface */}
      <circle
        className={styles.hitArea}
        cx="100"
        cy="134"
        r="42"
        role="button"
        tabIndex={0}
        aria-label={t.lab.phone.dialLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      />
    </svg>
  );
}
