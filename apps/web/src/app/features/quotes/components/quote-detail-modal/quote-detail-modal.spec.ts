import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { QuoteDetailModal } from './quote-detail-modal';
import { QuotesFacade } from '../../facades/quotes.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';

describe('QuoteDetailModal', () => {
  let component: QuoteDetailModal;
  let fixture: ComponentFixture<QuoteDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteDetailModal],
      providers: [
        provideRouter([]),
        { provide: QuotesFacade, useValue: { watchItems: () => of([]) } },
        { provide: OrdersFacade, useValue: { orders: signal([]), init: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists the orders generated from this quote', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [QuoteDetailModal],
        providers: [
          provideRouter([]),
          { provide: QuotesFacade, useValue: { watchItems: () => of([]) } },
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
