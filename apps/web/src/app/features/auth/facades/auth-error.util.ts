const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo ingresado no es válido.',
  'auth/user-disabled': 'Este usuario está inactivo. Contacta a un administrador.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  'auth/network-request-failed': 'No hay conexión con el servidor. Intenta de nuevo.',
};

const DEFAULT_MESSAGE = 'No fue posible completar la operación. Intenta de nuevo.';

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
    return AUTH_ERROR_MESSAGES[error.code] ?? DEFAULT_MESSAGE;
  }
  return DEFAULT_MESSAGE;
}
