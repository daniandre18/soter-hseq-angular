import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderTeamCard } from './order-team-card';

describe('OrderTeamCard', () => {
  let fixture: ComponentFixture<OrderTeamCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OrderTeamCard] }).compileComponents();
    fixture = TestBed.createComponent(OrderTeamCard);
    fixture.componentRef.setInput('createdAt', new Date('2026-08-01T08:00:00'));
  });

  it('shows denormalized assigned technicians to a client without directory access', async () => {
    fixture.componentRef.setInput('technicians', []);
    fixture.componentRef.setInput('technicianNames', ['Andrés Morales']);
    await fixture.whenStable();

    const memberName = fixture.nativeElement.querySelector('.team-member-name');
    expect(memberName?.textContent).toContain('Andrés Morales');
    expect(fixture.nativeElement.querySelector('.muted-text')).toBeFalsy();
  });
});
