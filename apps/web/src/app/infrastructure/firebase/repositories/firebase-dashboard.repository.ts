import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import type { DashboardRepository } from '../../../features/dashboard/domain/dashboard.repository';
import type { DashboardSnapshot } from '../../../features/dashboard/models/dashboard-snapshot.model';
import { ORDER_STATUS_CONFIG } from '../../../features/orders/models/order-status-config';
import type { OrderStatus } from '../../../features/orders/models/order.model';
import { QUOTE_STATUS_CONFIG } from '../../../features/quotes/models/quote-status-config';
import type { QuoteStatus } from '../../../features/quotes/models/quote.model';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toServiceOrder } from '../mappers/service-order.mapper';
import { toDate } from '../mappers/firestore.mapper';

const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
];
const ORDER_STATUSES = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];
const QUOTE_STATUSES = Object.keys(QUOTE_STATUS_CONFIG) as QuoteStatus[];
const METRICS_MAX_AGE_MS = 5 * 60 * 1000;

function mapDashboardSnapshot(data: DocumentData): DashboardSnapshot {
  const mapOrders = (value: unknown) =>
    Array.isArray(value)
      ? value.map((order) => {
          const document = order as DocumentData;
          return toServiceOrder(String(document['id']), document);
        })
      : [];
  return {
    orderStatusCounts: data['orderStatusCounts'] ?? {},
    quoteStatusCounts: data['quoteStatusCounts'] ?? {},
    overdueOrderCount: data['overdueOrderCount'] ?? 0,
    todayVisitsCount: data['todayVisitsCount'] ?? 0,
    visitsThisWeekCount: data['visitsThisWeekCount'] ?? 0,
    techniciansInFieldCount: data['techniciansInFieldCount'] ?? 0,
    technicianCount: data['technicianCount'] ?? 0,
    recentOrders: mapOrders(data['recentOrders']),
    upcomingVisits: mapOrders(data['upcomingVisits']),
    calculatedAt: toDate(data['calculatedAt']),
  };
}

function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfNextLocalDay(date: Date): Date {
  const result = startOfLocalDay(date);
  result.setDate(result.getDate() + 1);
  return result;
}

function startOfLocalWeek(date: Date): Date {
  const result = startOfLocalDay(date);
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  return result;
}

function startOfNextLocalWeek(date: Date): Date {
  const result = startOfLocalWeek(date);
  result.setDate(result.getDate() + 7);
  return result;
}

async function countByStatus<TStatus extends string>(
  ref: CollectionReference<DocumentData>,
  statuses: readonly TStatus[],
): Promise<Partial<Record<TStatus, number>>> {
  const entries = await Promise.all(
    statuses.map(async (status) => {
      const snapshot = await getCountFromServer(query(ref, where('status', '==', status)));
      return [status, snapshot.data().count] as const;
    }),
  );
  return Object.fromEntries(entries) as Partial<Record<TStatus, number>>;
}

/**
 * Lee únicamente agregados y ventanas pequeñas. A diferencia de los
 * repositorios operativos, no abre listeners sobre colecciones completas.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseDashboardRepository implements DashboardRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchSnapshot(): Observable<DashboardSnapshot> {
    return new Observable<DashboardSnapshot>((subscriber) => {
      let generation = 0;
      const metricsRef = doc(this.firestore, 'dashboardMetrics', 'current');
      const unsubscribe = onSnapshot(
        metricsRef,
        (snapshot) => {
          const currentGeneration = ++generation;
          const data = snapshot.data();
          const calculatedAt = data ? toDate(data['calculatedAt']) : undefined;
          const fresh =
            calculatedAt !== undefined && Date.now() - calculatedAt.getTime() <= METRICS_MAX_AGE_MS;

          if (data && fresh) {
            subscriber.next(mapDashboardSnapshot(data));
            return;
          }

          void this.loadSnapshot(new Date()).then(
            (fallback) => {
              if (generation === currentGeneration) {
                subscriber.next(fallback);
              }
            },
            (error: unknown) => {
              if (generation === currentGeneration) {
                subscriber.error(error);
              }
            },
          );
        },
        (error) => subscriber.error(error),
      );
      return () => {
        generation += 1;
        unsubscribe();
      };
    });
  }

  async loadSnapshot(now: Date): Promise<DashboardSnapshot> {
    const ordersRef = collection(this.firestore, 'orders');
    const quotesRef = collection(this.firestore, 'quotes');
    const usersRef = collection(this.firestore, 'users');
    const todayStart = startOfLocalDay(now);
    const tomorrowStart = startOfNextLocalDay(now);
    const weekStart = startOfLocalWeek(now);
    const nextWeekStart = startOfNextLocalWeek(now);

    const [
      orderStatusCounts,
      quoteStatusCounts,
      overdueSnapshot,
      todayVisitsSnapshot,
      weekVisitsSnapshot,
      inProgressSnapshot,
      techniciansSnapshot,
      recentSnapshot,
      upcomingSnapshot,
    ] = await Promise.all([
      countByStatus(ordersRef, ORDER_STATUSES),
      countByStatus(quotesRef, QUOTE_STATUSES),
      getCountFromServer(
        query(
          ordersRef,
          where('status', 'in', OPEN_ORDER_STATUSES),
          where('scheduledEnd', '<', now),
        ),
      ),
      getCountFromServer(
        query(
          ordersRef,
          where('scheduledStart', '>=', todayStart),
          where('scheduledStart', '<', tomorrowStart),
        ),
      ),
      getCountFromServer(
        query(
          ordersRef,
          where('scheduledStart', '>=', weekStart),
          where('scheduledStart', '<', nextWeekStart),
        ),
      ),
      getDocs(query(ordersRef, where('status', '==', 'IN_PROGRESS'))),
      getCountFromServer(query(usersRef, where('role', '==', 'TECHNICIAN'))),
      getDocs(query(ordersRef, orderBy('createdAt', 'desc'), limit(5))),
      getDocs(
        query(
          ordersRef,
          where('status', 'in', OPEN_ORDER_STATUSES),
          where('scheduledStart', '>=', now),
          orderBy('scheduledStart', 'asc'),
          limit(5),
        ),
      ),
    ]);

    const techniciansInField = new Set<string>();
    for (const orderSnapshot of inProgressSnapshot.docs) {
      const assignedIds = orderSnapshot.data()['assignedTechnicianIds'];
      if (Array.isArray(assignedIds)) {
        assignedIds.forEach((id) => {
          if (typeof id === 'string') {
            techniciansInField.add(id);
          }
        });
      }
    }

    return {
      orderStatusCounts,
      quoteStatusCounts,
      overdueOrderCount: overdueSnapshot.data().count,
      todayVisitsCount: todayVisitsSnapshot.data().count,
      visitsThisWeekCount: weekVisitsSnapshot.data().count,
      techniciansInFieldCount: techniciansInField.size,
      technicianCount: techniciansSnapshot.data().count,
      recentOrders: recentSnapshot.docs.map((snapshot) =>
        toServiceOrder(snapshot.id, snapshot.data()),
      ),
      upcomingVisits: upcomingSnapshot.docs.map((snapshot) =>
        toServiceOrder(snapshot.id, snapshot.data()),
      ),
      calculatedAt: now,
    };
  }
}
