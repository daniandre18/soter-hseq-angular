import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { QuotesList } from './quotes-list';
import { QuotesFacade } from '../../facades/quotes.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import type { Quote } from '../../models/quote.model';

/** `QuoteDetailModal` (dentro de `QuotesList`) inyecta `OrdersFacade` para
 *  listar las órdenes generadas por la cotización — sin este stub, Angular
 *  intenta construir la fachada real y falla por falta de `FIREBASE_FIRESTORE`. */
const ordersFacadeStub = {
  provide: OrdersFacade,
  useValue: { orders: signal([]), init: () => undefined },
};

describe('QuotesList', () => {
  let component: QuotesList;
  let fixture: ComponentFixture<QuotesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuotesList],
      providers: [
        provideRouter([]),
        {
          provide: QuotesFacade,
          useValue: {
            quotes: signal([]),
            loading: signal(false),
            canManageQuotes: signal(true),
            canEditDraftQuotes: signal(false),
            init: () => undefined,
          },
        },
        {
          provide: ClientsFacade,
          useValue: {
            clients: signal([]),
            init: () => undefined,
          },
        },
        {
          provide: ServicesFacade,
          useValue: { activeServices: signal([]), byId: () => undefined, init: () => undefined },
        },
        ordersFacadeStub,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the detail modal for the quote named in ?open= once it loads', async () => {
    const quote: Quote = {
      id: 'quote-1',
      quoteNumber: 'COT-0001',
      clientId: 'client-1',
      clientBusinessName: 'Textiles Andinos Ltda.',
      status: 'SENT',
      issueDate: new Date('2026-08-01'),
      currency: 'COP',
      subtotal: 100,
      tax: 19,
      discount: 0,
      total: 119,
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin',
      updatedAt: new Date('2026-08-01'),
      updatedBy: 'admin',
    };

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [QuotesList],
        providers: [
          provideRouter([]),
          {
            provide: ActivatedRoute,
            useValue: { queryParamMap: of(convertToParamMap({ open: 'quote-1' })) },
          },
          {
            provide: QuotesFacade,
            useValue: {
              quotes: signal([quote]),
              loading: signal(false),
              canManageQuotes: signal(true),
              canEditDraftQuotes: signal(false),
              init: () => undefined,
              watchItems: () => of([]),
            },
          },
          { provide: ClientsFacade, useValue: { clients: signal([]), init: () => undefined } },
          {
            provide: ServicesFacade,
            useValue: { activeServices: signal([]), byId: () => undefined, init: () => undefined },
          },
          ordersFacadeStub,
        ],
      })
      .compileComponents();

    const deepLinkFixture = TestBed.createComponent(QuotesList);
    await deepLinkFixture.whenStable();

    expect(deepLinkFixture.componentInstance['detailQuoteId']()).toBe('quote-1');
  });
});
