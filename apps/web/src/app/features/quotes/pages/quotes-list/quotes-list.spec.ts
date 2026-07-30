import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { QuotesList } from './quotes-list';
import { QuotesFacade } from '../../facades/quotes.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';

describe('QuotesList', () => {
  let component: QuotesList;
  let fixture: ComponentFixture<QuotesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuotesList],
      providers: [
        {
          provide: QuotesFacade,
          useValue: {
            quotes: signal([]),
            loading: signal(false),
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
