import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

@Pipe({ name: 'localizedNumber', standalone: true, pure: false })
export class LocalizedNumberPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(
    value: number | string | null | undefined,
    options?: Intl.NumberFormatOptions,
  ): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat(this.language.currentLocale(), options).format(value);
  }
}
