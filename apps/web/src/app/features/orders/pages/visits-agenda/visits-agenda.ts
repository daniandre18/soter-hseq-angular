import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { Card } from '../../../../shared/components/card/card';
import { Icon } from '../../../../shared/components/icon/icon';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import type { OrderStatus, ServiceOrder } from '../../models/order.model';

type AgendaStatusFilter = OrderStatus | 'all';

interface CalendarDay {
  key: string;
  date: Date;
  dayNumber: number;
  currentMonth: boolean;
  today: boolean;
  visits: ServiceOrder[];
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const VISIBLE_VISITS_PER_DAY = 3;

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
  imports: [RouterLink, Card, Icon, StatusBadge, Avatar],
  templateUrl: './visits-agenda.html',
  styleUrl: './visits-agenda.scss',
})
export class VisitsAgenda {
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);
  protected readonly weekdays = WEEKDAYS;
  protected readonly visibleVisitsPerDay = VISIBLE_VISITS_PER_DAY;

  /** Un técnico solo debe ver su propia agenda (CLAUDE.md §3.4 "no puede
   *  consultar órdenes de otros técnicos") — `OrdersFacade.init()` ya filtra
   *  `orders()` a las suyas del lado de Firestore, pero el selector de
   *  "Técnico" no tiene sentido para él (no hay nadie más entre quien elegir)
   *  y sugiere una capacidad que no debería tener, así que se oculta. */
  protected readonly isTechnician = computed(() => this.authFacade.currentRole() === 'TECHNICIAN');

  protected readonly selectedTechnicianId = signal('all');
  protected readonly visibleMonth = signal(startOfDay(new Date()));

  /** Filtros combinables (CLAUDE.md §5: Signals para estado derivado — no
   *  hace falta RxJS `combineLatest` porque `orders()` ya vive en memoria
   *  como Signal, no como stream de Firestore por filtro). */
  protected readonly search = signal('');
  protected readonly statusFilter = signal<AgendaStatusFilter>('all');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly statusOptions = Object.entries(ORDER_STATUS_CONFIG) as [
    OrderStatus,
    { label: string; color: string; hex: string },
  ][];

  protected readonly hasActiveFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.selectedTechnicianId() !== 'all' ||
      this.dateFrom() !== '' ||
      this.dateTo() !== '',
  );

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
    this.visibleMonth().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
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

  constructor() {
    this.ordersFacade.init();
  }

  protected previousMonth(): void {
    this.changeMonth(-1);
  }

  protected nextMonth(): void {
    this.changeMonth(1);
  }

  protected goToToday(): void {
    this.visibleMonth.set(startOfDay(new Date()));
  }

  protected onTechnicianChange(event: Event): void {
    this.selectedTechnicianId.set((event.target as HTMLSelectElement).value);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
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
  }

  protected technicianNames(order: ServiceOrder): string {
    if (order.assignedTechnicianIds.length === 0) return 'Sin técnico asignado';
    return order.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id)).join(', ');
  }

  protected primaryTechnicianName(order: ServiceOrder): string {
    const technicianId = order.assignedTechnicianIds[0];
    return technicianId ? this.ordersFacade.technicianName(technicianId) : 'Sin técnico asignado';
  }

  protected primaryTechnicianSpecialty(order: ServiceOrder): string {
    const technicianId = order.assignedTechnicianIds[0];
    return (
      this.ordersFacade.technicians().find((technician) => technician.id === technicianId)
        ?.specialty ?? 'Técnico de campo'
    );
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  protected formatLongDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  protected statusLabel(order: ServiceOrder): string {
    return ORDER_STATUS_CONFIG[order.status].label;
  }

  protected statusColor(
    order: ServiceOrder,
  ): (typeof ORDER_STATUS_CONFIG)[ServiceOrder['status']]['color'] {
    return ORDER_STATUS_CONFIG[order.status].color;
  }

  private changeMonth(offset: number): void {
    const month = this.visibleMonth();
    this.visibleMonth.set(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }
}
