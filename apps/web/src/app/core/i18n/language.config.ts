export type AppLanguage = 'es' | 'en';

export interface LanguageConfig {
  code: AppLanguage;
  locale: 'es-CO' | 'en-US';
  translationKey: 'languages.spanish' | 'languages.english';
}

export const DEFAULT_LANGUAGE: AppLanguage = 'es';
export const LANGUAGE_STORAGE_KEY = 'app_language';

export const SUPPORTED_LANGUAGES: readonly LanguageConfig[] = [
  { code: 'es', locale: 'es-CO', translationKey: 'languages.spanish' },
  { code: 'en', locale: 'en-US', translationKey: 'languages.english' },
] as const;

export function isAppLanguage(value: unknown): value is AppLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}
