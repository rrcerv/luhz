import styles from './AboutSection.module.css';

/*
 * Hand-drawn doodle icons for the pillar cards. Every stroke is tagged with
 * data-icon-draw so GSAP can sketch them in when the card scrolls into view.
 */

function IconBase({ children }) {
  return (
    <svg className={styles.icon} viewBox="0 0 48 48" aria-hidden="true">
      {children}
    </svg>
  );
}

/* Presence sensor — dot radiating waves */
export function SensorIcon() {
  return (
    <IconBase>
      <circle data-icon-draw cx="12" cy="36" r="2.5" />
      <path data-icon-draw d="M12 28 A 8 8 0 0 1 20 36" />
      <path data-icon-draw d="M12 21 A 15 15 0 0 1 27 36" />
      <path data-icon-draw d="M12 14 A 22 22 0 0 1 34 36" />
    </IconBase>
  );
}

/* Live marketing — energy bolt */
export function SparkIcon() {
  return (
    <IconBase>
      <path data-icon-draw d="M27 6 L15 26 L23 26 L19 42 L34 21 L25 21 L29 6" />
    </IconBase>
  );
}

/* Platforms — sketched browser window */
export function PlatformIcon() {
  return (
    <IconBase>
      <path
        data-icon-draw
        d="M8 12 C 20 10.5, 30 11, 40 12 C 41.5 20, 41.5 28, 40 36 C 28 37.5, 18 37, 8 36 C 6.5 28, 6.5 20, 8 12 Z"
      />
      <path data-icon-draw d="M7.5 18.5 L40.5 18" />
      <path data-icon-draw d="M14 26 L27 26" />
      <path data-icon-draw d="M14 31 L33 31" />
    </IconBase>
  );
}

/* Robotics — doodled robot head */
export function RobotIcon() {
  return (
    <IconBase>
      <path
        data-icon-draw
        d="M12 16 C 20 14.5, 28 15, 36 16 C 37.5 23, 37.5 30, 36 37 C 28 38.5, 20 38, 12 37 C 10.5 30, 10.5 23, 12 16 Z"
      />
      <circle data-icon-draw cx="20" cy="26" r="2" />
      <circle data-icon-draw cx="29" cy="26" r="2" />
      <path data-icon-draw d="M24 15 L24 9" />
      <circle data-icon-draw cx="24" cy="6.5" r="2" />
    </IconBase>
  );
}
