import { useLanguage } from '../../../shared/i18n/LanguageContext';
import styles from './LanguageToggle.module.css';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={t.langToggle.label}
      onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
    >
      {t.langToggle.short}
    </button>
  );
}
