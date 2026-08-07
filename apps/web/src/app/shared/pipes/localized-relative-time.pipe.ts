import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

@Pipe({ name: 'localizedRelativeTime', standalone: true, pure: false })
export class LocalizedRelativeTimePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: Date | string | number | null | undefined, now = Date.now()): string {
    if (value == null) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const deltaMinutes = Math.round((date.getTime() - now) / 60_000);
    const formatter = new Intl.RelativeTimeFormat(this.language.currentLocale(), { numeric: 'auto' });
    if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, 'minute');

    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 24) return formatter.format(deltaHours, 'hour');

    const deltaDays = Math.round(deltaHours / 24);
    if (Math.abs(deltaDays) < 7) return formatter.format(deltaDays, 'day');

    return new Intl.DateTimeFormat(this.language.currentLocale(), { dateStyle: 'medium' }).format(date);
  }
}
