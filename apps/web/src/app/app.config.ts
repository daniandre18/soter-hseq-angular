import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideQuillConfig } from 'ngx-quill/config';

import { routes } from './app.routes';
import { firebaseProviders } from './core/firebase/firebase.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    provideCharts(withDefaultRegisterables()),
    provideQuillConfig({
      theme: 'snow',
      format: 'html',
      sanitize: true,
      defaultEmptyValue: '',
    }),
    ...firebaseProviders,
  ],
};
