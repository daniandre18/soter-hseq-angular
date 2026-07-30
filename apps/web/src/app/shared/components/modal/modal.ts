import { Component, HostListener, effect, input, output } from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

let nextId = 0;

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly size = input<ModalSize>('md');
  readonly closeRequested = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;

  constructor() {
    effect((onCleanup) => {
      if (this.open()) {
        document.body.style.overflow = 'hidden';
        onCleanup(() => {
          document.body.style.overflow = '';
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.closeRequested.emit();
    }
  }

  protected onBackdropClick(): void {
    this.closeRequested.emit();
  }
}
