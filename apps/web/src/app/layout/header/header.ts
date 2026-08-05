import { Component, computed, inject, input, output } from '@angular/core';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { Avatar } from '../../shared/components/avatar/avatar';
import { NotificationBell } from './notification-bell/notification-bell';
import { USER_ROLE_LABELS } from '../../core/models/user-role.model';

@Component({
  selector: 'app-header',
  imports: [Avatar, NotificationBell],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authFacade = inject(AuthFacade);

  readonly title = input('SOTER HSEQ');
  readonly menuClick = output<void>();

  protected readonly currentUser = this.authFacade.currentUser;

  protected readonly roleLabel = computed(() => {
    const role = this.authFacade.currentRole();
    return role ? USER_ROLE_LABELS[role] : '';
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
