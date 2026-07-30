import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import PhoneMockup from './PhoneMockup';
import ShowcaseBackground from './ShowcaseBackground';
import styles from './ShowcaseSection.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin, ScrollTrigger);

export default function ShowcaseSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      gsap.set('[data-draw]', { drawSVG: '0%' });
      gsap.set('[data-screen-content]', { autoAlpha: 0, y: 10 });

      gsap
        .timeline({
          scrollTrigger: { trigger: '[data-showcase-copy]', start: 'top 78%' },
        })
        .fromTo(
          '[data-showcase-heading]',
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        )
        .fromTo(
          '[data-showcase-underline]',
          { drawSVG: '0%' },
          { drawSVG: '100%', duration: 0.55, ease: 'power1.inOut' },
          '-=0.15'
        )
        .fromTo(
          '[data-showcase-intro]',
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' },
          '-=0.25'
        );

      // The phone sketches itself in, then the screen content fades up
      gsap
        .timeline({
          scrollTrigger: { trigger: '[data-stage]', start: 'top 82%' },
        })
        .to('[data-draw]', {
          drawSVG: '100%',
          duration: 0.8,
          stagger: 0.04,
          ease: 'power1.inOut',
        })
        .to(
          '[data-screen-content]',
          { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.3'
        );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className={styles.section}>
      <ShowcaseBackground />
      <div className={styles.container}>
        <div className={styles.copy} data-showcase-copy>
          <h2 className={styles.title} data-showcase-heading>
            {t.showcase.titleText}{' '}
            <span className={styles.titleAccent}>
              {t.showcase.titleAccent}
              <svg
                className={styles.underline}
                viewBox="0 0 220 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path data-showcase-underline d="M4 13 C 70 6.5, 150 7, 216 11" />
              </svg>
            </span>
          </h2>
          <p className={styles.intro} data-showcase-intro>
            {t.showcase.intro}
          </p>
        </div>

        <div className={styles.stage}>
          <PhoneMockup videoSrc='https://pub-827b2cfd3c5b4abd9c0c13b273209fec.r2.dev/video_site_luhz.mp4' />
        </div>
      </div>
    </section>
  );
}
