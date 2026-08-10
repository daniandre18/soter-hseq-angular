import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunnelChart } from './funnel-chart';

describe('FunnelChart', () => {
  let fixture: ComponentFixture<FunnelChart>;
  let component: FunnelChart;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FunnelChart],
    }).compileComponents();

    fixture = TestBed.createComponent(FunnelChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one bar per stage with a fixed decreasing width, even when the underlying counts are equal', () => {
    // 7/7/7 (100% de conversión) sigue viéndose como embudo — el ancho
    // representa el orden de la etapa, no la proporción real (el valor
    // real igual se muestra dentro de cada barra).
    fixture.componentRef.setInput('stages', [
      { key: 'sent', label: 'Enviadas', value: 7 },
      { key: 'approved', label: 'Aprobadas', value: 7 },
      { key: 'converted', label: 'Convertidas', value: 7 },
    ]);
    fixture.detectChanges();

    const bars: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.funnel-bar');
    expect(bars).toHaveLength(3);
    expect(bars[0].style.width).toBe('100%');
    expect(bars[1].style.width).toBe('85%');
    expect(bars[2].style.width).toBe('70%');
  });
});
