import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { Card } from '../../../../shared/components/card/card';
import { Icon } from '../../../../shared/components/icon/icon';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import type { OrderStatus, ServiceOrder } from '../../models/order.model';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../../core/i18n/language.service';

type AgendaStatusFilter = OrderStatus | 'all';

interface CalendarDay {
  key: string;
  date: Date;
  dayNumber: number;
  currentMonth: boolean;
  today: boolean;
  visits: ServiceOrder[];
}

const VISIBLE_VISITS_PER_DAY = 3;
let nextClientListboxId = 0;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

@Component({
  selector: 'app-visits-agenda',
  imports: [RouterLink, Card, Icon, StatusBadge, Avatar, TranslocoPipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './visits-agenda.html',
  styleUrl: './visits-agenda.scss',
})
export class VisitsAgenda {
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  protected readonly clientListboxId = `agenda-client-listbox-${nextClientListboxId++}`;
  protected readonly visibleVisitsPerDay = VISIBLE_VISITS_PER_DAY;

  /** Cabecera de días de la grilla (lunes primero, según `mondayOffset` de
   *  `calendarDays`). Se deriva del locale activo en vez de hardcodear
   *  español, para que reaccione al cambio de idioma. */
  protected readonly weekdays = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.language.currentLocale(), { weekday: 'short' });
    const referenceMonday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(referenceMonday);
      date.setDate(referenceMonday.getDate() + index);
      return formatter.format(date);
    });
  });

  /** El selector "Técnico" solo tiene sentido para roles internos con
   *  visibilidad de todo el equipo. Un TECHNICIAN solo debe ver su propia
   *  agenda (CLAUDE.md §3.4 "no puede consultar órdenes de otros técnicos")
   *  y un VIEWER (perfil de cliente, CLAUDE.md §3.5) solo ve sus propias
   *  visitas — `OrdersFacade.init()` ya filtra `orders()` del lado de
   *  Firestore para ambos, pero además `OrdersFacade.technicians()` viene
   *  vacío para VIEWER (Rules no le permiten listar `users`), así que el
   *  selector quedaría vacío y sin sentido si se mostrara. */
  protected readonly showTechnicianFilter = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COMMERCIAL' || role === 'COORDINATOR';
  });

  protected readonly selectedTechnicianId = signal('all');
  protected readonly visibleMonth = signal(startOfDay(new Date()));

  /** Día elegido en la franja deslizable de la vista mobile (CLAUDE.md
   *  §15 responsive): al seleccionar un día, la tarjeta "Próximas visitas"
   *  cambia a mostrar las visitas de ese día. `null` = sin selección,
   *  vuelve a mostrar las próximas visitas. Se limpia al cambiar de mes. */
  protected readonly selectedDayKey = signal<string | null>(null);

  /** Hoja inferior de filtros avanzados en mobile (estado, técnico, fechas). */
  protected readonly filtersSheetOpen = signal(false);

  /** Filtros combinables (CLAUDE.md §5: Signals para estado derivado — no
   *  hace falta RxJS `combineLatest` porque `orders()` ya vive en memoria
   *  como Signal, no como stream de Firestore por filtro). */
  protected readonly search = signal('');
  protected readonly statusFilter = signal<AgendaStatusFilter>('all');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  /** Lista desplegable de clientes bajo el buscador (CLAUDE.md §15: buscar
   *  por texto libre es propenso a error de tipeo; mostrar la lista real
   *  de clientes con visitas y filtrarla en vivo es más rápido y preciso). */
  protected readonly showClientSuggestions = signal(false);

  protected readonly statusOptions = Object.entries(ORDER_STATUS_CONFIG) as [
    OrderStatus,
    { translationKey: string; color: string; hex: string },
  ][];

  protected readonly clientOptions = computed(() => {
    const byId = new Map<string, string>();
    for (const order of this.ordersFacade.orders()) {
      if (!byId.has(order.clientId)) {
        byId.set(order.clientId, order.clientBusinessName);
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.localeCompare(b, 'es'));
  });

  protected readonly clientSuggestions = computed(() => {
    const term = this.search().trim().toLowerCase();
    const options = this.clientOptions();
    return term ? options.filter((name) => name.toLowerCase().includes(term)) : options;
  });

  protected readonly hasActiveFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.selectedTechnicianId() !== 'all' ||
      this.dateFrom() !== '' ||
      this.dateTo() !== '',
  );

  /** Cuenta solo los filtros "avanzados" (los que viven en la hoja mobile);
   *  la búsqueda queda fuera porque su campo permanece visible siempre. */
  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.statusFilter() !== 'all') count++;
    if (this.showTechnicianFilter() && this.selectedTechnicianId() !== 'all') count++;
    if (this.dateFrom() !== '') count++;
    if (this.dateTo() !== '') count++;
    return count;
  });

  protected readonly scheduledVisits = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const technicianId = this.selectedTechnicianId();
    // Límites inclusivos de día completo a partir de <input type="date">
    // (valor "aaaa-mm-dd", sin hora) — evita descartar visitas por hora.
    const from = this.dateFrom() ? new Date(`${this.dateFrom()}T00:00:00`) : null;
    const to = this.dateTo() ? new Date(`${this.dateTo()}T23:59:59.999`) : null;

    return this.ordersFacade
      .orders()
      .filter((order) => {
        if (!order.scheduledStart) {
          return false;
        }
        if (technicianId !== 'all' && !order.assignedTechnicianIds.includes(technicianId)) {
          return false;
        }
        if (status !== 'all' && order.status !== status) {
          return false;
        }
        if (from && order.scheduledStart < from) {
          return false;
        }
        if (to && order.scheduledStart > to) {
          return false;
        }
        if (term && !order.clientBusinessName.toLowerCase().includes(term)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
  });

  protected readonly monthLabel = computed(() =>
    this.visibleMonth().toLocaleDateString(this.language.currentLocale(), {
      month: 'long',
      year: 'numeric',
    }),
  );

  protected readonly calendarDays = computed<CalendarDay[]>(() => {
    const month = this.visibleMonth();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
    const visitsByDay = new Map<string, ServiceOrder[]>();
    for (const visit of this.scheduledVisits()) {
      const key = dateKey(visit.scheduledStart!);
      visitsByDay.set(key, [...(visitsByDay.get(key) ?? []), visit]);
    }

    const todayKey = dateKey(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      );
      const key = dateKey(date);
      return {
        key,
        date,
        dayNumber: date.getDate(),
        currentMonth: date.getMonth() === month.getMonth(),
        today: key === todayKey,
        visits: visitsByDay.get(key) ?? [],
      };
    });
  });

  protected readonly upcomingVisits = computed(() => {
    const now = new Date();
    return this.scheduledVisits()
      .filter((order) =>
        order.scheduledEnd ? order.scheduledEnd >= now : order.scheduledStart! >= now,
      )
      .slice(0, 6);
  });

  protected readonly dayVisits = computed(() => {
    const key = this.selectedDayKey();
    if (!key) return [];
    return this.scheduledVisits().filter((visit) => dateKey(visit.scheduledStart!) === key);
  });

  /** Lista mostrada en la tarjeta lateral: las visitas del día elegido en
   *  la franja mobile, o las próximas visitas cuando no hay día elegido
   *  (comportamiento por defecto, igual en desktop y mobile). */
  protected readonly displayedVisits = computed(() =>
    this.selectedDayKey() ? this.dayVisits() : this.upcomingVisits(),
  );

  protected readonly selectedDayLabel = computed(() => {
    const key = this.selectedDayKey();
    if (!key) return '';
    const [year, month, day] = key.split('-').map(Number);
    return this.formatLongDate(new Date(year, month, day));
  });

  protected readonly displayedSubtitle = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const count = this.displayedVisits().length;
    if (this.selectedDayKey()) {
      const key = count === 1 ? 'orders.agenda.visitsSelectedDayOne' : 'orders.agenda.visitsSelectedDayOther';
      return this.transloco.translate(key, { count });
    }
    const key = count === 1 ? 'orders.agenda.scheduledOne' : 'orders.agenda.scheduledOther';
    return this.transloco.translate(key, { count });
  });

  protected readonly displayedEmptyMessage = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    return this.transloco.translate(
      this.selectedDayKey() ? 'orders.agenda.noVisitsForDay' : 'orders.agenda.noUpcomingVisitsFiltered',
    );
  });

  constructor() {
    this.ordersFacade.init();

    effect((onCleanup) => {
      if (this.filtersSheetOpen()) {
        document.body.style.overflow = 'hidden';
        onCleanup(() => {
          document.body.style.overflow = '';
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.filtersSheetOpen()) {
      this.closeFiltersSheet();
    }
    if (this.showClientSuggestions()) {
      this.showClientSuggestions.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (
      this.showClientSuggestions() &&
      !this.elementRef.nativeElement.contains(event.target as Node)
    ) {
      this.showClientSuggestions.set(false);
    }
  }

  protected previousMonth(): void {
    this.changeMonth(-1);
  }

  protected nextMonth(): void {
    this.changeMonth(1);
  }

  protected goToToday(): void {
    this.visibleMonth.set(startOfDay(new Date()));
    this.selectedDayKey.set(null);
  }

  protected onDayPillClick(day: CalendarDay): void {
    this.selectedDayKey.update((current) => (current === day.key ? null : day.key));
  }

  protected clearSelectedDay(): void {
    this.selectedDayKey.set(null);
  }

  protected weekdayShort(date: Date): string {
    return new Intl.DateTimeFormat(this.language.currentLocale(), { weekday: 'short' }).format(date);
  }

  protected openFiltersSheet(): void {
    this.filtersSheetOpen.set(true);
  }

  protected closeFiltersSheet(): void {
    this.filtersSheetOpen.set(false);
  }

  protected onTechnicianChange(event: Event): void {
    this.selectedTechnicianId.set((event.target as HTMLSelectElement).value);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.showClientSuggestions.set(true);
  }

  protected onSearchFocus(): void {
    this.showClientSuggestions.set(true);
  }

  protected selectClient(name: string): void {
    this.search.set(name);
    this.showClientSuggestions.set(false);
  }

  protected clearSearch(): void {
    this.search.set('');
    this.showClientSuggestions.set(false);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as AgendaStatusFilter);
  }

  protected onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  protected onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.selectedTechnicianId.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.selectedDayKey.set(null);
    this.showClientSuggestions.set(false);
  }

  protected technicianNames(order: ServiceOrder): string {
    if (order.assignedTechnicianIds.length === 0) {
      return this.transloco.translate('orders.unassignedTechnician');
    }
    if (order.assignedTechnicianNames?.length) {
      return order.assignedTechnicianNames.join(', ');
    }
    return order.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id)).join(', ');
  }

  protected primaryTechnicianName(order: ServiceOrder): string {
    if (order.assignedTechnicianNames?.[0]) {
      return order.assignedTechnicianNames[0];
    }
    const technicianId = order.assignedTechnicianIds[0];
    return technicianId
      ? this.ordersFacade.technicianName(technicianId)
      : this.transloco.translate('orders.unassignedTechnician');
  }

  protected primaryTechnicianSpecialty(order: ServiceOrder): string {
    const technicianId = order.assignedTechnicianIds[0];
    const specialty = this.ordersFacade
      .technicians()
      .find((technician) => technician.id === technicianId)?.specialty;
    return specialty ?? this.transloco.translate('orders.agenda.fieldTechnician');
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString(this.language.currentLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  protected formatShortMonth(date: Date): string {
    return date.toLocaleDateString(this.language.currentLocale(), { month: 'short' });
  }

  protected formatLongDate(date: Date): string {
    return date.toLocaleDateString(this.language.currentLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  protected statusLabel(order: ServiceOrder): string {
    this.language.currentLanguage();
    return this.transloco.translate(ORDER_STATUS_CONFIG[order.status].translationKey);
  }

  protected statusColor(
    order: ServiceOrder,
  ): (typeof ORDER_STATUS_CONFIG)[ServiceOrder['status']]['color'] {
    return ORDER_STATUS_CONFIG[order.status].color;
  }

  private changeMonth(offset: number): void {
    const month = this.visibleMonth();
    this.visibleMonth.set(new Date(month.getFullYear(), month.getMonth() + offset, 1));
    this.selectedDayKey.set(null);
  }
}
