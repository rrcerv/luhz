import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import * as engine from './audioEngine';
import styles from './MusicalPlant.module.css';

/*
 * Touch-sensitive plant: each leaf plucks a note (C major pentatonic-ish),
 * wiggles, and releases a little music-note doodle.
 */
const LEAVES = [
  {
    d: 'M98 118 C 82 116, 68 104, 66 88 C 82 90, 96 102, 98 118 Z',
    base: '98 118',
    note: { x: 60, y: 84 },
    freq: 261.63,
  },
  {
    d: 'M102 108 C 118 106, 132 94, 134 78 C 118 80, 104 92, 102 108 Z',
    base: '102 108',
    note: { x: 138, y: 74 },
    freq: 329.63,
  },
  {
    d: 'M97 88 C 84 84, 74 70, 76 56 C 90 60, 98 74, 97 88 Z',
    base: '97 88',
    note: { x: 70, y: 52 },
    freq: 392,
  },
  {
    d: 'M103 80 C 116 76, 126 62, 124 48 C 110 52, 102 66, 103 80 Z',
    base: '103 80',
    note: { x: 130, y: 44 },
    freq: 440,
  },
  {
    d: 'M100 62 C 92 48, 94 32, 102 22 C 110 34, 108 50, 100 62 Z',
    base: '100 62',
    note: { x: 106, y: 16 },
    freq: 523.25,
  },
];

const THROTTLE_MS = 140;

export default function MusicalPlant() {
  const { t } = useLanguage();
  const svgRef = useRef(null);
  const lastPlayed = useRef(LEAVES.map(() => 0));

  const { contextSafe } = useGSAP(() => {}, { scope: svgRef });

  const playLeaf = contextSafe((index) => {
    const now = performance.now();
    if (now - lastPlayed.current[index] < THROTTLE_MS) return;
    lastPlayed.current[index] = now;

    engine.playPluck(LEAVES[index].freq);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const leaf = svgRef.current.querySelector(`[data-leaf="${index}"]`);
    const note = svgRef.current.querySelector(`[data-note="${index}"]`);
    gsap.fromTo(
      leaf,
      { rotation: index % 2 === 0 ? -7 : 7, svgOrigin: LEAVES[index].base },
      { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' }
    );
    gsap.fromTo(
      note,
      { x: 0, y: 0, autoAlpha: 1 },
      {
        x: index % 2 === 0 ? -10 : 10,
        y: -32,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power1.out',
        overwrite: true,
      }
    );
  });

  const onLeafEnter = (index) => (event) => {
    if (event.pointerType === 'mouse') playLeaf(index);
  };

  const onLeafKeyDown = (index) => (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    playLeaf(index);
  };

  return (
    <svg
      ref={svgRef}
      className={styles.plant}
      viewBox="0 0 200 200"
      role="img"
      aria-label={t.lab.plant.title}
    >
      {/* Pot */}
      <path
        data-draw
        d="M68 150 C 90 148, 110 148, 132 150 L125 181 C 108 184, 92 184, 75 181 Z"
      />
      {/* Stem */}
      <path data-draw d="M100 150 C 98 120, 102 100, 100 78" />

      {LEAVES.map((leaf, index) => (
        <path
          key={leaf.base}
          data-draw
          data-fill
          data-leaf={index}
          className={styles.leaf}
          d={leaf.d}
          role="button"
          tabIndex={0}
          aria-label={`${t.lab.plant.leafLabel} ${index + 1}`}
          onPointerDown={() => playLeaf(index)}
          onPointerEnter={onLeafEnter(index)}
          onKeyDown={onLeafKeyDown(index)}
        />
      ))}

      {LEAVES.map((leaf, index) => (
        <text
          key={leaf.base}
          data-note={index}
          className={styles.note}
          x={leaf.note.x}
          y={leaf.note.y}
          aria-hidden="true"
        >
          ♪
        </text>
      ))}
    </svg>
  );
}
