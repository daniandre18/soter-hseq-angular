import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideQuillConfig } from 'ngx-quill/config';

import { routes } from './app.routes';
import { firebaseProviders } from './infrastructure/firebase/firebase.providers';
import { repositoryProviders } from './infrastructure/firebase/repository.providers';
import { i18nProviders } from './core/i18n/i18n.providers';
import { PushNotificationsService } from './features/push-notifications/state/push-notifications.service';
import { AppUpdateService } from './shared/services/app-update.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
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
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(PushNotificationsService).listenForClicks()),
    provideAppInitializer(() => inject(AppUpdateService).init()),
  ],
};
