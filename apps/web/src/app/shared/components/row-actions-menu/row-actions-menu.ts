import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
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

interface PopoverPosition {
  readonly top: number;
  readonly right: number;
}

@Component({
  selector: 'app-row-actions-menu',
  imports: [Icon, TranslocoPipe],
  templateUrl: './row-actions-menu.html',
  styleUrl: './row-actions-menu.scss',
})
export class RowActionsMenu {
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly open = input.required<boolean>();
  readonly triggerLabel = input.required<string>();
  readonly actions = input.required<readonly RowMenuAction[]>();

  readonly toggleRequested = output<Event>();
  readonly actionSelected = output<RowMenuActionSelection>();

  /** `position: fixed` en vez de `absolute` (ver row-actions-menu.scss):
   *  las filas viven dentro de `.table-scroll` (`overflow-x: auto`), y un
   *  popover `absolute` queda recortado ahí porque el navegador computa
   *  `overflow-y` también en modo clip cuando `overflow-x` no es `visible`
   *  — verificado en Chrome real, no solo por la spec. `fixed` con
   *  coordenadas calculadas en JS escapa de ese recorte sin mover el nodo
   *  del DOM, así que el `target.closest('.algo-wrapper')` que cada
   *  listado usa para cerrar al hacer click afuera sigue funcionando igual. */
  protected readonly position = signal<PopoverPosition | null>(null);

  constructor() {
    effect((onCleanup) => {
      if (!this.open()) {
        this.position.set(null);
        return;
      }
      const rect = this.trigger().nativeElement.getBoundingClientRect();
      this.position.set({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });

      // Reposicionar durante el scroll (incluido el horizontal de la propia
      // tabla) es más complejo de lo que vale para un menú de acciones —
      // cerrar es el mismo criterio que usan la mayoría de menús flotantes.
      // `capture: true` es necesario porque `scroll` no hace bubbling; sin
      // captura, un scroll dentro de `.table-scroll` nunca llegaría aquí.
      const requestClose = (event: Event) => this.toggleRequested.emit(event);
      document.addEventListener('scroll', requestClose, { capture: true, once: true });
      window.addEventListener('resize', requestClose, { once: true });
      onCleanup(() => {
        document.removeEventListener('scroll', requestClose, true);
        window.removeEventListener('resize', requestClose);
      });
    });
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.toggleRequested.emit(event);
  }

  protected select(actionId: string, event: Event): void {
    event.stopPropagation();
    this.actionSelected.emit({ id: actionId, event });
  }
}
