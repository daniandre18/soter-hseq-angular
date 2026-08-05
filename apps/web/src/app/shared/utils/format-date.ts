export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Formato dd/mm/aaaa, para tablas compactas. */
export function formatDateNumeric(date: Date): string {
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Tiempo relativo corto ("Ahora", "Hace 5m", "Hace 3h", "Hace 2d") para
 *  paneles compactos (p. ej. el inbox de notificaciones). Más allá de una
 *  semana, cae a `formatDate` para no acumular "Hace 47d". */
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) {
    return 'Ahora';
  }
  if (diffMinutes < 60) {
    return `Hace ${diffMinutes}m`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Hace ${diffDays}d`;
  }
  return formatDate(date);
}

/** Para enlazar un `Date` con un `<input type="datetime-local">`. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
