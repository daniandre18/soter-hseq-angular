import type { Provider } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { environment } from '../../../environments/environment';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE, FIREBASE_STORAGE } from './firebase.tokens';

const firebaseApp = initializeApp(environment.firebase);

function createAuth() {
  const auth = getAuth(firebaseApp);
  if (environment.useEmulators && environment.emulators) {
    connectAuthEmulator(auth, environment.emulators.authUrl, { disableWarnings: true });
  }
  return auth;
}

function createFirestore() {
  const firestore = getFirestore(firebaseApp);
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

export const firebaseProviders: Provider[] = [
  { provide: FIREBASE_AUTH, useFactory: createAuth },
  { provide: FIREBASE_FIRESTORE, useFactory: createFirestore },
  { provide: FIREBASE_STORAGE, useFactory: createStorage },
];
