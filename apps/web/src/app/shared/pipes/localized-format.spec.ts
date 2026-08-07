import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizedCurrencyPipe } from './localized-currency.pipe';
import { LocalizedDatePipe } from './localized-date.pipe';
import { LocalizedNumberPipe } from './localized-number.pipe';

describe('localized format pipes', () => {
  it('reacts to the locale while keeping COP as the currency', () => {
    const language = TestBed.inject(LanguageService);
    const datePipe = TestBed.runInInjectionContext(() => new LocalizedDatePipe());
    const currencyPipe = TestBed.runInInjectionContext(() => new LocalizedCurrencyPipe());
    const numberPipe = TestBed.runInInjectionContext(() => new LocalizedNumberPipe());
    const date = new Date(2026, 7, 5);

    language.changeLanguage('es');
    const spanishDate = datePipe.transform(date, { dateStyle: 'long' });
    const spanishCurrency = currencyPipe.transform(1_500_000);
    const spanishNumber = numberPipe.transform(1_500_000);

    language.changeLanguage('en');
    const englishDate = datePipe.transform(date, { dateStyle: 'long' });
    const englishCurrency = currencyPipe.transform(1_500_000);
    const englishNumber = numberPipe.transform(1_500_000);

    expect(spanishDate).not.toBe(englishDate);
    expect(spanishCurrency).not.toBe(englishCurrency);
    expect(spanishNumber).not.toBe(englishNumber);
    expect(englishCurrency).toContain('COP');
    expect(englishCurrency).not.toContain('USD');
  });
});
