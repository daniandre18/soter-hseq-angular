import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderClosingActCard } from './order-closing-act-card';
import { OrdersFacade } from '../../facades/orders.facade';
import type { ClosingActContent } from '../../models/closing-act.model';
import type { ServiceOrder } from '../../models/order.model';

const order: ServiceOrder = {
  id: 'order-1',
  orderNumber: 'OT-0042',
  clientId: 'client-1',
  clientBusinessName: 'Cliente Industrial SAS',
  assignedTechnicianIds: ['tech-1'],
  assignedTechnicianNames: ['Ana Morales'],
  title: 'Medición de iluminación',
  serviceSummary: 'Medición de iluminación',
  priority: 'MEDIUM',
  progress: 90,
  status: 'UNDER_REVIEW',
  evidenceCount: 1,
  createdAt: new Date('2026-08-01'),
  createdBy: 'admin-1',
  updatedAt: new Date('2026-08-10'),
  updatedBy: 'tech-1',
};

describe('OrderClosingActCard', () => {
  let fixture: ComponentFixture<OrderClosingActCard>;
  let createManualClosingAct: ReturnType<typeof vi.fn>;
  let uploadClosingAct: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    createManualClosingAct = vi.fn().mockResolvedValue(undefined);
    uploadClosingAct = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [OrderClosingActCard],
      providers: [
        {
          provide: OrdersFacade,
          useValue: {
            buildNotesSummary: () => 'Resumen de notas suficientemente largo',
            generateClosingActDraft: vi.fn().mockResolvedValue(undefined),
            createManualClosingAct,
            uploadClosingAct,
            updateClosingActContent: vi.fn().mockResolvedValue(undefined),
            approveClosingAct: vi.fn().mockResolvedValue(undefined),
            closeOrderWithPdf: vi.fn().mockResolvedValue('https://example.com/acta.pdf'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderClosingActCard);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('canRequestActa', true);
    await fixture.whenStable();
  });

  it('offers manual, AI-assisted, and PDF upload methods', () => {
    expect(fixture.nativeElement.querySelectorAll('.method-card')).toHaveLength(3);
  });

  it('creates a structured manual record with order context', async () => {
    (fixture.nativeElement.querySelector('.method-card--recommended') as HTMLButtonElement).click();
    await fixture.whenStable();

    const activities = fixture.nativeElement.querySelectorAll(
      '.act-form textarea',
    )[2] as HTMLTextAreaElement;
    activities.value = 'Inspección del área de trabajo';
    activities.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    const createButton = Array.from(
      fixture.nativeElement.querySelectorAll('.acta-actions button'),
    ).at(-1) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);
    createButton.click();
    await fixture.whenStable();

    expect(createManualClosingAct).toHaveBeenCalledOnce();
    const [orderId, content] = createManualClosingAct.mock.calls[0] as [string, ClosingActContent];
    expect(orderId).toBe('order-1');
    expect(content.executiveSummary).toContain('OT-0042');
    expect(content.performedActivities).toEqual(['Inspección del área de trabajo']);
    expect(content.serviceProviderRepresentative).toBe('Ana Morales');
  });

  it('rejects a non-PDF file before upload', async () => {
    (fixture.nativeElement.querySelectorAll('.method-card')[2] as HTMLButtonElement).click();
    await fixture.whenStable();

    const fileInput = fixture.nativeElement.querySelector('.file-picker input') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [new File(['contenido'], 'acta.txt', { type: 'text/plain' })],
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();

    expect(uploadClosingAct).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
