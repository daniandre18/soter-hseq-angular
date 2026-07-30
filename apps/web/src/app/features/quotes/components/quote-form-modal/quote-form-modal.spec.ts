import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { QuoteFormModal } from './quote-form-modal';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { QuotesFacade } from '../../facades/quotes.facade';

describe('QuoteFormModal', () => {
  let component: QuoteFormModal;
  let fixture: ComponentFixture<QuoteFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteFormModal],
      providers: [
        { provide: ClientsFacade, useValue: { clients: signal([]) } },
        { provide: QuotesFacade, useValue: { addQuote: async () => 'new-id' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
