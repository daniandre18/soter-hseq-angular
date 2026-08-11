import type { AppEnvironment } from '../app/core/models/app-environment.model';

export const environment: AppEnvironment = {
  production: true,
  useEmulators: false,
  // Cambiar a `false` recupera inmediatamente el formulario tradicional.
  demoQuickLoginEnabled: true,
  // El proyecto productivo usa Firebase Storage (plan Blaze) para permitir
  // evidencias reales desde el demo publicado en GitHub Pages.
  evidenceUploadsEnabled: true,
  firebase: {
    apiKey: 'AIzaSyAXOTIPT04Zk4r6mSBYah_-Zmar5Wm67_4',
    authDomain: 'soter-hseq.firebaseapp.com',
    projectId: 'soter-hseq',
    storageBucket: 'soter-hseq.firebasestorage.app',
    messagingSenderId: '725837147231',
    appId: '1:725837147231:web:4c24e3fbcf86fc63233fea',
  },
  functionsRegion: 'us-central1',
  vapidPublicKey:
    'BDGxmEDYt3vGFKEVdFCq1Gz-6rTAiYhw1vGvug1vWyl7l1oMg11ymqWYKLpdm8MlNBtcHkIb29xuuYitlIkh6xY',
};
