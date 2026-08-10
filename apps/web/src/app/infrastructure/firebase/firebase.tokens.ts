import { InjectionToken } from '@angular/core';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FIREBASE_FIRESTORE');
