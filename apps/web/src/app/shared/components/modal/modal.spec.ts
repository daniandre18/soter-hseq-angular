import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Modal } from './modal';

describe('Modal', () => {
  let component: Modal;
  let fixture: ComponentFixture<Modal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Modal],
    }).compileComponents();

    fixture = TestBed.createComponent(Modal);
    fixture.componentRef.setInput('title', 'Título de prueba');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the responsive dialog structure when opened', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.modal-dialog')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.modal-body')).toBeTruthy();
  });
});
