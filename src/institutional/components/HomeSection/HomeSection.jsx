import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import LampSvg from './LampSvg';
import LightSwitch from './LightSwitch';
import styles from './HomeSection.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function HomeSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const knobBobRef = useRef(null);
  const [isOn, setIsOn] = useState(false);
  const [hasToggled, setHasToggled] = useState(false);

  const { contextSafe } = useGSAP(
    () => {
      gsap.set('[data-draw]', { drawSVG: '0%' });
      gsap.set('[data-ray]', { drawSVG: '0%' });
      gsap.set('[data-brand-char]', { autoAlpha: 0, y: 28, rotate: 4 });
      gsap.set('[data-brand-tagline]', { autoAlpha: 0, y: 14 });
      gsap.set('[data-switch-wrap]', { autoAlpha: 0, y: 16 });
      gsap.set('[data-catchphrase]', { autoAlpha: 0 });

      if (prefersReducedMotion()) {
        gsap.set('[data-draw]', { drawSVG: '100%' });
        gsap.set(
          ['[data-brand-char]', '[data-brand-tagline]', '[data-switch-wrap]'],
          { autoAlpha: 1, y: 0, rotate: 0 }
        );
        return;
      }

      const introTl = gsap
        .timeline({ defaults: { ease: 'power1.inOut' }, delay: 0.35 })
        .to('[data-draw="cord"]', { drawSVG: '100%', duration: 0.6 })
        .to(
          '[data-draw="socket"]',
          { drawSVG: '100%', duration: 0.4, stagger: 0.07 },
          '-=0.15'
        )
        .to('[data-draw="bulb"]', { drawSVG: '100%', duration: 0.9 }, '-=0.1')
        .to(
          '[data-draw="filament"]',
          { drawSVG: '100%', duration: 0.45, stagger: 0.1 },
          '-=0.25'
        )
        .to(
          '[data-brand-char]',
          {
            autoAlpha: 1,
            y: 0,
            rotate: 0,
            duration: 0.55,
            stagger: 0.07,
            ease: 'back.out(2)',
          },
          '-=0.1'
        )
        .to(
          '[data-brand-tagline]',
          { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.2'
        )
        .to(
          '[data-switch-wrap]',
          { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.15'
        );

      // Once the switch is present, invite the press: the knob bobs in its slot
      knobBobRef.current = gsap.to('[data-switch-knob]', {
        y: 6,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: introTl.delay() + introTl.duration(),
      });
    },
    { scope: sectionRef }
  );

  const handleToggle = contextSafe(() => {
    const next = !isOn;
    setIsOn(next);
    setHasToggled(true);
    knobBobRef.current?.kill();

    const root = document.documentElement;

    if (prefersReducedMotion()) {
      root.dataset.theme = next ? 'light' : 'dark';
      gsap.set('[data-switch-knob]', { y: next ? 32 : 0 });
      gsap.set('[data-lamp-glow]', { opacity: next ? 1 : 0 });
      gsap.set('[data-room-glow]', { opacity: next ? 1 : 0 });
      gsap.set('[data-ray]', { drawSVG: next ? '100%' : '0%' });
      gsap.set('[data-catchphrase]', { autoAlpha: next ? 1 : 0, y: 0 });
      return;
    }

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

    if (next) {
      tl.to('[data-switch-knob]', { y: 32, duration: 0.14, ease: 'power3.in' })
        // Incandescent flicker before the light settles
        .to('[data-lamp-glow]', {
          keyframes: { opacity: [0, 1, 0.15, 0.9, 0.4, 1] },
          duration: 0.55,
          ease: 'none',
        })
        .add(() => {
          root.dataset.theme = 'light';
        }, '-=0.35')
        .to('[data-room-glow]', { opacity: 1, duration: 0.9, ease: 'power2.out' }, '<')
        .to(
          '[data-ray]',
          { drawSVG: '100%', duration: 0.45, ease: 'power2.out', stagger: 0.05 },
          '-=0.55'
        )
        .fromTo(
          '[data-catchphrase]',
          { autoAlpha: 0, y: 26, scale: 0.94 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: 'back.out(1.6)',
          },
          '-=0.3'
        );
    } else {
      tl.to('[data-switch-knob]', { y: 0, duration: 0.14, ease: 'power3.in' })
        .add(() => {
          root.dataset.theme = 'dark';
        })
        .to(
          '[data-catchphrase]',
          { autoAlpha: 0, y: 12, duration: 0.3, ease: 'power2.in' },
          0
        )
        .to(
          '[data-ray]',
          { drawSVG: '0%', duration: 0.3, stagger: { each: 0.03, from: 'end' } },
          0.1
        )
        .to(
          '[data-lamp-glow]',
          { keyframes: { opacity: [1, 0.3, 0.6, 0] }, duration: 0.4, ease: 'none' },
          0.1
        )
        .to('[data-room-glow]', { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.1);
    }
  });

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.roomGlow} data-room-glow aria-hidden="true" />

      <div className={styles.lampWrap}>
        <LampSvg />
      </div>

      <div className={styles.content}>
        <h1 className={styles.brandName} aria-label={t.hero.brandName}>
          {t.hero.brandName.split('').map((char, index) => (
            <span key={index} data-brand-char aria-hidden="true">
              {char}
            </span>
          ))}
        </h1>
        <p className={styles.brandTagline} data-brand-tagline>
          {t.hero.brandTagline}
        </p>

        <p className={styles.catchphrase} data-catchphrase>
          {t.hero.catchphrase}
        </p>

        <div className={styles.switchArea}>
          <LightSwitch
            isOn={isOn}
            onToggle={handleToggle}
            label={isOn ? t.hero.switchTurnOff : t.hero.switchTurnOn}
            showHint={!hasToggled}
          />
        </div>
      </div>
    </section>
  );
}
