import { InjectionToken } from '@angular/core';

export interface UploadLogoInput {
  file: File;
  onProgress?: (percent: number) => void;
}

/**
 * Puerto para subir el logo de la empresa. Mismo motivo que
 * `EvidenceUploadGateway`: `storage.rules` deniega todo acceso directo del
 * cliente, así que la subida (archivo + validación + actualización de
 * `settings/general.logoUrl`) ocurre en una Cloud Function con Admin SDK.
 */
export interface LogoUploadGateway {
  /** Retorna la URL de descarga del logo recién subido. */
  upload(input: UploadLogoInput): Promise<string>;
}

export const LOGO_UPLOAD_GATEWAY = new InjectionToken<LogoUploadGateway>('LOGO_UPLOAD_GATEWAY');
