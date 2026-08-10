import type { OrderStatus, ServiceOrder } from '../../orders/models/order.model';
import type { QuoteStatus } from '../../quotes/models/quote.model';

export interface DashboardSnapshot {
  orderStatusCounts: Partial<Record<OrderStatus, number>>;
  quoteStatusCounts: Partial<Record<QuoteStatus, number>>;
  overdueOrderCount: number;
  todayVisitsCount: number;
  visitsThisWeekCount: number;
  techniciansInFieldCount: number;
  technicianCount: number;
  recentOrders: ServiceOrder[];
  upcomingVisits: ServiceOrder[];
  calculatedAt?: Date;
}

export const EMPTY_DASHBOARD_SNAPSHOT: DashboardSnapshot = {
  orderStatusCounts: {},
  quoteStatusCounts: {},
  overdueOrderCount: 0,
  todayVisitsCount: 0,
  visitsThisWeekCount: 0,
  techniciansInFieldCount: 0,
  technicianCount: 0,
  recentOrders: [],
  upcomingVisits: [],
};
