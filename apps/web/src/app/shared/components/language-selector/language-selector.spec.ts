import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../core/i18n/language.service';
import { LanguageSelector } from './language-selector';

describe('LanguageSelector', () => {
  let fixture: ComponentFixture<LanguageSelector>;
  let language: LanguageService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [LanguageSelector] }).compileComponents();
    TestBed.inject(TranslocoService).setActiveLang('es');
    fixture = TestBed.createComponent(LanguageSelector);
    language = TestBed.inject(LanguageService);
    language.initializeLanguage();
    fixture.detectChanges();
  });

  it('switches the UI language without recreating the page', () => {
    const toggleButton = fixture.nativeElement.querySelector('.language-button') as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.language-option') as NodeListOf<HTMLButtonElement>;
    const englishOption = Array.from(options).find((option) => option.textContent?.includes('English'));
    englishOption?.click();
    fixture.detectChanges();

    expect(language.currentLanguage()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('closes the panel after selecting a language', () => {
    const toggleButton = fixture.nativeElement.querySelector('.language-button') as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.language-option') as NodeListOf<HTMLButtonElement>;
    options[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.language-panel')).toBeNull();
  });
});
