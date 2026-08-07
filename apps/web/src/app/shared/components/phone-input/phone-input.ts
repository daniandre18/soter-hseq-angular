import { Component, computed, inject, input, model, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { CountryCode, ValidatePhoneNumberLengthResult } from 'libphonenumber-js/min';
import { Combobox, type ComboboxOption } from '../combobox/combobox';
import { PHONE_COUNTRIES, DEFAULT_PHONE_COUNTRY } from '../../data/phone-countries';
import { LanguageService } from '../../../core/i18n/language.service';

type Validity = 'idle' | 'valid' | 'invalid';

/** El módulo completo de `libphonenumber-js/min`, tal como resuelve el
 *  `import()` dinámico — tipado explícito en vez de `any`. */
type PhoneLib = typeof import('libphonenumber-js/min');

/**
 * Input de teléfono con selector de país (bandera + código de marcado),
 * máscara dinámica y validación estructural en tiempo real.
 *
 * `libphonenumber-js` (~145 KB con metadata) se carga con `import()`
 * dinámico al construirse el componente, no en el bundle inicial — el
 * campo es utilizable de inmediato (el usuario puede escribir mientras
 * carga) y se reformatea/valida en cuanto el módulo está listo.
 */
@Component({
  selector: 'app-phone-input',
  imports: [Combobox, TranslocoPipe],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.scss',
})
export class PhoneInput {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  readonly value = model<string>('');
  readonly country = model<CountryCode>(DEFAULT_PHONE_COUNTRY);
  readonly disabled = input(false);
  /** Vacío = usa el label genérico traducido (`common.phone.label`). */
  readonly ariaLabel = input('');

  protected readonly countryOptions = computed<ComboboxOption[]>(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    return PHONE_COUNTRIES.map((entry) => ({
      value: entry.code,
      label: `${entry.flag} ${this.transloco.translate(entry.translationKey)} (${entry.dialCode})`,
    }));
  });

  protected readonly selectedCountry = computed(
    () => PHONE_COUNTRIES.find((entry) => entry.code === this.country()) ?? PHONE_COUNTRIES[0],
  );

  protected readonly nationalInput = signal('');
  protected readonly libraryLoading = signal(true);
  protected readonly touched = signal(false);
  protected readonly validity = signal<Validity>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  private lib: PhoneLib | null = null;
  private userEdited = false;

  constructor() {
    this.nationalInput.set(this.value());
    void this.loadLibrary();
  }

  /** `libphonenumber-js/min` (~145 KB con metadata) llega por `import()`
   *  dinámico al construirse el componente, no en el bundle inicial. */
  private async loadLibrary(): Promise<void> {
    this.lib = await import('libphonenumber-js/min');
    this.libraryLoading.set(false);
    if (!this.userEdited) {
      this.reparseExternalValue();
    }
  }

  /** Reformatea/valida un valor que llegó desde afuera (p. ej. al abrir el
   *  formulario para editar un cliente existente) una vez cargada la
   *  librería — nunca pisa lo que el usuario ya esté escribiendo. */
  private reparseExternalValue(): void {
    const raw = this.value();
    if (!raw || !this.lib) {
      return;
    }
    const parsed = this.lib.parsePhoneNumberFromString(raw);
    if (parsed) {
      this.country.set(parsed.country ?? this.country());
      this.nationalInput.set(parsed.formatNational());
      this.validity.set(parsed.isValid() ? 'valid' : 'invalid');
    } else {
      this.nationalInput.set(raw);
    }
  }

  protected onCountryChange(code: string): void {
    this.country.set(code as CountryCode);
    this.userEdited = true;
    this.applyFormatting(this.nationalInput());
  }

  protected onInput(event: Event): void {
    this.userEdited = true;
    this.applyFormatting((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.touched.set(true);
    // Mientras se escribe, un número corto se deja en 'idle' (todavía puede
    // seguir creciendo). Al salir del campo ya no hay más dígitos por
    // venir, así que un número no válido y no vacío debe mostrar error aunque
    // "parezca corto" en vez de quedarse callado.
    if (this.validity() === 'idle' && this.nationalInput().trim()) {
      this.validity.set('invalid');
      this.updateErrorMessage(this.nationalInput());
    }
  }

  private applyFormatting(raw: string): void {
    if (!raw.trim()) {
      this.nationalInput.set('');
      this.value.set('');
      this.validity.set('idle');
      this.errorMessage.set(null);
      return;
    }

    if (!this.lib) {
      // La librería todavía no cargó: no bloqueamos al usuario, solo
      // mostramos lo que escribió sin máscara ni validación todavía.
      this.nationalInput.set(raw);
      this.value.set(raw);
      this.validity.set('idle');
      return;
    }

    const formatter = new this.lib.AsYouType(this.country());
    const formatted = formatter.input(raw);
    this.nationalInput.set(formatted);

    const number = formatter.getNumber();
    if (number?.isValid()) {
      this.value.set(number.number);
      this.validity.set('valid');
      this.errorMessage.set(null);
      return;
    }

    this.value.set(formatted);
    if (this.looksComplete(raw)) {
      this.validity.set('invalid');
      this.updateErrorMessage(raw);
    } else {
      // Todavía puede estar a mitad de escribir — no lo marcamos como
      // error mientras la longitud sea plausible que siga creciendo.
      this.validity.set('idle');
      this.errorMessage.set(null);
    }
  }

  private looksComplete(raw: string): boolean {
    if (!this.lib) {
      return false;
    }
    const lengthCheck = this.lib.validatePhoneNumberLength(raw, this.country());
    return lengthCheck === undefined || lengthCheck === 'TOO_LONG' || lengthCheck === 'INVALID_LENGTH';
  }

  private updateErrorMessage(raw: string): void {
    if (!this.lib) {
      return;
    }
    const country = this.transloco.translate(this.selectedCountry().translationKey);
    const lengthCheck: ValidatePhoneNumberLengthResult | undefined = this.lib.validatePhoneNumberLength(
      raw,
      this.country(),
    );
    switch (lengthCheck) {
      case 'TOO_SHORT':
        this.errorMessage.set(this.transloco.translate('common.phone.tooShort', { country }));
        break;
      case 'TOO_LONG':
        this.errorMessage.set(this.transloco.translate('common.phone.tooLong', { country }));
        break;
      default:
        this.errorMessage.set(this.transloco.translate('common.phone.invalid', { country }));
    }
  }
}
