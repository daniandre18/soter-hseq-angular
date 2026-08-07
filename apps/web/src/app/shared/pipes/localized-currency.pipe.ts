import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

@Pipe({ name: 'localizedCurrency', standalone: true, pure: false })
export class LocalizedCurrencyPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: number | null | undefined, currency = 'COP'): string {
    if (value == null) return '';
    return new Intl.NumberFormat(this.language.currentLocale(), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
