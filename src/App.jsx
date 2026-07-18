import { LanguageProvider } from './shared/i18n/LanguageContext';
import Home from './institutional/pages/Home/Home';

export default function App() {
  return (
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );
}
