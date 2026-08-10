import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { refreshDashboardMetrics } from '../lib/dashboard-metrics.js';

const projectId = 'demo-soter-hseq';
let app;
let firestore;

before(async () => {
  app = initializeApp({ projectId });
  firestore = getFirestore(app);
  await Promise.all([
    firestore.recursiveDelete(firestore.collection('orders')),
    firestore.recursiveDelete(firestore.collection('quotes')),
    firestore.recursiveDelete(firestore.collection('users')),
    firestore.recursiveDelete(firestore.collection('dashboardMetrics')),
  ]);
  await Promise.all([
    firestore.collection('orders').doc('order-1').set({
      orderNumber: 'OT-0001',
      clientId: 'client-1',
      clientBusinessName: 'Cliente Uno',
      assignedTechnicianIds: ['tech-1'],
      assignedTechnicianNames: ['Andrés Morales'],
      title: 'Inspección',
      serviceSummary: 'Inspección',
      status: 'SCHEDULED',
      scheduledStart: Timestamp.fromDate(new Date('2099-08-11T13:00:00Z')),
      scheduledEnd: Timestamp.fromDate(new Date('2099-08-11T14:00:00Z')),
      createdAt: Timestamp.fromDate(new Date('2026-08-01T12:00:00Z')),
    }),
    firestore.collection('quotes').doc('quote-1').set({ status: 'SENT' }),
    firestore.collection('users').doc('tech-1').set({ role: 'TECHNICIAN' }),
  ]);
});

after(async () => {
  await deleteApp(app);
});

test('the backend materializer writes the current dashboard snapshot', async () => {
  await refreshDashboardMetrics('2026-08-10T22:00:00.000Z');

  const snapshot = await firestore.collection('dashboardMetrics').doc('current').get();
  const metrics = snapshot.data();
  assert.equal(snapshot.exists, true);
  assert.equal(metrics?.['orderStatusCounts']?.['SCHEDULED'], 1);
  assert.equal(metrics?.['quoteStatusCounts']?.['SENT'], 1);
  assert.equal(metrics?.['technicianCount'], 1);
  assert.equal(metrics?.['recentOrders']?.length, 1);
  assert.equal(metrics?.['upcomingVisits']?.length, 1);
});
