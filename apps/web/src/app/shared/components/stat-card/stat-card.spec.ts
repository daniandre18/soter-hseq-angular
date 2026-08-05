import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatCard } from './stat-card';

describe('StatCard', () => {
  let component: StatCard;
  let fixture: ComponentFixture<StatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCard);
    fixture.componentRef.setInput('label', 'Órdenes Abiertas');
    fixture.componentRef.setInput('value', 5);
    fixture.componentRef.setInput('icon', 'clipboard-list');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply the compact variant when requested', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stat-card--compact')).toBeTruthy();
  });
});
