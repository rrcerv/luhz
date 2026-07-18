import HomeSection from '../../components/HomeSection/HomeSection';
import AboutSection from '../../components/AboutSection/AboutSection';
import LanguageToggle from '../../components/LanguageToggle/LanguageToggle';
import styles from './Home.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <LanguageToggle />
      <HomeSection />
      <AboutSection />
    </main>
  );
}
