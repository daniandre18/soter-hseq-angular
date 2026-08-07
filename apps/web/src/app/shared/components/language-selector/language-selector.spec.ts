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
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'en';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(language.currentLanguage()).toBe('en');
    expect(select.value).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
