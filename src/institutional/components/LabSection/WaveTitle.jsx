import { Fragment, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './WaveTitle.module.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/*
 * Kinetic variable-font title. Each letter's weight rides a travelling wave
 * (thin <-> bold) by tweening CSS `font-weight`, which maps to the wght axis of
 * the variable Sora face. Reads like a living instrument readout. Pauses off
 * screen; reduced motion holds a static mid weight.
 */
function Word({ word, accent }) {
  return (
    <span className={accent ? `${styles.word} ${styles.accent}` : styles.word}>
      {[...word].map((char, i) => (
        <span key={i} data-wl className={styles.letter}>
          {char}
        </span>
      ))}
    </span>
  );
}

export default function WaveTitle({ text, accent }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('[data-wl]', { fontWeight: 600 });
        return;
      }

      gsap.set('[data-wl]', { fontWeight: 300 });
      gsap.to('[data-wl]', {
        fontWeight: 720,
        duration: 0.95,
        ease: 'sine.inOut',
        stagger: { each: 0.055, from: 'start', repeat: -1, yoyo: true },
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 90%',
          toggleActions: 'play pause resume pause',
        },
      });
    },
    { scope: ref }
  );

  const bodyWords = text.split(' ').filter(Boolean);
  const accentWords = accent.split(' ').filter(Boolean);

  return (
    <h2 ref={ref} className={styles.title}>
      {bodyWords.map((word, i) => (
        <Fragment key={`b${i}`}>
          <Word word={word} />{' '}
        </Fragment>
      ))}
      {accentWords.map((word, i) => (
        <Fragment key={`a${i}`}>
          <Word word={word} accent />
          {i < accentWords.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </h2>
  );
}
