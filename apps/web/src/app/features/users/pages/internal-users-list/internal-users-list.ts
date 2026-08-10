import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { AppUser, UserStatus } from '../../../../core/models/app-user.model';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { InternalUserFormModal } from '../../components/internal-user-form-modal/internal-user-form-modal';
import type { InternalUserRole } from '../../domain/user-management.gateway';
import { InternalUsersFacade } from '../../facades/internal-users.facade';
import { INTERNAL_USER_ROLES } from '../../models/internal-user.model';

type RoleFilter = 'ALL' | InternalUserRole;
type StatusFilter = 'ALL' | UserStatus;

@Component({
  selector: 'app-internal-users-list',
  imports: [
    Avatar,
    Button,
    Card,
    Icon,
    InternalUserFormModal,
    LocalizedDatePipe,
    Modal,
    StatCard,
    StatusBadge,
    TranslocoPipe,
  ],
  providers: [...provideTranslocoScope('users')],
  templateUrl: './internal-users-list.html',
  styleUrl: './internal-users-list.scss',
})
export class InternalUsersList {
  protected readonly usersFacade = inject(InternalUsersFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly roles = INTERNAL_USER_ROLES;
  protected readonly currentUserId = computed(() => this.authFacade.currentUser()?.id ?? null);
  protected readonly search = signal('');
  protected readonly roleFilter = signal<RoleFilter>('ALL');
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly formOpen = signal(false);
  protected readonly editingUser = signal<AppUser | null>(null);
  protected readonly openMenuId = signal<string | null>(null);
  protected readonly statusTarget = signal<AppUser | null>(null);
  protected readonly changingStatus = signal(false);
  protected readonly sendingEmailId = signal<string | null>(null);

  protected readonly activeCount = computed(
    () => this.usersFacade.users().filter((user) => user.status === 'ACTIVE').length,
  );
  protected readonly adminCount = computed(
    () => this.usersFacade.users().filter((user) => user.role === 'ADMIN').length,
  );
  protected readonly coordinatorCount = computed(
    () => this.usersFacade.users().filter((user) => user.role === 'COORDINATOR').length,
  );
  protected readonly commercialCount = computed(
    () => this.usersFacade.users().filter((user) => user.role === 'COMMERCIAL').length,
  );

  protected readonly filteredUsers = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();
    return this.usersFacade
      .users()
      .filter((user) => {
        const matchesTerm =
          !term ||
          user.displayName.toLocaleLowerCase().includes(term) ||
          user.email.toLocaleLowerCase().includes(term) ||
          (user.jobTitle ?? '').toLocaleLowerCase().includes(term);
        return (
          matchesTerm &&
          (role === 'ALL' || user.role === role) &&
          (status === 'ALL' || user.status === status)
        );
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });

  protected readonly hasFilters = computed(
    () => !!this.search().trim() || this.roleFilter() !== 'ALL' || this.statusFilter() !== 'ALL',
  );

  constructor() {
    this.usersFacade.init();
  }

  @HostListener('document:click')
  protected closeActionMenu(): void {
    this.openMenuId.set(null);
  }

  @HostListener('document:keydown.escape')
  protected closeActionMenuWithKeyboard(): void {
    this.openMenuId.set(null);
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onRoleFilter(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as RoleFilter);
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.roleFilter.set('ALL');
    this.statusFilter.set('ALL');
  }

  protected toggleMenu(userId: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update((current) => (current === userId ? null : userId));
  }

  protected openCreate(): void {
    this.editingUser.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(user: AppUser): void {
    this.openMenuId.set(null);
    this.editingUser.set(user);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingUser.set(null);
  }

  protected confirmStatusChange(user: AppUser): void {
    this.openMenuId.set(null);
    if (user.id !== this.currentUserId()) this.statusTarget.set(user);
  }

  protected async changeStatus(): Promise<void> {
    const user = this.statusTarget();
    if (!user) return;
    const status: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.changingStatus.set(true);
    try {
      await this.usersFacade.setStatus(user.id, status);
      this.toast.success(
        this.transloco.translate(
          status === 'ACTIVE'
            ? 'users.internal.messages.activated'
            : 'users.internal.messages.deactivated',
        ),
      );
      this.statusTarget.set(null);
    } catch (error) {
      this.toast.error(
        error instanceof Error && error.message
          ? error.message
          : this.transloco.translate('users.internal.messages.statusError'),
      );
    } finally {
      this.changingStatus.set(false);
    }
  }

  protected async sendAccessEmail(user: AppUser): Promise<void> {
    this.openMenuId.set(null);
    this.sendingEmailId.set(user.id);
    try {
      await this.usersFacade.sendAccessEmail(user.email);
      this.toast.success(this.transloco.translate('users.internal.messages.accessEmailSent'));
    } catch (error) {
      this.toast.error(
        error instanceof Error && error.message
          ? error.message
          : this.transloco.translate('users.internal.messages.accessEmailError'),
      );
    } finally {
      this.sendingEmailId.set(null);
    }
  }

  protected roleKey(role: string): string {
    return `roles.${role}`;
  }

  protected roleColor(role: string): string {
    if (role === 'ADMIN') return 'purple';
    return role === 'COORDINATOR' ? 'blue' : 'teal';
  }
}
