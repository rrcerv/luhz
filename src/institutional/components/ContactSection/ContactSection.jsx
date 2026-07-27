import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import LuhzText from './LuhzText';
import ContactForm from './ContactForm';
import styles from './ContactSection.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin, ScrollTrigger);

export default function ContactSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      gsap
        .timeline({
          scrollTrigger: { trigger: '[data-contact-head]', start: 'top 80%' },
        })
        .fromTo(
          '[data-contact-head]',
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        )
        .fromTo(
          '[data-contact-underline]',
          { drawSVG: '0%' },
          { drawSVG: '100%', duration: 0.55, ease: 'power1.inOut' },
          '-=0.15'
        )
        .fromTo(
          '[data-contact-sub]',
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.25'
        );

      gsap.fromTo(
        '[data-contact-form]',
        { autoAlpha: 0, y: 30 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-contact-form]', start: 'top 85%' },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} id="contato" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.headline} data-contact-head>
            {t.contact.headlineText}{' '}
            <span className={styles.accent}>
              {t.contact.headlineAccent}
              <svg
                className={styles.underline}
                viewBox="0 0 220 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path data-contact-underline d="M4 13 C 70 6.5, 150 7, 216 11" />
              </svg>
            </span>
            {t.contact.headlineTail ? ` ${t.contact.headlineTail}` : ''}
          </h2>
          <p className={styles.subtitle} data-contact-sub>
            {t.contact.subtitle}
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.wordmark}>
            <LuhzText />
          </div>
          <div className={styles.formWrap} data-contact-form>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
