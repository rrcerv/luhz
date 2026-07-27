import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { SensorIcon, SparkIcon, PlatformIcon, RobotIcon } from './AboutIcons';
import ShaderTitle from './ShaderTitle';
import styles from './AboutSection.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin, ScrollTrigger);

const pillarIcons = [SensorIcon, SparkIcon, PlatformIcon, RobotIcon];

export default function AboutSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      // Heading (interactive shader title) fades up, then the intro follows
      gsap
        .timeline({
          scrollTrigger: { trigger: '[data-about-heading]', start: 'top 78%' },
        })
        .fromTo(
          '[data-about-heading]',
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        )
        .fromTo(
          '[data-about-intro]',
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' },
          '-=0.25'
        );

      // Cards: sketch the border, draw the icon, reveal the copy
      gsap.utils.toArray('[data-card]').forEach((card) => {
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: 'top 84%' } })
          .fromTo(
            card.querySelector('[data-card-border]'),
            { drawSVG: '0%' },
            { drawSVG: '100%', duration: 0.7, ease: 'power1.inOut' }
          )
          .fromTo(
            card.querySelectorAll('[data-icon-draw]'),
            { drawSVG: '0%' },
            { drawSVG: '100%', duration: 0.45, stagger: 0.08, ease: 'power1.inOut' },
            '-=0.35'
          )
          .fromTo(
            card.querySelector('[data-card-content]'),
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
            '-=0.3'
          );
      });

      gsap.fromTo(
        '[data-brands]',
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-brands]', start: 'top 85%' },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleShader} data-about-heading>
          <ShaderTitle text={t.about.titleText} accent={t.about.titleAccent} />
        </div>

        <p className={styles.intro} data-about-intro>
          {t.about.intro}
        </p>

        <ul className={styles.pillars}>
          {t.about.pillars.map((pillar, index) => {
            const Icon = pillarIcons[index];
            return (
              <li key={pillar.title} className={styles.card} data-card>
                <svg
                  className={styles.cardBorder}
                  viewBox="0 0 400 240"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    data-card-border
                    vectorEffect="non-scaling-stroke"
                    d="M10 12 C 100 8, 300 8, 390 12 C 393 60, 393 180, 390 228 C 300 233, 100 233, 10 228 C 7 180, 7 60, 10 12 Z"
                  />
                </svg>
                <Icon />
                <div data-card-content>
                  <h3 className={styles.cardTitle}>{pillar.title}</h3>
                  <p className={styles.cardDescription}>{pillar.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={styles.brands} data-brands>
          <p className={styles.brandsTitle}>{t.about.brandsTitle}</p>
          <div className={styles.marquee}>
            <div className={styles.marqueeTrack}>
              {[0, 1].map((copy) => (
                <ul
                  key={copy}
                  className={styles.marqueeList}
                  aria-hidden={copy === 1}
                >
                  {t.about.brands.map((brand) => (
                    <li key={brand} className={styles.marqueeItem}>
                      {brand}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
          <p className={styles.brandsDisclaimer}>{t.about.brandsDisclaimer}</p>
        </div>
      </div>
    </section>
  );
}
