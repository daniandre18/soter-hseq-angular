import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideQuillConfig } from 'ngx-quill/config';

import { routes } from './app.routes';
import { firebaseProviders } from './infrastructure/firebase/firebase.providers';
import { repositoryProviders } from './infrastructure/firebase/repository.providers';
import { i18nProviders } from './core/i18n/i18n.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    provideQuillConfig({
      theme: 'snow',
      format: 'html',
      sanitize: true,
      defaultEmptyValue: '',
    }),
    ...i18nProviders,
    ...firebaseProviders,
    ...repositoryProviders,
  ],
};
