import styles from './WaveformTitle.module.css';

/*
 * Waveform-clipped title. The accent words are filled with the accent color
 * plus a lighter audio-waveform highlight that scrolls through the glyphs via
 * `background-clip: text` — a nod to the Lab's synthesized sound. Pure CSS;
 * reduced motion holds the waveform static. Falls back to a solid accent fill
 * where background-clip:text is unsupported.
 */
export default function WaveformTitle({ text, accent }) {
  return (
    <h2 className={styles.title}>
      <span className={styles.body}>{text} </span>
      <span className={styles.wave}>{accent}</span>
    </h2>
  );
}
