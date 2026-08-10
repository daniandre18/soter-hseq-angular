import type { Provider } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from './firebase.tokens';

export const firebaseApp = initializeApp(environment.firebase);

function createAuth() {
  const auth = getAuth(firebaseApp);
  if (environment.useEmulators && environment.emulators) {
    connectAuthEmulator(auth, environment.emulators.authUrl, { disableWarnings: true });
  }
  return auth;
}

function createFirestore() {
  // `ignoreUndefinedProperties`: varios formularios opcionales escriben
  // `campo: value || undefined` para omitir strings vacíos; el SDK rechaza
  // por defecto cualquier `undefined` en un write (`addDoc`/`updateDoc`).
  const firestore = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
  if (environment.useEmulators && environment.emulators) {
    connectFirestoreEmulator(
      firestore,
      environment.emulators.firestoreHost,
      environment.emulators.firestorePort,
    );
  }
  return firestore;
}

export const firebaseProviders: Provider[] = [
  { provide: FIREBASE_AUTH, useFactory: createAuth },
  { provide: FIREBASE_FIRESTORE, useFactory: createFirestore },
];
