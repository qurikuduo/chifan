import { describe, it, expect, beforeEach } from 'vitest';

// Import before i18n creates the instance so localStorage override takes effect
describe('i18n configuration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should export supportedLocales with 4 languages', async () => {
    const { supportedLocales } = await import('@/i18n/index');
    expect(supportedLocales).toHaveLength(4);
    const codes = supportedLocales.map((l) => l.code);
    expect(codes).toContain('zh');
    expect(codes).toContain('en');
    expect(codes).toContain('es');
    expect(codes).toContain('ar');
  });

  it('should have labels for all locales', async () => {
    const { supportedLocales } = await import('@/i18n/index');
    supportedLocales.forEach((locale) => {
      expect(locale.label).toBeTruthy();
      expect(typeof locale.label).toBe('string');
    });
  });

  it('should export i18n instance with messages for all locales', async () => {
    const { i18n } = await import('@/i18n/index');
    const messages = i18n.global.messages.value || i18n.global.messages;
    expect(messages).toHaveProperty('zh');
    expect(messages).toHaveProperty('en');
    expect(messages).toHaveProperty('es');
    expect(messages).toHaveProperty('ar');
  });

  it('should use zh as fallback locale', async () => {
    const { i18n } = await import('@/i18n/index');
    expect(i18n.global.fallbackLocale.value).toBe('zh');
  });

  it('should not use legacy mode', async () => {
    const { i18n } = await import('@/i18n/index');
    // legacy: false means composition API mode — t() is a function, not object
    expect(typeof i18n.global.t).toBe('function');
    expect(typeof i18n.global.locale).toBe('object'); // ref in composition mode
  });
});
