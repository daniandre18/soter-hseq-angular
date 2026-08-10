import { Component, computed, inject, input, output } from '@angular/core';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { Avatar } from '../../shared/components/avatar/avatar';
import { NotificationBell } from './notification-bell/notification-bell';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { LanguageSelector } from '../../shared/components/language-selector/language-selector';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  imports: [Avatar, NotificationBell, TranslocoPipe, LanguageSelector, ThemeToggle],
  providers: [...provideTranslocoScope('layout')],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authFacade = inject(AuthFacade);

  readonly title = input('layout.brand');
  readonly menuClick = output<void>();

  protected readonly currentUser = this.authFacade.currentUser;

  protected readonly roleTranslationKey = computed(() => {
    const role = this.authFacade.currentRole();
    return role ? `roles.${role}` : '';
  });

  /** El inbox de notificaciones es para quienes gestionan órdenes/cotizaciones
   *  activamente (CLAUDE.md §3.1/§3.3) — no para técnicos ni comercial. */
  protected readonly showNotifications = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COORDINATOR';
  });

  protected openMenu(): void {
    this.menuClick.emit();
  }
}
