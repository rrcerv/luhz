import HomeSection from '../../components/HomeSection/HomeSection';
import AboutSection from '../../components/AboutSection/AboutSection';
import ShowcaseSection from '../../components/ShowcaseSection/ShowcaseSection';
import LabSection from '../../components/LabSection/LabSection';
import ContactSection from '../../components/ContactSection/ContactSection';
import LanguageToggle from '../../components/LanguageToggle/LanguageToggle';
import styles from './Home.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <LanguageToggle />
      <HomeSection />
      <AboutSection />
      <ShowcaseSection />
      <LabSection />
      <ContactSection />
    </main>
  );
}
