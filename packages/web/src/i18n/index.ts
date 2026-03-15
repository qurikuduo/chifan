import { createI18n } from 'vue-i18n';
import zh from './locales/zh.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';

function detectLocale(): string {
  // 1. Check localStorage for saved preference
  const saved = localStorage.getItem('locale');
  if (saved && ['zh', 'en', 'es', 'ar'].includes(saved)) return saved;

  // 2. Auto-detect from browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('ar')) return 'ar';
  if (browserLang.startsWith('en')) return 'en';

  // 3. Default to Chinese
  return 'zh';
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'zh',
  messages: { zh, en, es, ar },
});

export const supportedLocales = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
];
