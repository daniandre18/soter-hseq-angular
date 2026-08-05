import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderActivityFeed } from './order-activity-feed';
import type { TechnicalNote } from '../../models/note.model';
import type { Evidence } from '../../models/evidence.model';
import type { OrderEvent } from '../../models/order-event.model';

describe('OrderActivityFeed', () => {
  let component: OrderActivityFeed;
  let fixture: ComponentFixture<OrderActivityFeed>;

  const note: TechnicalNote = {
    id: 'note-1',
    orderId: 'order-1',
    content: 'Se revisó el tablero eléctrico.',
    noteType: 'FINDING',
    attachmentIds: ['evidence-1'],
    createdAt: new Date('2026-08-01T10:00:00'),
    createdBy: 'user-1',
  };

  const attachedEvidence: Evidence = {
    id: 'evidence-1',
    orderId: 'order-1',
    type: 'PDF',
    fileName: 'informe.pdf',
    storagePath: 'orders/order-1/evidence/evidence-1/informe.pdf',
    downloadUrl: 'https://example.com/informe.pdf',
    contentType: 'application/pdf',
    size: 1024,
    uploadedAt: new Date('2026-08-01T09:55:00'),
    uploadedBy: 'user-1',
    status: 'ACTIVE',
  };

  const standaloneEvidence: Evidence = {
    id: 'evidence-2',
    orderId: 'order-1',
    type: 'PHOTO',
    category: 'BEFORE',
    fileName: 'foto.jpg',
    storagePath: 'orders/order-1/evidence/evidence-2/foto.jpg',
    downloadUrl: 'https://example.com/foto.jpg',
    contentType: 'image/jpeg',
    size: 2048,
    uploadedAt: new Date('2026-08-01T08:00:00'),
    uploadedBy: 'user-2',
    status: 'ACTIVE',
  };

  const event: OrderEvent = {
    id: 'event-1',
    entityType: 'ORDER',
    entityId: 'order-1',
    action: 'ORDER_STATUS_CHANGED',
    description: 'Estado cambiado de ASSIGNED a IN_PROGRESS',
    createdAt: new Date('2026-08-01T11:00:00'),
    createdBy: 'user-3',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderActivityFeed],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderActivityFeed);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should merge notes, evidence and events sorted by date, embedding attached evidence in its note', async () => {
    fixture.componentRef.setInput('notes', [note]);
    fixture.componentRef.setInput('evidence', [attachedEvidence, standaloneEvidence]);
    fixture.componentRef.setInput('events', [event]);
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.timeline-item');
    // 1 nota (con el adjunto embebido) + 1 evidencia suelta + 1 evento = 3, no 4.
    expect(cards.length).toBe(3);

    const attachmentChip = fixture.nativeElement.querySelector('.attachment-chip');
    expect(attachmentChip?.textContent).toContain('informe.pdf');

    const evidenceCards = fixture.nativeElement.querySelectorAll('.evidence-card');
    expect(evidenceCards.length).toBe(1);
    expect(evidenceCards[0].textContent).toContain('foto.jpg');
  });

  it('should filter to only notes under "Comentarios" and only events under "Historial"', async () => {
    fixture.componentRef.setInput('notes', [note]);
    fixture.componentRef.setInput('evidence', [attachedEvidence, standaloneEvidence]);
    fixture.componentRef.setInput('events', [event]);
    await fixture.whenStable();
    fixture.detectChanges();

    const filterButtons = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.activity-filter'),
    );

    filterButtons.find((button) => button.textContent?.includes('Comentarios'))?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline-item').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.timeline-text')?.textContent).toContain(
      'tablero eléctrico',
    );

    filterButtons.find((button) => button.textContent?.includes('Historial'))?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline-item').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.timeline-text--event')?.textContent).toContain(
      'Estado cambiado',
    );
  });

  it('should show the empty state when there is no activity', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain(
      'Sin actividad',
    );
  });
});
