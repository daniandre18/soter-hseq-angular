import { Injectable } from '@angular/core';
import type { LogoUploadGateway, UploadLogoInput } from '../../../features/settings/domain/logo-upload.gateway';
import { environment } from '../../../../environments/environment';
import { firebaseCallable } from './firebase-callable';

/** Mismo helper que `firebase-evidence-upload.gateway.ts` (lee el `File`
 *  como base64 puro, sin el prefijo `data:...;base64,`). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

interface UploadLogoRequest {
  fileName: string;
  contentType: string;
  fileBase64: string;
}

interface UploadLogoResponse {
  logoUrl: string;
}

/** Adapter de `LogoUploadGateway` sobre la Cloud Function callable `uploadLogo`. */
@Injectable({ providedIn: 'root' })
export class FirebaseLogoUploadGateway implements LogoUploadGateway {
  async upload(input: UploadLogoInput): Promise<string> {
    if (!environment.evidenceUploadsEnabled) {
      throw new Error('La carga de archivos está deshabilitada en el demo gratuito.');
    }
    input.onProgress?.(10);
    const fileBase64 = await fileToBase64(input.file);
    input.onProgress?.(60);

    const uploadLogoFn = await firebaseCallable<UploadLogoRequest, UploadLogoResponse>(
      'uploadLogo',
    );
    const { data } = await uploadLogoFn({
      fileName: input.file.name,
      contentType: input.file.type,
      fileBase64,
    });
    input.onProgress?.(100);
    return data.logoUrl;
  }
}
