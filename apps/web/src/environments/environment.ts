import type { AppEnvironment } from '../app/core/models/app-environment.model';

export const environment: AppEnvironment = {
  production: true,
  useEmulators: false,
  // GitHub Pages + Firebase Spark: las evidencias migradas son estáticas y
  // Firebase Storage no está disponible sin asociar facturación (Blaze).
  evidenceUploadsEnabled: false,
  firebase: {
    apiKey: 'AIzaSyAXOTIPT04Zk4r6mSBYah_-Zmar5Wm67_4',
    authDomain: 'soter-hseq.firebaseapp.com',
    projectId: 'soter-hseq',
    storageBucket: 'soter-hseq.firebasestorage.app',
    messagingSenderId: '725837147231',
    appId: '1:725837147231:web:4c24e3fbcf86fc63233fea',
  },
  functionsRegion: 'us-central1',
};
