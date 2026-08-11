import type { AppEnvironment } from '../app/core/models/app-environment.model';

// Config ficticia: el proyecto "demo-soter-hseq" solo existe para el Firebase
// Emulator Suite y no requiere una cuenta ni credenciales reales.
export const environment: AppEnvironment = {
  production: false,
  useEmulators: true,
  demoQuickLoginEnabled: true,
  evidenceUploadsEnabled: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-soter-hseq.firebaseapp.com',
    projectId: 'demo-soter-hseq',
    storageBucket: 'demo-soter-hseq.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000',
  },
  emulators: {
    authUrl: 'http://127.0.0.1:9099',
    firestoreHost: '127.0.0.1',
    firestorePort: 8080,
    storageHost: '127.0.0.1',
    storagePort: 9199,
    functionsHost: '127.0.0.1',
    functionsPort: 5001,
  },
  functionsRegion: 'us-central1',
  // Par de prueba dedicado al Functions Emulator (ver `functions/.env.local`) —
  // no usar en producción.
  vapidPublicKey:
    'BGI-TfyxQdGW1wvRJWQRAQgQLm7iJ70zfS3c6Nj4oHHBYRFn-anHQ9VQQGoJTeNWykHy5iQoYEOfSMdk3Hho-b4',
};
