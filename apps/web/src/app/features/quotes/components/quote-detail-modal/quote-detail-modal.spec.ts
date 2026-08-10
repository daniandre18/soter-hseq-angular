import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { QuoteDetailModal } from './quote-detail-modal';
import { QuotesFacade } from '../../facades/quotes.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';

const clientsFacadeStub = { clients: signal([]), init: () => undefined };

describe('QuoteDetailModal', () => {
  let component: QuoteDetailModal;
  let fixture: ComponentFixture<QuoteDetailModal>;
  let canManageQuotes: WritableSignal<boolean>;
  let canApproveQuote: ReturnType<typeof vi.fn>;
  let updateStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    canManageQuotes = signal(true);
    canApproveQuote = vi.fn().mockReturnValue(false);
    updateStatus = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [QuoteDetailModal],
      providers: [
        provideRouter([]),
        {
          provide: QuotesFacade,
          useValue: { watchItems: () => of([]), canManageQuotes, canApproveQuote, updateStatus },
        },
        { provide: OrdersFacade, useValue: { orders: signal([]), init: () => undefined } },
        { provide: ClientsFacade, useValue: clientsFacadeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides state transitions for a read-only role', async () => {
    canManageQuotes.set(false);
    fixture.componentRef.setInput('quote', {
      id: 'quote-1',
      quoteNumber: 'COT-0001',
      clientBusinessName: 'Cliente Uno',
      status: 'DRAFT',
      total: 100,
    });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[modalFooter] app-button')).toBeFalsy();
  });

  it('allows a client to approve a sent quote from its own company', async () => {
    canManageQuotes.set(false);
    canApproveQuote.mockReturnValue(true);
    fixture.componentRef.setInput('quote', {
      id: 'quote-1',
      quoteNumber: 'COT-0001',
      clientId: 'client-1',
      clientBusinessName: 'Cliente Uno',
      status: 'SENT',
      total: 100,
    });
    await fixture.whenStable();

    const approvalButton = fixture.nativeElement.querySelector(
      '[modalFooter] .footer-primary-actions app-button button',
    ) as HTMLButtonElement;
    expect(approvalButton.textContent).toContain('quotes.detail.approve');

    approvalButton.click();
    await fixture.whenStable();

    expect(updateStatus).toHaveBeenCalledWith('quote-1', 'APPROVED');
  });

  it('shows an error instead of silently returning to draft when Firestore rejects the change', async () => {
    updateStatus.mockRejectedValueOnce(new Error('Missing or insufficient permissions.'));
    fixture.componentRef.setInput('quote', {
      id: 'quote-1',
      quoteNumber: 'COT-0001',
      clientBusinessName: 'Cliente Uno',
      status: 'DRAFT',
      total: 100,
    });
    await fixture.whenStable();

    fixture.nativeElement.querySelector('[modalFooter] app-button button').click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'No fue posible cambiar el estado',
    );
  });

  it('lists the orders generated from this quote', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [QuoteDetailModal],
        providers: [
          provideRouter([]),
          {
            provide: QuotesFacade,
            useValue: {
              watchItems: () => of([]),
              canManageQuotes: signal(true),
              canApproveQuote: () => false,
            },
          },
          {
            provide: OrdersFacade,
            useValue: {
              orders: signal([
                {
                  id: 'order-1',
                  orderNumber: 'OT-0012',
                  serviceSummary: 'Medición de ruido',
                  status: 'DRAFT',
                },
                {
                  id: 'order-2',
                  orderNumber: 'OT-0013',
                  serviceSummary: 'Medición de iluminación',
                  status: 'DRAFT',
                },
              ]),
              init: () => undefined,
            },
          },
          { provide: ClientsFacade, useValue: clientsFacadeStub },
        ],
      })
      .compileComponents();

    const relatedFixture = TestBed.createComponent(QuoteDetailModal);
    relatedFixture.componentRef.setInput('quote', {
      id: 'quote-1',
      quoteNumber: 'COT-0009',
      clientBusinessName: 'Textiles del Caribe',
      status: 'CONVERTED',
      orderIds: ['order-1', 'order-2'],
      currency: 'COP',
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin-1',
      updatedAt: new Date('2026-08-01'),
      updatedBy: 'admin-1',
      issueDate: new Date('2026-08-01'),
    });
    await relatedFixture.whenStable();

    const links = relatedFixture.nativeElement.querySelectorAll('.related-order-link');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain('OT-0012');
    expect(links[1].textContent).toContain('OT-0013');
  });
});
