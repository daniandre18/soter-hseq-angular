import { Component, computed, input, signal } from '@angular/core';
import { QuillViewHTMLComponent } from 'ngx-quill';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Icon, type IconName } from '../../../../shared/components/icon/icon';
import { translateDomainCodes } from '../../../../shared/utils/domain-labels';
import { NOTE_TYPE_TRANSLATION_KEYS } from '../../models/note.model';
import { EVIDENCE_CATEGORY_TRANSLATION_KEYS, type Evidence } from '../../models/evidence.model';
import { ORDER_EVENT_ACTION_TRANSLATION_KEYS } from '../../models/order-event.model';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import type { OrderEvent } from '../../models/order-event.model';
import type { TechnicalNote } from '../../models/note.model';
import type { ActivityFilter, ActivityItem } from '../../models/activity-item.model';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';

/**
 * Feed cronológico único que combina notas técnicas, evidencia y el
 * historial de auditoría de una orden (inspirado en el panel "Activity" de
 * Jira). Presentacional puro: no inyecta Firestore ni la fachada, recibe
 * todo por `input()` (CLAUDE.md §6.2 — sin acceso a datos desde componentes).
 */
const KIND_ICONS: Record<ActivityItem['kind'], IconName> = {
  note: 'message-square',
  evidence: 'image',
  event: 'clock',
};

@Component({
  selector: 'app-order-activity-feed',
  imports: [Avatar, Icon, QuillViewHTMLComponent, TranslocoPipe, LocalizedDatePipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-activity-feed.html',
  styleUrl: './order-activity-feed.scss',
})
export class OrderActivityFeed {
  readonly notes = input<TechnicalNote[]>([]);
  readonly evidence = input<Evidence[]>([]);
  readonly events = input<OrderEvent[]>([]);
  readonly resolveAuthorName = input<(userId: string) => string>((id) => id);

  protected readonly translateDomainCodes = translateDomainCodes;
  protected readonly noteTypeLabels = NOTE_TYPE_TRANSLATION_KEYS;
  protected readonly evidenceCategoryLabels = EVIDENCE_CATEGORY_TRANSLATION_KEYS;
  protected readonly actionLabels = ORDER_EVENT_ACTION_TRANSLATION_KEYS;
  protected readonly kindIcon = (kind: ActivityItem['kind']): IconName => KIND_ICONS[kind];

  protected readonly activeFilter = signal<ActivityFilter>('all');

  /** Une notas + evidencia + eventos en un solo timeline ordenado por fecha desc. */
  protected readonly items = computed<ActivityItem[]>(() => {
    const notes = this.notes();
    const evidence = this.evidence();
    const events = this.events();

    const evidenceById = new Map(evidence.map((item) => [item.id, item]));
    // La evidencia ya embebida en una nota no se repite como tarjeta suelta.
    const embeddedEvidenceIds = new Set(notes.flatMap((note) => note.attachmentIds ?? []));

    const noteItems: ActivityItem[] = notes.map((note) => ({
      kind: 'note',
      id: `note-${note.id}`,
      createdAt: note.createdAt,
      createdBy: note.createdBy,
      note,
      attachments: (note.attachmentIds ?? [])
        .map((id) => evidenceById.get(id))
        .filter((item): item is Evidence => item !== undefined),
    }));

    const evidenceItems: ActivityItem[] = evidence
      .filter((item) => !embeddedEvidenceIds.has(item.id))
      .map((item) => ({
        kind: 'evidence',
        id: `evidence-${item.id}`,
        createdAt: item.uploadedAt,
        createdBy: item.uploadedBy,
        evidence: item,
      }));

    const eventItems: ActivityItem[] = events.map((event) => ({
      kind: 'event',
      id: `event-${event.id}`,
      createdAt: event.createdAt,
      createdBy: event.createdBy,
      event,
    }));

    return [...noteItems, ...evidenceItems, ...eventItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  });

  /**
   * "Historial" queda como el registro crudo sin deduplicar (como el
   * changelog de Jira): puede repetir una acción ya visible en "Comentarios"
   * embebida en una nota — filtros distintos, vistas distintas de los
   * mismos hechos.
   */
  protected readonly filteredItems = computed<ActivityItem[]>(() => {
    const filter = this.activeFilter();
    const items = this.items();
    switch (filter) {
      case 'comments':
        return items.filter((item) => item.kind === 'note');
      case 'history':
        return items.filter((item) => item.kind === 'event');
      default:
        return items;
    }
  });

  protected setFilter(filter: ActivityFilter): void {
    this.activeFilter.set(filter);
  }
}
