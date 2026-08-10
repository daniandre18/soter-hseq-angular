import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SegmentedBar } from './segmented-bar';

describe('SegmentedBar', () => {
  let fixture: ComponentFixture<SegmentedBar>;
  let component: SegmentedBar;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentedBar],
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentedBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty message when there is no data', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.segmented-bar-empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.segmented-bar-track')).toBeNull();
  });

  it('should render one segment per item, sized by its share of the total', () => {
    fixture.componentRef.setInput('items', [
      { key: 'a', label: 'Asignada', value: 9, color: '#2563eb' },
      { key: 'b', label: 'Borrador', value: 1, color: '#6b7280' },
      { key: 'c', label: 'Cerrada', value: 2, color: '#4f46e5' },
    ]);
    fixture.detectChanges();

    const segments: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '.segmented-bar-segment',
    );
    expect(segments).toHaveLength(3);
    // El ancho real ya no es un inline `style.width` — lo pone la hoja de
    // estilos vía `width: var(--segment-width)` (ver segmented-bar.scss),
    // para poder animar el llenado desde 0% al montarse. Lo único que el
    // componente escribe inline es la custom property con el porcentaje.
    expect(segments[0].style.getPropertyValue('--segment-width')).toBe('75%');
  });
});
