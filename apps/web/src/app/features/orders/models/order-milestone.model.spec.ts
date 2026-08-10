import { deriveOrderMilestones } from './order-milestone.model';
import type { OrderEvent } from './order-event.model';
import type { ServiceOrder } from './order.model';

const BASE_ORDER: ServiceOrder = {
  id: 'order-1',
  orderNumber: 'OT-0001',
  clientId: 'client-1',
  clientBusinessName: 'Cliente Demo',
  assignedTechnicianIds: [],
  title: 'Inspección',
  priority: 'MEDIUM',
  progress: 0,
  status: 'DRAFT',
  serviceSummary: 'Inspección',
  evidenceCount: 0,
  createdAt: new Date('2026-08-01T08:00:00'),
  createdBy: 'admin',
  updatedAt: new Date('2026-08-01T08:00:00'),
  updatedBy: 'admin',
};

function order(overrides: Partial<ServiceOrder>): ServiceOrder {
  return { ...BASE_ORDER, ...overrides };
}

describe('deriveOrderMilestones', () => {
  it('marks every stage as pending before the order is assigned', () => {
    const milestones = deriveOrderMilestones(order({ status: 'SCHEDULED' }), []);
    expect(milestones.map((m) => m.state)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
  });

  it('marks only "assigned" as current right after assignment', () => {
    const milestones = deriveOrderMilestones(
      order({ status: 'ASSIGNED', assignedTechnicianIds: ['tech-1'] }),
      [],
    );
    expect(milestones[0].state).toBe('current');
    expect(milestones[1].state).toBe('pending');
  });

  it('shows the assignment to a client even if the administrative status is still SCHEDULED', () => {
    const milestones = deriveOrderMilestones(
      order({
        status: 'SCHEDULED',
        assignedTechnicianIds: ['tech-1'],
        assignedTechnicianNames: ['Andrés Morales'],
      }),
      [],
    );

    expect(milestones[0].state).toBe('current');
    expect(milestones.slice(1).every((milestone) => milestone.state === 'pending')).toBe(true);
  });

  it('marks assigned and execution-started as done, and in-progress as current, while IN_PROGRESS', () => {
    const milestones = deriveOrderMilestones(
      order({
        status: 'IN_PROGRESS',
        assignedTechnicianIds: ['tech-1'],
        actualStart: new Date('2026-08-02T09:00:00'),
      }),
      [],
    );
    expect(milestones[0].state).toBe('done');
    expect(milestones[1].state).toBe('done');
    expect(milestones[1].at).toEqual(new Date('2026-08-02T09:00:00'));
    expect(milestones[2].state).toBe('current');
    expect(milestones[3].state).toBe('pending');
  });

  it('marks under-review as current once the order is sent to review, using actualEnd', () => {
    const milestones = deriveOrderMilestones(
      order({
        status: 'UNDER_REVIEW',
        actualStart: new Date('2026-08-02T09:00:00'),
        actualEnd: new Date('2026-08-03T15:00:00'),
      }),
      [],
    );
    expect(milestones[2].state).toBe('done');
    expect(milestones[3].state).toBe('current');
    expect(milestones[3].at).toEqual(new Date('2026-08-03T15:00:00'));
    expect(milestones[4].state).toBe('pending');
  });

  it('marks every stage as done once the order is CLOSED, using the status-changed event for the timestamp', () => {
    const events: OrderEvent[] = [
      {
        id: 'event-1',
        entityType: 'ORDER',
        entityId: 'order-1',
        action: 'ORDER_STATUS_CHANGED',
        description: 'Estado cambiado de APPROVED a CLOSED',
        metadata: { from: 'APPROVED', to: 'CLOSED' },
        createdAt: new Date('2026-08-05T12:00:00'),
        createdBy: 'coordinator-1',
      },
    ];
    const milestones = deriveOrderMilestones(order({ status: 'CLOSED' }), events);
    expect(milestones.map((m) => m.state)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(milestones[4].at).toEqual(new Date('2026-08-05T12:00:00'));
  });

  it('freezes progress without a "current" stage when the order is cancelled', () => {
    const milestones = deriveOrderMilestones(
      order({ status: 'CANCELLED', assignedTechnicianIds: ['tech-1'] }),
      [],
    );
    expect(milestones[0].state).toBe('done');
    expect(milestones.slice(1).every((m) => m.state === 'pending')).toBe(true);
  });

  it('uses the earliest ORDER_ASSIGNED event as the "assigned" timestamp when available', () => {
    const events: OrderEvent[] = [
      {
        id: 'event-1',
        entityType: 'ORDER',
        entityId: 'order-1',
        action: 'ORDER_ASSIGNED',
        description: 'Técnicos asignados',
        createdAt: new Date('2026-08-01T10:00:00'),
        createdBy: 'coordinator-1',
      },
    ];
    const milestones = deriveOrderMilestones(order({ status: 'ASSIGNED' }), events);
    expect(milestones[0].at).toEqual(new Date('2026-08-01T10:00:00'));
  });
});
