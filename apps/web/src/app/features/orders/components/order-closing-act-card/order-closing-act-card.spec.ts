import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderClosingActCard } from './order-closing-act-card';
import { OrdersFacade } from '../../facades/orders.facade';
import type {
  ClientActDecisionInput,
  ClosingAct,
  ClosingActContent,
} from '../../models/closing-act.model';
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

const approvedAct: ClosingAct = {
  id: 'act-1',
  orderId: 'order-1',
  version: 1,
  status: 'APPROVED',
  source: 'MANUAL',
  title: 'Acta de cierre - OT-0042',
  executiveSummary: 'Servicio ejecutado de acuerdo con el alcance.',
  performedActivities: ['Inspección del área de trabajo'],
  findings: [],
  recommendations: [],
  createdAt: new Date('2026-08-10'),
  createdBy: 'coordinator-1',
  updatedAt: new Date('2026-08-10'),
  updatedBy: 'coordinator-1',
};

describe('OrderClosingActCard', () => {
  let fixture: ComponentFixture<OrderClosingActCard>;
  let createManualClosingAct: ReturnType<typeof vi.fn>;
  let uploadClosingAct: ReturnType<typeof vi.fn>;
  let reviewClosingActAsClient: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    createManualClosingAct = vi.fn().mockResolvedValue(undefined);
    uploadClosingAct = vi.fn().mockResolvedValue(undefined);
    reviewClosingActAsClient = vi.fn().mockResolvedValue('https://example.com/final.pdf');
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
            reviewClosingActAsClient,
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

  it('records an authenticated client acceptance with representative details', async () => {
    fixture.componentRef.setInput('order', { ...order, status: 'APPROVED' });
    fixture.componentRef.setInput('closingAct', approvedAct);
    fixture.componentRef.setInput('canReviewAsClient', true);
    fixture.componentRef.setInput('clientReviewerName', 'Carolina Méndez');
    await fixture.whenStable();

    const roleInput = fixture.nativeElement.querySelector(
      'input[autocomplete="organization-title"]',
    ) as HTMLInputElement;
    roleInput.value = 'Directora HSEQ';
    roleInput.dispatchEvent(new Event('input', { bubbles: true }));
    const acceptanceCheck = fixture.nativeElement.querySelector(
      '.acceptance-check input',
    ) as HTMLInputElement;
    acceptanceCheck.click();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.client-review-panel') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();

    expect(reviewClosingActAsClient).toHaveBeenCalledOnce();
    const [orderId, actId, input] = reviewClosingActAsClient.mock.calls[0] as [
      string,
      string,
      ClientActDecisionInput,
    ];
    expect(orderId).toBe('order-1');
    expect(actId).toBe('act-1');
    expect(input).toMatchObject({
      decision: 'ACCEPT',
      representativeName: 'Carolina Méndez',
      representativeRole: 'Directora HSEQ',
      acceptedTerms: true,
    });
  });

  it('requires a comment before requesting changes from the client', async () => {
    fixture.componentRef.setInput('order', { ...order, status: 'APPROVED' });
    fixture.componentRef.setInput('closingAct', approvedAct);
    fixture.componentRef.setInput('canReviewAsClient', true);
    fixture.componentRef.setInput('clientReviewerName', 'Carolina Méndez');
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('input[value="REQUEST_CHANGES"]') as HTMLInputElement).click();
    const roleInput = fixture.nativeElement.querySelector(
      'input[autocomplete="organization-title"]',
    ) as HTMLInputElement;
    roleInput.value = 'Directora HSEQ';
    roleInput.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('.client-review-panel') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(reviewClosingActAsClient).not.toHaveBeenCalled();

    const comment = fixture.nativeElement.querySelector(
      '.client-review-fields textarea',
    ) as HTMLTextAreaElement;
    comment.value = 'Ajustar el nombre del responsable que aparece en el documento.';
    comment.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(reviewClosingActAsClient).toHaveBeenCalledWith(
      'order-1',
      'act-1',
      expect.objectContaining({
        decision: 'REQUEST_CHANGES',
        comment: 'Ajustar el nombre del responsable que aparece en el documento.',
      }),
    );
  });
});
