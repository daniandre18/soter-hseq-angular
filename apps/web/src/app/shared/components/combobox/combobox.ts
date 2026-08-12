import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';

export interface ComboboxOption {
  value: string;
  label: string;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

let nextListboxId = 0;

/**
 * Select con búsqueda integrada (patrón ARIA combobox). Presentacional puro:
 * recibe sus opciones por `input()` y expone la selección como `model()` —
 * quien lo usa decide de dónde vienen las opciones (estático, import
 * dinámico, etc.), este componente no conoce esa fuente.
 */
@Component({
  selector: 'app-combobox',
  imports: [Icon, Skeleton, TranslocoPipe],
  templateUrl: './combobox.html',
  styleUrl: './combobox.scss',
})
export class Combobox {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly options = input<ComboboxOption[]>([]);
  readonly value = model<string>('');
  /** Vacío = usa el placeholder genérico traducido (`common.combobox.searchPlaceholder`). */
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly loading = input(false);
  /** Vacío = usa el mensaje genérico traducido (`common.combobox.noResults`). */
  readonly emptyMessage = input('');
  readonly ariaLabel = input('');
  /** Permite asociar un `<label for>` externo con el input interno. */
  readonly inputId = input<string | null>(null);

  protected readonly listboxId = `combobox-listbox-${nextListboxId++}`;
  protected readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);

  protected readonly selectedOption = computed(() =>
    this.options().find((option) => option.value === this.value()),
  );

  protected readonly filteredOptions = computed(() => {
    const term = normalize(this.query());
    const options = this.options();
    return term ? options.filter((option) => normalize(option.label).includes(term)) : options;
  });

  /** Texto mostrado en el input: la etiqueta seleccionada en reposo, o lo
   *  que el usuario está escribiendo mientras busca. */
  protected readonly displayValue = computed(() =>
    this.isOpen() ? this.query() : (this.selectedOption()?.label ?? ''),
  );

  protected onFocus(): void {
    if (this.disabled()) {
      return;
    }
    this.query.set('');
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  protected selectOption(option: ComboboxOption): void {
    this.value.set(option.value);
    this.isOpen.set(false);
    this.query.set('');
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.value.set('');
    this.query.set('');
  }

  protected onKeydown(event: KeyboardEvent): void {
    const options = this.filteredOptions();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.isOpen.set(true);
        this.activeIndex.update((index) => Math.min(index + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((index) => Math.max(index - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const active = options[this.activeIndex()];
        if (active) {
          this.selectOption(active);
        }
        break;
      }
      case 'Escape':
        this.isOpen.set(false);
        this.query.set('');
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
      this.query.set('');
    }
  }
}
