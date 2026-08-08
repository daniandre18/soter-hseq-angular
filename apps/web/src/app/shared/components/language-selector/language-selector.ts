import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../icon/icon';
import { LanguageService } from '../../../core/i18n/language.service';
import type { AppLanguage } from '../../../core/i18n/language.config';

@Component({
  selector: 'app-language-selector',
  imports: [TranslocoPipe, Icon],
  templateUrl: './language-selector.html',
  styleUrl: './language-selector.scss',
})
export class LanguageSelector {
  protected readonly language = inject(LanguageService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected selectLanguage(language: AppLanguage): void {
    this.language.changeLanguage(language);
    this.close();
  }

  @HostListener('document:click', ['$event.target'])
  protected onDocumentClick(target: EventTarget | null): void {
    if (this.open() && target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }
}
