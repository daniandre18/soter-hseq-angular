import { visitScheduleError } from './order-schedule-validation';

describe('visitScheduleError', () => {
  const dueDate = new Date('2026-08-20');

  it('allows a visit during the due date', () => {
    expect(
      visitScheduleError(
        new Date(2026, 7, 20, 8),
        new Date(2026, 7, 20, 17),
        dueDate,
      ),
    ).toBeNull();
  });

  it('rejects a visit after the due date', () => {
    expect(visitScheduleError(new Date(2026, 7, 21, 8), undefined, dueDate)).toBe(
      'AFTER_DUE_DATE',
    );
  });

  it('rejects an end before the start', () => {
    expect(
      visitScheduleError(
        new Date(2026, 7, 20, 10),
        new Date(2026, 7, 20, 9),
        dueDate,
      ),
    ).toBe('END_BEFORE_START');
  });
});
