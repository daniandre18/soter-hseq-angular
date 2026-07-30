import type { Provider } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { environment } from '../../../environments/environment';
import {
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
  FIREBASE_FUNCTIONS,
  FIREBASE_STORAGE,
} from './firebase.tokens';

const firebaseApp = initializeApp(environment.firebase);

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

function createStorage() {
  const storage = getStorage(firebaseApp);
  if (environment.useEmulators && environment.emulators) {
    connectStorageEmulator(
      storage,
      environment.emulators.storageHost,
      environment.emulators.storagePort,
    );
  }
  return storage;
}

function createFunctions() {
  const functions = getFunctions(firebaseApp, environment.functionsRegion);
  if (environment.useEmulators && environment.emulators) {
    connectFunctionsEmulator(
      functions,
      environment.emulators.functionsHost,
      environment.emulators.functionsPort,
    );
  }
  return functions;
}

export const firebaseProviders: Provider[] = [
  { provide: FIREBASE_AUTH, useFactory: createAuth },
  { provide: FIREBASE_FIRESTORE, useFactory: createFirestore },
  { provide: FIREBASE_STORAGE, useFactory: createStorage },
  { provide: FIREBASE_FUNCTIONS, useFactory: createFunctions },
];
