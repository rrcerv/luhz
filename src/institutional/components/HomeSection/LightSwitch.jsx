import styles from './HomeSection.module.css';

/*
 * Hand-drawn wall switch. The knob (data-switch-knob) slides down the slot
 * when GSAP flips the light on. `showHint` pulses a soft glow until the
 * visitor interacts for the first time.
 */
export default function LightSwitch({ isOn, onToggle, label, showHint }) {
  const className = showHint
    ? `${styles.switch} ${styles.switchHint}`
    : styles.switch;

  return (
    <button
      type="button"
      data-switch-wrap
      className={className}
      onClick={onToggle}
      aria-pressed={isOn}
      aria-label={label}
    >
      <svg viewBox="0 0 90 130" aria-hidden="true">
        {/* Plate */}
        <path
          className={styles.switchPlate}
          d="M22 12 C 40 8.5, 52 9, 68 12 C 74.5 33, 75 96, 69 118 C 51 121.5, 39 121, 21 118 C 15.5 96, 15 34, 22 12 Z"
        />
        {/* Screws */}
        <circle className={styles.switchDetail} cx="45" cy="25" r="3" />
        <circle className={styles.switchDetail} cx="45" cy="105" r="3" />
        {/* Slot */}
        <path
          className={styles.switchDetail}
          d="M40 44 C 43 42.5, 47 42.5, 50 44 L50 86 C 47 87.5, 43 87.5, 40 86 Z"
        />
        {/* Knob */}
        <g data-switch-knob>
          <circle className={styles.switchKnob} cx="45" cy="49" r="10.5" />
        </g>
      </svg>
    </button>
  );
}
