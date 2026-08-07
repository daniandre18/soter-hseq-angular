import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Combobox, type ComboboxOption } from './combobox';

const OPTIONS: ComboboxOption[] = [
  { value: 'CO', label: 'Colombia' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'MX', label: 'México' },
];

describe('Combobox', () => {
  let fixture: ComponentFixture<Combobox>;
  let component: Combobox;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Combobox] }).compileComponents();
    fixture = TestBed.createComponent(Combobox);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters options by the typed search text, ignoring accents and case', () => {
    input().focus();
    fixture.detectChanges();
    input().value = 'mexi';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.combobox-option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('México');
  });

  it('selects an option on click and closes the dropdown', () => {
    input().focus();
    fixture.detectChanges();

    const option: HTMLElement = fixture.nativeElement.querySelector('.combobox-option');
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(component.value()).toBe('CO');
    expect(fixture.nativeElement.querySelector('.combobox-listbox')).toBeFalsy();
    expect(input().value).toBe('Colombia');
  });

  it('clears the selection without reopening the dropdown', () => {
    fixture.componentRef.setInput('value', 'US');
    fixture.detectChanges();

    const clearButton: HTMLButtonElement = fixture.nativeElement.querySelector('.combobox-clear');
    clearButton.click();
    fixture.detectChanges();

    expect(component.value()).toBe('');
    expect(input().value).toBe('');
  });

  it('does not open when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    input().focus();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.combobox-listbox')).toBeFalsy();
  });
});
