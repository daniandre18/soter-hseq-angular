import { Component, inject, input, output, signal } from '@angular/core';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { ClientTagsFacade } from '../../facades/client-tags.facade';
import { CLIENT_TAG_COLOR_PALETTE } from '../../models/client-tag.model';

@Component({
  selector: 'app-client-tags-manager-modal',
  imports: [Modal, Button, Icon],
  templateUrl: './client-tags-manager-modal.html',
  styleUrl: './client-tags-manager-modal.scss',
})
export class ClientTagsManagerModal {
  private readonly tagsFacade = inject(ClientTagsFacade);

  readonly open = input(false);
  readonly closeRequested = output<void>();

  protected readonly tags = this.tagsFacade.tags;
  protected readonly palette = CLIENT_TAG_COLOR_PALETTE;

  protected readonly creating = signal(false);
  protected readonly newLabel = signal('');
  protected readonly selectedColor = signal(CLIENT_TAG_COLOR_PALETTE[0]);
  protected readonly saving = signal(false);
  protected readonly deletingId = signal<string | null>(null);

  protected close(): void {
    this.creating.set(false);
    this.closeRequested.emit();
  }

  protected openCreateForm(): void {
    this.newLabel.set('');
    this.selectedColor.set(CLIENT_TAG_COLOR_PALETTE[0]);
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  protected async saveNewTag(): Promise<void> {
    const label = this.newLabel().trim();
    if (!label) {
      return;
    }
    this.saving.set(true);
    try {
      await this.tagsFacade.addTag({ label, color: this.selectedColor() });
      this.creating.set(false);
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteTag(id: string): Promise<void> {
    this.deletingId.set(id);
    try {
      await this.tagsFacade.deleteTag(id);
    } finally {
      this.deletingId.set(null);
    }
  }
}
