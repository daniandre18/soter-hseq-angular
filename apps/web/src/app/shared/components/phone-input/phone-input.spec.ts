import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneInput } from './phone-input';

describe('PhoneInput', () => {
  let fixture: ComponentFixture<PhoneInput>;
  let component: PhoneInput;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PhoneInput] }).compileComponents();
    fixture = TestBed.createComponent(PhoneInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Deja resolver el import() dinámico de libphonenumber-js/min.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  });

  function numberInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="tel"]');
  }

  function typeNumber(value: string): void {
    const input = numberInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('should create and default to Colombia', () => {
    expect(component).toBeTruthy();
    expect(component.country()).toBe('CO');
  });

  it('formats a valid Colombian mobile number and emits it as E.164', () => {
    typeNumber('3001234567');

    expect(component.value()).toBe('+573001234567');
    expect(fixture.nativeElement.querySelector('.phone-status--valid')).toBeTruthy();
  });

  it('does not show an error while the number still looks incomplete', () => {
    typeNumber('300123');

    expect(fixture.nativeElement.querySelector('.phone-error')).toBeFalsy();
  });

  it('flags an incomplete number as invalid only after the field loses focus', () => {
    typeNumber('300123');
    numberInput().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.phone-status--invalid')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.phone-error')?.textContent?.trim()).toBeTruthy();
  });

  it('reformats and revalidates when switching country', () => {
    typeNumber('3001234567');
    expect(fixture.nativeElement.querySelector('.phone-status--valid')).toBeTruthy();

    const countryInput: HTMLInputElement = fixture.nativeElement.querySelector(
      '.phone-country input',
    );
    countryInput.focus();
    countryInput.value = 'Estados Unidos';
    countryInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const usOption: HTMLElement = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.phone-country .combobox-option'),
    ).find((option) => option.textContent?.includes('Estados Unidos'))!;
    usOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(component.country()).toBe('US');
    // El mismo número de 10 dígitos no es un número válido de EE. UU.
    expect(fixture.nativeElement.querySelector('.phone-status--valid')).toBeFalsy();
  });

  it('clears validity when the field is emptied', () => {
    typeNumber('3001234567');
    expect(component.value()).toBe('+573001234567');

    typeNumber('');

    expect(component.value()).toBe('');
    expect(fixture.nativeElement.querySelector('.phone-status--valid')).toBeFalsy();
  });
});
