import type { CountryCode } from 'libphonenumber-js';

/**
 * Países disponibles en el selector de teléfono. Es una lista corta y
 * curada (no las ~195 del mundo) — los mercados donde opera o tiene
 * clientes SOTER HSEQ. `code` es el ISO 3166-1 alpha-2 que espera
 * `libphonenumber-js`; `dialCode` es solo para mostrar en el selector;
 * `translationKey` resuelve el nombre visible en `common.countries.*`.
 *
 * El import de `CountryCode` es solo de tipos (`import type`) — se borra en
 * compilación y no arrastra el runtime de `libphonenumber-js` a este
 * módulo, que sí se carga de entrada (a diferencia del validador, que se
 * importa dinámicamente desde `PhoneInput`).
 */
export interface PhoneCountry {
  code: CountryCode;
  translationKey: `common.countries.${string}`;
  dialCode: string;
  flag: string;
}

export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { code: 'CO', translationKey: 'common.countries.CO', dialCode: '+57', flag: '🇨🇴' },
  { code: 'US', translationKey: 'common.countries.US', dialCode: '+1', flag: '🇺🇸' },
  { code: 'MX', translationKey: 'common.countries.MX', dialCode: '+52', flag: '🇲🇽' },
  { code: 'ES', translationKey: 'common.countries.ES', dialCode: '+34', flag: '🇪🇸' },
  { code: 'AR', translationKey: 'common.countries.AR', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', translationKey: 'common.countries.CL', dialCode: '+56', flag: '🇨🇱' },
  { code: 'PE', translationKey: 'common.countries.PE', dialCode: '+51', flag: '🇵🇪' },
  { code: 'EC', translationKey: 'common.countries.EC', dialCode: '+593', flag: '🇪🇨' },
  { code: 'PA', translationKey: 'common.countries.PA', dialCode: '+507', flag: '🇵🇦' },
  { code: 'BR', translationKey: 'common.countries.BR', dialCode: '+55', flag: '🇧🇷' },
  { code: 'CA', translationKey: 'common.countries.CA', dialCode: '+1', flag: '🇨🇦' },
  { code: 'CR', translationKey: 'common.countries.CR', dialCode: '+506', flag: '🇨🇷' },
  { code: 'DO', translationKey: 'common.countries.DO', dialCode: '+1', flag: '🇩🇴' },
  { code: 'VE', translationKey: 'common.countries.VE', dialCode: '+58', flag: '🇻🇪' },
] as const;

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'CO';
