import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientFormModal } from './client-form-modal';
import { ClientsFacade } from '../../facades/clients.facade';

describe('ClientFormModal', () => {
  let component: ClientFormModal;
  let fixture: ComponentFixture<ClientFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientFormModal],
      providers: [
        {
          provide: ClientsFacade,
          useValue: {
            addClient: async () => 'new-id',
            updateClient: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
