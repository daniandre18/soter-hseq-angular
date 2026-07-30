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
}

export interface AppEnvironment {
  production: boolean;
  useEmulators: boolean;
  firebase: FirebaseWebConfig;
  emulators?: EmulatorConfig;
  /**
   * Base URL de las Cloud Functions HTTPS (p. ej. generateClosingAct).
   * Gemini nunca se invoca directamente desde Angular (CLAUDE.md §12.1):
   * esta URL apunta siempre a un endpoint backend autenticado.
   */
  functionsBaseUrl: string;
}
