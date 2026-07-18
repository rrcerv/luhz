import { useLanguage } from '../../../shared/i18n/LanguageContext';
import styles from './HomeSection.module.css';

/*
 * Hand-drawn pendant bulb. Every stroke is tagged with data attributes so
 * GSAP can draw them (data-draw) and reveal the light rays (data-ray).
 */
export default function LampSvg() {
  const { t } = useLanguage();

  return (
    <svg
      className={styles.lampSvg}
      viewBox="0 0 320 376"
      role="img"
      aria-label={t.hero.lampAlt}
    >
      <defs>
        <radialGradient id="lampGlowGradient" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor="#ffd98e" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ffc24d" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffc24d" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse
        data-lamp-glow
        cx="159.5"
        cy="227"
        rx="74"
        ry="78"
        fill="url(#lampGlowGradient)"
        opacity="0"
      />

      {/* Light rays (hidden until the switch is flipped) */}
      <g>
        <path data-ray d="M266.3 201.5 L295.2 193.8" />
        <path data-ray d="M237.8 152.2 L259 131" />
        <path data-ray d="M82.2 152.2 L61 131" />
        <path data-ray d="M53.7 201.5 L24.8 193.8" />
        <path data-ray d="M60.3 276.5 L33.2 289.2" />
        <path data-ray d="M113.5 329.7 L100.8 356.9" />
        <path data-ray d="M206.5 329.7 L219.2 356.9" />
        <path data-ray d="M259.7 276.5 L286.8 289.2" />
      </g>

      {/* Ceiling cord */}
      <path data-draw="cord" d="M160 0 C 157.5 40, 163 74, 160 109" />

      {/* Socket / screw cap */}
      <path data-draw="socket" d="M141 112 C 151 108, 169 109, 179 111" />
      <path data-draw="socket" d="M141 112 C 139 124, 138.5 135, 138 146" />
      <path data-draw="socket" d="M179 111 C 181 124, 181.5 135, 182 146" />
      <path data-draw="socket" d="M140 122 C 152 118.5, 168 119, 180 121.5" />
      <path data-draw="socket" d="M141 132 C 153 128.5, 169 129, 181 131.5" />

      {/* Glass bulb */}
      <path
        data-draw="bulb"
        d="M138 146 C 120 151, 90 172, 84 214 C 77 262, 111 306, 158 308 C 206 307, 241 262, 234 213 C 228 172, 199 151, 182 146"
      />

      {/* Filament */}
      <path data-draw="filament" d="M150 148 C 149.5 164, 149.5 180, 150 194" />
      <path data-draw="filament" d="M170 148 C 170.5 164, 170.5 180, 170 194" />
      <path data-draw="filament" d="M150 194 L155 208 L160.5 194 L166 208 L170 194" />
    </svg>
  );
}
