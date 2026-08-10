import type { HttpsCallable } from 'firebase/functions';
import { environment } from '../../../../environments/environment';
import { firebaseApp } from '../firebase.providers';

type FirebaseFunctionsModule = typeof import('firebase/functions');

let functionsModulePromise: Promise<FirebaseFunctionsModule> | null = null;
let functionsClientPromise: Promise<ReturnType<FirebaseFunctionsModule['getFunctions']>> | null =
  null;

function loadFunctionsModule(): Promise<FirebaseFunctionsModule> {
  functionsModulePromise ??= import('firebase/functions');
  return functionsModulePromise;
}

async function loadFunctionsClient() {
  functionsClientPromise ??= loadFunctionsModule().then(
    ({ connectFunctionsEmulator, getFunctions }) => {
      const functions = getFunctions(firebaseApp, environment.functionsRegion);
      if (environment.useEmulators && environment.emulators) {
        connectFunctionsEmulator(
          functions,
          environment.emulators.functionsHost,
          environment.emulators.functionsPort,
        );
      }
      return functions;
    },
  );
  return functionsClientPromise;
}

/**
 * Crea una callable solo cuando una acción realmente necesita Functions.
 * Mantener el import dinámico detrás de esta función evita descargar el SDK
 * durante el login y las rutas de consulta.
 */
export async function firebaseCallable<RequestData, ResponseData>(
  name: string,
): Promise<HttpsCallable<RequestData, ResponseData>> {
  const [functionsModule, functions] = await Promise.all([
    loadFunctionsModule(),
    loadFunctionsClient(),
  ]);
  return functionsModule.httpsCallable<RequestData, ResponseData>(functions, name);
}
