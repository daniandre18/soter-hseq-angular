import { inject, provideAppInitializer } from '@angular/core';
import { TitleStrategy } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './language.config';
import { LanguageService } from './language.service';
import { I18nTitleStrategy } from './i18n-title.strategy';
import { TranslocoHttpLoader } from './transloco-http.loader';

export const i18nProviders = [
  provideTransloco({
    config: {
      availableLangs: SUPPORTED_LANGUAGES.map((language) => language.code),
      defaultLang: DEFAULT_LANGUAGE,
      fallbackLang: DEFAULT_LANGUAGE,
      reRenderOnLangChange: true,
      prodMode: environment.production,
      missingHandler: {
        logMissingKey: !environment.production,
        useFallbackTranslation: true,
        allowEmpty: false,
      },
    },
    loader: TranslocoHttpLoader,
  }),
  provideAppInitializer(() => inject(LanguageService).initializeLanguage()),
  { provide: TitleStrategy, useClass: I18nTitleStrategy },
];
