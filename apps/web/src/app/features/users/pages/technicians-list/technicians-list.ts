import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { TechniciansFacade } from '../../facades/technicians.facade';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { TechnicianFormModal } from '../../components/technician-form-modal/technician-form-modal';
import type { AppUser } from '../../../../core/models/app-user.model';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  RowActionsMenu,
  type RowMenuAction,
  type RowMenuActionSelection,
} from '../../../../shared/components/row-actions-menu/row-actions-menu';
import { releaseOnDestroy } from '../../../../shared/utils/release-on-destroy';

const PAGE_SIZE = 10;
const TECHNICIAN_ROW_ACTIONS: readonly RowMenuAction[] = [
  { id: 'edit', icon: 'square-pen', label: 'Editar técnico' },
  { id: 'delete', icon: 'trash-2', label: 'Eliminar', tone: 'danger' },
];

@Component({
  selector: 'app-technicians-list',
  imports: [Card, Button, StatusBadge, Avatar, Icon, Modal, TechnicianFormModal, RowActionsMenu],
  templateUrl: './technicians-list.html',
  styleUrl: './technicians-list.scss',
})
export class TechniciansList {
  protected readonly techniciansFacade = inject(TechniciansFacade);
  private readonly toast = inject(ToastService);

  protected readonly search = signal('');
  protected readonly visibleCount = signal(PAGE_SIZE);
  protected readonly formOpen = signal(false);
  protected readonly editingTechnician = signal<AppUser | null>(null);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly deletingTechnician = signal<AppUser | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly openActionsId = signal<string | null>(null);
  protected readonly rowActions = TECHNICIAN_ROW_ACTIONS;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.techniciansFacade
      .technicians()
      .filter(
        (technician) =>
          !term ||
          technician.displayName.toLowerCase().includes(term) ||
          technician.email.toLowerCase().includes(term),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });
  protected readonly hasActiveFilters = computed(() => this.search().trim().length > 0);

  protected readonly visibleTechnicians = computed(() =>
    this.filtered().slice(0, this.visibleCount()),
  );
  protected readonly hasMore = computed(() => this.visibleCount() < this.filtered().length);
  protected readonly hasCollapsed = computed(() => this.visibleCount() > PAGE_SIZE);
  protected readonly nextBatchSize = computed(() =>
    Math.min(PAGE_SIZE, this.filtered().length - this.visibleCount()),
  );

  constructor() {
    releaseOnDestroy(this.techniciansFacade.init());
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.visibleCount.set(PAGE_SIZE);
  }

  protected showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  protected showAll(): void {
    this.visibleCount.set(this.filtered().length);
  }

  protected showLess(): void {
    this.visibleCount.set(PAGE_SIZE);
  }

  protected openCreate(): void {
    this.editingTechnician.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(technician: AppUser): void {
    this.openActionsId.set(null);
    this.editingTechnician.set(technician);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingTechnician.set(null);
  }

  protected async toggleStatus(technician: AppUser): Promise<void> {
    this.openActionsId.set(null);
    this.togglingId.set(technician.id);
    try {
      await this.techniciansFacade.setStatus(
        technician.id,
        technician.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      );
      this.toast.success(
        technician.status === 'ACTIVE'
          ? 'Técnico desactivado correctamente.'
          : 'Técnico activado correctamente.',
      );
    } catch (error) {
      this.toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo cambiar el estado del técnico.',
      );
    } finally {
      this.togglingId.set(null);
    }
  }

  protected confirmDelete(technician: AppUser): void {
    this.openActionsId.set(null);
    this.deleteError.set(null);
    this.deletingTechnician.set(technician);
  }

  protected toggleActions(technicianId: string, event: Event): void {
    event.stopPropagation();
    this.openActionsId.update((current) => (current === technicianId ? null : technicianId));
  }

  protected handleRowAction(selection: RowMenuActionSelection, technician: AppUser): void {
    if (selection.id === 'edit') {
      this.openEdit(technician);
    } else if (selection.id === 'delete') {
      this.confirmDelete(technician);
    }
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeActions(): void {
    this.openActionsId.set(null);
  }

  protected cancelDelete(): void {
    this.deletingTechnician.set(null);
  }

  protected async deleteConfirmed(): Promise<void> {
    const technician = this.deletingTechnician();
    if (!technician) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.techniciansFacade.deleteTechnician(technician.id);
      this.deletingTechnician.set(null);
      this.toast.success('Técnico eliminado correctamente.');
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'No se pudo eliminar el técnico.';
      this.deleteError.set(message);
      this.toast.error(message);
    } finally {
      this.deleting.set(false);
    }
  }
}
