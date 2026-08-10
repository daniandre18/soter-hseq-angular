import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

const OPEN_ORDER_STATUSES = [
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
] as const;
const ORDER_STATUSES = [
  'DRAFT',
  ...OPEN_ORDER_STATUSES,
  'APPROVED',
  'CLOSED',
  'CANCELLED',
] as const;
const QUOTE_STATUSES = [
  'DRAFT',
  'SENT',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED',
] as const;

function startOfBogotaDay(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00-05:00`);
}

function startOfNextDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

function startOfBogotaWeek(date: Date): Date {
  const result = startOfBogotaDay(date);
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return result;
}

function startOfNextWeek(date: Date): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + 7);
  return result;
}

async function countByStatus(
  collectionName: 'orders' | 'quotes',
  statuses: readonly string[],
): Promise<Record<string, number>> {
  const collection = getFirestore().collection(collectionName);
  const entries = await Promise.all(
    statuses.map(async (status) => {
      const snapshot = await collection.where('status', '==', status).count().get();
      return [status, snapshot.data().count] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function orderSummary(
  snapshot: FirebaseFirestore.QueryDocumentSnapshot,
): FirebaseFirestore.DocumentData {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    orderNumber: data['orderNumber'] ?? snapshot.id,
    clientId: data['clientId'] ?? '',
    clientBusinessName: data['clientBusinessName'] ?? '',
    assignedTechnicianIds: data['assignedTechnicianIds'] ?? [],
    assignedTechnicianNames: data['assignedTechnicianNames'] ?? [],
    title: data['title'] ?? data['serviceSummary'] ?? '',
    priority: data['priority'] ?? 'MEDIUM',
    progress: data['progress'] ?? 0,
    status: data['status'] ?? 'DRAFT',
    serviceSummary: data['serviceSummary'] ?? data['title'] ?? '',
    evidenceCount: data['evidenceCount'] ?? 0,
    createdAt: data['createdAt'] ?? Timestamp.fromMillis(0),
    createdBy: data['createdBy'] ?? 'system',
    updatedAt: data['updatedAt'] ?? data['createdAt'] ?? Timestamp.fromMillis(0),
    updatedBy: data['updatedBy'] ?? data['createdBy'] ?? 'system',
    ...(data['quoteId'] ? { quoteId: data['quoteId'] } : {}),
    ...(data['quoteNumber'] ? { quoteNumber: data['quoteNumber'] } : {}),
    ...(data['dueDate'] ? { dueDate: data['dueDate'] } : {}),
    ...(data['scheduledStart'] ? { scheduledStart: data['scheduledStart'] } : {}),
    ...(data['scheduledEnd'] ? { scheduledEnd: data['scheduledEnd'] } : {}),
  };
}

async function calculateDashboardMetrics(now: Date): Promise<FirebaseFirestore.DocumentData> {
  const firestore = getFirestore();
  const orders = firestore.collection('orders');
  const users = firestore.collection('users');
  const todayStart = startOfBogotaDay(now);
  const tomorrowStart = startOfNextDay(todayStart);
  const weekStart = startOfBogotaWeek(now);
  const nextWeekStart = startOfNextWeek(weekStart);

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
    countByStatus('orders', ORDER_STATUSES),
    countByStatus('quotes', QUOTE_STATUSES),
    orders
      .where('status', 'in', OPEN_ORDER_STATUSES)
      .where('scheduledEnd', '<', now)
      .count()
      .get(),
    orders
      .where('scheduledStart', '>=', todayStart)
      .where('scheduledStart', '<', tomorrowStart)
      .count()
      .get(),
    orders
      .where('scheduledStart', '>=', weekStart)
      .where('scheduledStart', '<', nextWeekStart)
      .count()
      .get(),
    orders.where('status', '==', 'IN_PROGRESS').get(),
    users.where('role', '==', 'TECHNICIAN').count().get(),
    orders.orderBy('createdAt', 'desc').limit(5).get(),
    orders
      .where('status', 'in', OPEN_ORDER_STATUSES)
      .where('scheduledStart', '>=', now)
      .orderBy('scheduledStart', 'asc')
      .limit(5)
      .get(),
  ]);

  const techniciansInField = new Set<string>();
  for (const order of inProgressSnapshot.docs) {
    const assignedIds = order.data()['assignedTechnicianIds'];
    if (Array.isArray(assignedIds)) {
      assignedIds.forEach((id) => {
        if (typeof id === 'string') {
          techniciansInField.add(id);
        }
      });
    }
  }

  return {
    schemaVersion: 1,
    orderStatusCounts,
    quoteStatusCounts,
    overdueOrderCount: overdueSnapshot.data().count,
    todayVisitsCount: todayVisitsSnapshot.data().count,
    visitsThisWeekCount: weekVisitsSnapshot.data().count,
    techniciansInFieldCount: techniciansInField.size,
    technicianCount: techniciansSnapshot.data().count,
    recentOrders: recentSnapshot.docs.map(orderSummary),
    upcomingVisits: upcomingSnapshot.docs.map(orderSummary),
    calculatedAt: Timestamp.fromDate(now),
  };
}

/**
 * Recalcula un documento pequeño e idempotente. `sourceEventAt` evita que
 * una ejecución antigua que termine tarde sobrescriba el resultado de un
 * evento más reciente.
 */
export async function refreshDashboardMetrics(sourceEventTime?: string): Promise<void> {
  const firestore = getFirestore();
  const now = new Date();
  const sourceEventAt = sourceEventTime
    ? Timestamp.fromDate(new Date(sourceEventTime))
    : Timestamp.fromDate(now);
  const metrics = await calculateDashboardMetrics(now);
  const metricsRef = firestore.collection('dashboardMetrics').doc('current');

  await firestore.runTransaction(async (transaction) => {
    const current = await transaction.get(metricsRef);
    const currentEventAt = current.data()?.['sourceEventAt'];
    if (
      currentEventAt instanceof Timestamp &&
      currentEventAt.toMillis() > sourceEventAt.toMillis()
    ) {
      return;
    }
    transaction.set(metricsRef, {
      ...metrics,
      sourceEventAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export const syncDashboardOnOrderWrite = onDocumentWritten('orders/{orderId}', (event) =>
  refreshDashboardMetrics(event.time),
);

export const syncDashboardOnQuoteWrite = onDocumentWritten('quotes/{quoteId}', (event) =>
  refreshDashboardMetrics(event.time),
);

export const syncDashboardOnUserWrite = onDocumentWritten('users/{userId}', async (event) => {
  const beforeRole = event.data?.before.data()?.['role'];
  const afterRole = event.data?.after.data()?.['role'];
  if (beforeRole !== 'TECHNICIAN' && afterRole !== 'TECHNICIAN') {
    return;
  }
  await refreshDashboardMetrics(event.time);
});
