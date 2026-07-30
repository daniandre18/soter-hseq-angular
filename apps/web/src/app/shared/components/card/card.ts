import { Component, input, output } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  readonly padding = input<CardPadding>('md');
  readonly clickable = input(false);
  readonly cardClick = output<void>();

  protected onClick(): void {
    if (this.clickable()) {
      this.cardClick.emit();
    }
  }

  protected onKeydownSpace(event: Event): void {
    if (this.clickable()) {
      event.preventDefault();
      this.onClick();
    }
  }
}
