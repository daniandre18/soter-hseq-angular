import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocationSelect } from './location-select';

const CATALOG = [
  {
    code: '05',
    name: 'Antioquia',
    cities: [
      { code: '5001', name: 'Medellín' },
      { code: '5088', name: 'Bello' },
    ],
  },
  {
    code: '11',
    name: 'Bogotá D.C.',
    cities: [{ code: '11001', name: 'Bogotá' }],
  },
];

describe('LocationSelect', () => {
  let fixture: ComponentFixture<LocationSelect>;
  let component: LocationSelect;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(CATALOG), { status: 200 }),
    );

    await TestBed.configureTestingModule({ imports: [LocationSelect] }).compileComponents();
    fixture = TestBed.createComponent(LocationSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Deja resolver el fetch() (mockeado) + su .json().
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should create and load the catalog from the static JSON', () => {
    expect(component).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledWith('./data/co-locations.json');
    expect(fixture.nativeElement.querySelector('.combobox-spinner')).toBeFalsy();
  });

  it('disables the city combobox until a department is chosen', () => {
    const [, cityCombobox] = fixture.nativeElement.querySelectorAll('app-combobox input');
    expect(cityCombobox.disabled).toBe(true);

    component.department.set('Antioquia');
    fixture.detectChanges();

    expect(cityCombobox.disabled).toBe(false);
  });

  it('clears a previously selected city when it no longer belongs to the new department', () => {
    component.department.set('Antioquia');
    component.city.set('Medellín');
    fixture.detectChanges();
    expect(component.city()).toBe('Medellín');

    component.department.set('Bogotá D.C.');
    fixture.detectChanges();

    expect(component.city()).toBe('');
  });

  it('keeps the city when it still belongs to the newly selected department', () => {
    component.department.set('Antioquia');
    component.city.set('Bello');
    fixture.detectChanges();

    component.department.set('Antioquia');
    fixture.detectChanges();

    expect(component.city()).toBe('Bello');
  });
});
