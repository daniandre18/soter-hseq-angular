import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NgControl } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { QuillEditorComponent } from 'ngx-quill';
import { of } from 'rxjs';

import { OrderDetailModal } from './order-detail-modal';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import type { ServiceOrder } from '../../models/order.model';

describe('OrderDetailModal', () => {
  let component: OrderDetailModal;
  let fixture: ComponentFixture<OrderDetailModal>;
  const order: ServiceOrder = {
    id: 'order-1',
    orderNumber: 'VIS-0005',
    clientId: 'client-1',
    clientBusinessName: 'Textiles del Caribe',
    assignedTechnicianIds: [],
    title: 'Medición de iluminación y ruido',
    priority: 'MEDIUM',
    progress: 0,
    status: 'ASSIGNED',
    serviceSummary: 'Medición de iluminación y ruido',
    evidenceCount: 0,
    createdAt: new Date('2026-08-01'),
    createdBy: 'admin',
    updatedAt: new Date('2026-08-01'),
    updatedBy: 'admin',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailModal],
      providers: [
        provideRouter([]),
        {
          provide: OrdersFacade,
          useValue: {
            technicians: signal([]),
            technicianName: () => '',
            displayNameFor: () => '',
            watchNotes: () => of([]),
            watchEvidence: () => of([]),
            watchOrderEvents: () => of([]),
            watchClosingAct: () => of(null),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            currentUser: signal(null),
            currentRole: signal('ADMIN'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a link to the originating quote when the order came from one', async () => {
    fixture.componentRef.setInput('order', { ...order, quoteId: 'quote-1', quoteNumber: 'COT-0009' });
    await fixture.whenStable();

    const link = fixture.nativeElement.querySelector('.info-value--link');
    expect(link?.textContent).toContain('COT-0009');
  });

  it('does not show a quote link for a manually created order', async () => {
    fixture.componentRef.setInput('order', order);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.info-value--link')).toBeFalsy();
  });

  it('should render the mobile-friendly summary, actions and progress sections', async () => {
    fixture.componentRef.setInput('order', order);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.order-client-summary')?.textContent).toContain(
      'Textiles del Caribe',
    );
    expect(fixture.nativeElement.querySelector('.header-badges')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.header-buttons')?.textContent).toContain('Editar');
    expect(fixture.nativeElement.querySelector('.progress-heading')?.textContent).toContain('0%');
    expect(fixture.nativeElement.querySelector('.progress-edit')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.modal-dialog--xl')).toBeTruthy();
  });

  it('should render the standalone Quill editor in the evidence form', async () => {
    fixture.componentRef.setInput('order', order);
    fixture.detectChanges();

    const activityTab = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.tab'),
    ).find((tab) => tab.textContent?.includes('Actividad'));
    activityTab?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const editor = fixture.debugElement.query(By.directive(QuillEditorComponent));
    const editorControl = editor.injector.get(NgControl).control;

    expect(editor).toBeTruthy();
    expect(editorControl?.value).toBe('');

    editorControl?.setValue('<p><strong>Hallazgo controlado</strong></p>');
    expect(editorControl?.value).toContain('<strong>Hallazgo controlado</strong>');
  });
});
