import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '../../../core/i18n/language.service';
import type { AppLanguage } from '../../../core/i18n/language.config';

@Component({
  selector: 'app-language-selector',
  imports: [TranslocoPipe],
  templateUrl: './language-selector.html',
  styleUrl: './language-selector.scss',
})
export class LanguageSelector {
  protected readonly language = inject(LanguageService);

  protected changeLanguage(event: Event): void {
    const language = (event.target as HTMLSelectElement).value;
    if (this.language.isSupportedLanguage(language)) {
      this.language.changeLanguage(language as AppLanguage);
    }
  }
}
