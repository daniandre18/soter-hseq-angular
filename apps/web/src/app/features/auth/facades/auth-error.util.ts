const AUTH_ERROR_KEYS: Record<string, string> = {
  'auth/invalid-credential': 'auth.errors.invalidCredential',
  'auth/invalid-email': 'auth.errors.invalidEmail',
  'auth/user-disabled': 'auth.errors.userDisabled',
  'auth/user-not-found': 'auth.errors.invalidCredential',
  'auth/wrong-password': 'auth.errors.invalidCredential',
  'auth/too-many-requests': 'auth.errors.tooManyRequests',
  'auth/network-request-failed': 'auth.errors.network',
};

const DEFAULT_KEY = 'auth.errors.default';

/** Los adapters de infraestructura son la única capa que debería conocer
 *  `FirebaseError`; acá se detecta por forma (`code: string`) para que este
 *  archivo —parte de las facades, no de infraestructura— no importe
 *  ningún tipo de `firebase/app`. */
function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

export function mapAuthErrorMessage(error: unknown): string {
  if (hasErrorCode(error)) {
    return AUTH_ERROR_KEYS[error.code] ?? DEFAULT_KEY;
  }
  return DEFAULT_KEY;
}
