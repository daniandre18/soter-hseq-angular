export type VisitScheduleError = 'MISSING_DUE_DATE' | 'END_BEFORE_START' | 'AFTER_DUE_DATE';

function localDateKey(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Las fechas límite se capturan como `YYYY-MM-DD` y se persisten como la
 *  medianoche UTC. Comparar su día UTC evita que la zona horaria convierta,
 *  por ejemplo, el 20 de agosto en el 19 de agosto en Colombia. */
export function dueDateKey(date: Date): number {
  return date.getUTCFullYear() * 10_000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

export function visitScheduleError(
  scheduledStart: Date,
  scheduledEnd: Date | undefined,
  dueDate: Date | undefined,
): VisitScheduleError | null {
  if (!dueDate) {
    return 'MISSING_DUE_DATE';
  }
  if (scheduledEnd && scheduledEnd < scheduledStart) {
    return 'END_BEFORE_START';
  }
  if (
    localDateKey(scheduledStart) > dueDateKey(dueDate) ||
    (scheduledEnd && localDateKey(scheduledEnd) > dueDateKey(dueDate))
  ) {
    return 'AFTER_DUE_DATE';
  }
  return null;
}

export function assertValidVisitSchedule(
  scheduledStart: Date,
  scheduledEnd: Date | undefined,
  dueDate: Date | undefined,
): void {
  const error = visitScheduleError(scheduledStart, scheduledEnd, dueDate);
  if (error === 'MISSING_DUE_DATE') {
    throw new Error('La orden necesita una fecha límite antes de programar la visita.');
  }
  if (error === 'END_BEFORE_START') {
    throw new Error('La fecha final de la visita debe ser posterior a la fecha inicial.');
  }
  if (error === 'AFTER_DUE_DATE') {
    throw new Error('La visita no puede programarse después de la fecha límite de la orden.');
  }
}
