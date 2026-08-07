import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from './language.service';
import { LANGUAGE_STORAGE_KEY } from './language.config';

describe('LanguageService', () => {
  let service: LanguageService;
  let transloco: TranslocoService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(LanguageService);
    transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('es');
  });

  it('uses Spanish and es-CO by default', () => {
    service.initializeLanguage();

    expect(service.currentLanguage()).toBe('es');
    expect(service.currentLocale()).toBe('es-CO');
    expect(document.documentElement.lang).toBe('es');
  });

  it('changes language synchronously, persists it and derives the locale', () => {
    service.changeLanguage('en');

    expect(service.currentLanguage()).toBe('en');
    expect(service.currentLocale()).toBe('en-US');
    expect(transloco.getActiveLang()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('restores a valid preference', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');

    service.initializeLanguage();

    expect(service.currentLanguage()).toBe('en');
  });

  it('falls back to Spanish when the stored value is invalid', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');

    service.initializeLanguage();

    expect(service.currentLanguage()).toBe('es');
    expect(service.isSupportedLanguage('pt')).toBe(false);
  });

  it('supports interpolation and explicit singular/plural keys', () => {
    transloco.setTranslation(
      {
        sample: {
          welcome: 'Hola {{name}}',
          one: '1 orden',
          other: '{{count}} órdenes',
        },
      },
      'es',
    );

    expect(transloco.translate('sample.welcome', { name: 'Carlos' })).toBe('Hola Carlos');
    expect(transloco.translate('sample.one', { count: 1 })).toBe('1 orden');
    expect(transloco.translate('sample.other', { count: 3 })).toBe('3 órdenes');
  });
});
