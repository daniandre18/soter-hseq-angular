export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface EmulatorConfig {
  authUrl: string;
  firestoreHost: string;
  firestorePort: number;
  storageHost: string;
  storagePort: number;
  functionsHost: string;
  functionsPort: number;
}

export interface AppEnvironment {
  production: boolean;
  useEmulators: boolean;
  firebase: FirebaseWebConfig;
  emulators?: EmulatorConfig;
  /**
   * Región de despliegue de las Cloud Functions (debe coincidir con la
   * región usada en `functions/src/index.ts`).
   */
  functionsRegion: string;
}
