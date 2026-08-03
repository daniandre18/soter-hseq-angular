import { Component, computed, inject, signal } from '@angular/core';
import { TechniciansFacade } from '../../facades/technicians.facade';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { TechnicianFormModal } from '../../components/technician-form-modal/technician-form-modal';
import type { AppUser } from '../../../../core/models/app-user.model';

@Component({
  selector: 'app-technicians-list',
  imports: [Card, Button, StatusBadge, Avatar, Icon, TechnicianFormModal],
  templateUrl: './technicians-list.html',
  styleUrl: './technicians-list.scss',
})
export class TechniciansList {
  protected readonly techniciansFacade = inject(TechniciansFacade);

  protected readonly search = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editingTechnician = signal<AppUser | null>(null);
  protected readonly togglingId = signal<string | null>(null);

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

  constructor() {
    this.techniciansFacade.init();
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected openCreate(): void {
    this.editingTechnician.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(technician: AppUser): void {
    this.editingTechnician.set(technician);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingTechnician.set(null);
  }

  protected async toggleStatus(technician: AppUser): Promise<void> {
    this.togglingId.set(technician.id);
    try {
      await this.techniciansFacade.setStatus(
        technician.id,
        technician.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      );
    } finally {
      this.togglingId.set(null);
    }
  }
}
