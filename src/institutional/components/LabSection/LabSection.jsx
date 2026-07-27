import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import RotaryPhone from './RotaryPhone';
import MusicalPlant from './MusicalPlant';
import LoopMachine from './LoopMachine';
import * as engine from './audioEngine';
import styles from './LabSection.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin, ScrollTrigger);

export default function LabSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    engine.unlock();
    engine.setMuted(!muted);
    setMuted(!muted);
  };

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      gsap
        .timeline({
          scrollTrigger: { trigger: '[data-lab-heading]', start: 'top 78%' },
        })
        .fromTo(
          '[data-lab-heading]',
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        )
        .fromTo(
          '[data-lab-underline]',
          { drawSVG: '0%' },
          { drawSVG: '100%', duration: 0.55, ease: 'power1.inOut' },
          '-=0.15'
        )
        .fromTo(
          ['[data-lab-intro]', '[data-lab-mute]'],
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.1, ease: 'power2.out' },
          '-=0.25'
        );

      // Each station sketches itself in when it scrolls into view
      gsap.utils.toArray('[data-station]').forEach((station) => {
        const timeline = gsap.timeline({
          scrollTrigger: { trigger: station, start: 'top 82%' },
        });
        const strokes = station.querySelectorAll('[data-draw]');
        const fills = station.querySelectorAll('[data-fill]');
        const pads = station.querySelectorAll('[data-pad]');
        const caption = station.querySelector('[data-caption]');

        timeline.fromTo(
          strokes,
          { drawSVG: '0%' },
          { drawSVG: '100%', duration: 0.55, stagger: 0.06, ease: 'power1.inOut' }
        );
        if (fills.length) {
          timeline.fromTo(
            fills,
            { fillOpacity: 0 },
            { fillOpacity: 1, duration: 0.4, stagger: 0.05 },
            '-=0.3'
          );
        }
        if (pads.length) {
          timeline.fromTo(
            pads,
            { autoAlpha: 0, scale: 0.85 },
            { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.07, ease: 'back.out(2)' },
            '-=0.3'
          );
        }
        timeline.fromTo(
          caption,
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.2'
        );
      });
    },
    { scope: sectionRef }
  );

  const stations = [
    { key: 'phone', content: t.lab.phone, Toy: RotaryPhone },
    { key: 'plant', content: t.lab.plant, Toy: MusicalPlant },
    { key: 'loop', content: t.lab.loop, Toy: LoopMachine },
  ];

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title} data-lab-heading>
          {t.lab.titleText}{' '}
          <span className={styles.titleAccent}>
            {t.lab.titleAccent}
            <svg
              className={styles.underline}
              viewBox="0 0 220 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path data-lab-underline d="M4 13 C 70 6.5, 150 7, 216 11" />
            </svg>
          </span>
        </h2>

        <p className={styles.intro} data-lab-intro>
          {t.lab.intro}
        </p>

        <button
          type="button"
          className={styles.muteButton}
          data-lab-mute
          aria-pressed={muted}
          onClick={toggleMute}
        >
          {muted ? t.lab.soundOn : t.lab.soundOff}
        </button>

        <div className={styles.bench}>
          {stations.map(({ key, content, Toy }) => (
            <figure key={key} className={styles.station} data-station>
              <div className={styles.toy}>
                <Toy />
              </div>
              <figcaption className={styles.caption} data-caption>
                <p className={styles.hint}>{content.hint}</p>
                <h3 className={styles.stationTitle}>{content.title}</h3>
                <p className={styles.story}>{content.story}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
