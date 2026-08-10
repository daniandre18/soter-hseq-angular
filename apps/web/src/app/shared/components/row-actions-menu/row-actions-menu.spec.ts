import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RowActionsMenu } from './row-actions-menu';

describe('RowActionsMenu', () => {
  let component: RowActionsMenu;
  let fixture: ComponentFixture<RowActionsMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RowActionsMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(RowActionsMenu);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('triggerLabel', 'Más acciones');
    fixture.componentRef.setInput('actions', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the selected action and its click event', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('actions', [
      { id: 'delete', icon: 'trash-2', label: 'Eliminar', tone: 'danger' },
    ]);
    await fixture.whenStable();

    const actionSelected = vi.fn();
    component.actionSelected.subscribe(actionSelected);
    fixture.nativeElement.querySelector('[role="menuitem"]').click();

    expect(actionSelected).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'delete', event: expect.any(Event) }),
    );
  });
});
