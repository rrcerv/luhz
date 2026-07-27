import { useEffect, useState } from 'react';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import * as engine from './audioEngine';
import styles from './LoopMachine.module.css';

const CHANNELS = ['kick', 'hat', 'bass', 'melody'];

/*
 * Four pads, one shared clock: arm any combination and the loops stay in
 * sync — a miniature of the Nike totem's sound-loop mixer.
 */
export default function LoopMachine() {
  const { t } = useLanguage();
  const [active, setActive] = useState({
    kick: false,
    hat: false,
    bass: false,
    melody: false,
  });

  useEffect(() => () => engine.stopSequencer(), []);

  const toggle = (channel) => {
    const isOn = engine.toggleChannel(channel);
    setActive((current) => ({ ...current, [channel]: isOn }));
  };

  return (
    <div className={styles.machine}>
      <svg
        className={styles.frame}
        viewBox="0 0 300 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          data-draw
          vectorEffect="non-scaling-stroke"
          d="M12 14 C 80 9, 220 9, 288 14 C 292 80, 292 220, 288 286 C 220 291, 80 291, 12 286 C 8 220, 8 80, 12 14 Z"
        />
      </svg>
      <div className={styles.pads}>
        {CHANNELS.map((channel, index) => (
          <button
            key={channel}
            type="button"
            data-pad
            className={
              active[channel] ? `${styles.pad} ${styles.padActive}` : styles.pad
            }
            aria-pressed={active[channel]}
            onClick={() => toggle(channel)}
          >
            <svg
              className={styles.padBorder}
              viewBox="0 0 90 90"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                d="M7 9 C 28 6, 60 6, 83 9 C 86 30, 86 58, 83 81 C 60 84, 28 84, 7 81 C 4 58, 4 30, 7 9 Z"
              />
            </svg>
            <span className={styles.padLabel}>{t.lab.loop.pads[index]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
