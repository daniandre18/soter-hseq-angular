import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon, type IconName } from '../icon/icon';

export interface RowMenuAction {
  readonly id: string;
  readonly icon: IconName;
  readonly label?: string;
  readonly labelKey?: string;
  readonly tone?: 'default' | 'danger';
  readonly disabled?: boolean;
}

export interface RowMenuActionSelection {
  readonly id: string;
  readonly event: Event;
}

@Component({
  selector: 'app-row-actions-menu',
  imports: [Icon, TranslocoPipe],
  templateUrl: './row-actions-menu.html',
  styleUrl: './row-actions-menu.scss',
})
export class RowActionsMenu {
  readonly open = input.required<boolean>();
  readonly triggerLabel = input.required<string>();
  readonly actions = input.required<readonly RowMenuAction[]>();

  readonly toggleRequested = output<Event>();
  readonly actionSelected = output<RowMenuActionSelection>();

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.toggleRequested.emit(event);
  }

  protected select(actionId: string, event: Event): void {
    event.stopPropagation();
    this.actionSelected.emit({ id: actionId, event });
  }
}
