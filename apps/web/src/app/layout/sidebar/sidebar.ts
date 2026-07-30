import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { Avatar } from '../../shared/components/avatar/avatar';
import { USER_ROLE_LABELS, type UserRole } from '../../core/models/user-role.model';

interface NavItem {
  path: string;
  label: string;
  roles: UserRole[];
}

// Se irá completando a medida que existan las rutas de cada fase
// (CLAUDE.md §14): clientes, cotizaciones, órdenes, mis órdenes, etc.
const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Panel', roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR'] },
  { path: '/clientes', label: 'Clientes', roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR'] },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Avatar],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly mobileOpen = input(false);
  readonly closeRequested = output<void>();

  protected readonly collapsed = signal(false);
  protected readonly currentUser = this.authFacade.currentUser;

  protected readonly navItems = computed(() => {
    const role = this.authFacade.currentRole();
    return role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];
  });

  protected readonly roleLabel = computed(() => {
    const role = this.authFacade.currentRole();
    return role ? USER_ROLE_LABELS[role] : '';
  });

  protected toggleCollapsed(): void {
    this.collapsed.update((collapsed) => !collapsed);
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected async logout(): Promise<void> {
    await this.authFacade.logout();
    await this.router.navigateByUrl('/login');
  }
}
