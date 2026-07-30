import type { AppEnvironment } from '../app/core/models/app-environment.model';

export const environment: AppEnvironment = {
  production: true,
  useEmulators: false,
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  functionsRegion: 'us-central1',
};
