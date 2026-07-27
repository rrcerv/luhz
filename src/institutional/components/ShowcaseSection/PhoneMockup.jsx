import { useLanguage } from '../../../shared/i18n/LanguageContext';
import styles from './PhoneMockup.module.css';

/*
 * Hand-drawn smartphone holding a 9:16 screen. Pass `videoSrc` to play a reel;
 * while it is empty the screen shows a "coming soon" placeholder so the mockup
 * never looks broken. The sketched frame (data-draw strokes) sits on top of the
 * screen and is drawn in by ShowcaseSection's scroll animation.
 */
export default function PhoneMockup({ videoSrc = '' }) {
  const { t } = useLanguage();

  return (
    <div className={styles.phone} data-stage>
      <div className={styles.screen}>
        {videoSrc ? (
          <video
            className={styles.video}
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            aria-label={t.showcase.phoneAlt}
          />
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.placeholderInner} data-screen-content>
              <svg className={styles.playIcon} viewBox="0 0 48 48" aria-hidden="true">
                <circle data-draw cx="24" cy="24" r="19" />
                <path data-draw d="M20 15 L34 24 L20 33 Z" />
              </svg>
              <span className={styles.comingSoon}>{t.showcase.comingSoon}</span>
            </div>
          </div>
        )}
      </div>

      <svg
        className={styles.frame}
        viewBox="0 0 200 400"
        role="img"
        aria-label={t.showcase.phoneAlt}
      >
        {/* Body */}
        <path
          data-draw
          className={styles.body}
          d="M42 22 C 92 18, 108 18, 158 22 C 176 25, 184 40, 186 72 C 190 152, 190 248, 186 328 C 184 360, 176 375, 158 378 C 108 382, 92 382, 42 378 C 24 375, 16 360, 14 328 C 10 248, 10 152, 14 72 C 16 40, 24 25, 42 22 Z"
        />
        {/* Screen outline */}
        <path
          data-draw
          d="M40 60 C 92 57, 108 57, 160 60 C 170 62, 176 68, 177 80 C 179 152, 179 248, 177 320 C 176 332, 170 338, 160 340 C 108 343, 92 343, 40 340 C 30 338, 24 332, 23 320 C 21 248, 21 152, 23 80 C 24 68, 30 62, 40 60 Z"
        />
        {/* Speaker + camera */}
        <path data-draw d="M92 41 L108 41" />
        <circle data-draw cx="116" cy="41" r="2.2" />
        {/* Side buttons */}
        <path data-draw d="M12 140 L12 162" />
        <path data-draw d="M12 170 L12 192" />
        <path data-draw d="M188 150 L188 182" />
      </svg>
    </div>
  );
}
