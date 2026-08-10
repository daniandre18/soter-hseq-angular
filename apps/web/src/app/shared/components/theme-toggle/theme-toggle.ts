import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon, type IconName } from '../icon/icon';
import { ThemeService, type ThemePreference } from '../../services/theme.service';

interface ThemeOption {
  value: ThemePreference;
  icon: IconName;
  translationKey: 'theme.light' | 'theme.dark' | 'theme.semiDark' | 'theme.system';
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: 'light', icon: 'sun', translationKey: 'theme.light' },
  { value: 'dark', icon: 'moon', translationKey: 'theme.dark' },
  { value: 'semi-dark', icon: 'contrast', translationKey: 'theme.semiDark' },
  { value: 'system', icon: 'monitor', translationKey: 'theme.system' },
];

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslocoPipe, Icon],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly options = THEME_OPTIONS;
  protected readonly open = signal(false);
  protected readonly toggleIcon = computed<IconName>(
    () => this.options.find((option) => option.value === this.theme.preference())?.icon ?? 'sun',
  );

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected select(preference: ThemePreference): void {
    this.theme.setPreference(preference);
    this.close();
  }

  @HostListener('document:click', ['$event.target'])
  protected onDocumentClick(target: EventTarget | null): void {
    if (this.open() && target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }
}
