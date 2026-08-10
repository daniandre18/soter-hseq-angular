import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  let fixture: ComponentFixture<KpiCard>;
  let component: KpiCard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiCard],
    }).compileComponents();

    fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('title', 'Órdenes Activas');
    fixture.componentRef.setInput('value', 11);
    fixture.componentRef.setInput('icon', 'clipboard-list');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render the alert badge when alertText is empty', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kpi-card-alert')).toBeNull();
  });

  it('should render the alert badge when alertText is set', () => {
    fixture.componentRef.setInput('alertText', '2 Vencidas');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kpi-card-alert')?.textContent).toContain(
      '2 Vencidas',
    );
  });
});
