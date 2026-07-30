import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { QuoteDetailModal } from './quote-detail-modal';
import { QuotesFacade } from '../../facades/quotes.facade';

describe('QuoteDetailModal', () => {
  let component: QuoteDetailModal;
  let fixture: ComponentFixture<QuoteDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteDetailModal],
      providers: [{ provide: QuotesFacade, useValue: { watchItems: () => of([]) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
