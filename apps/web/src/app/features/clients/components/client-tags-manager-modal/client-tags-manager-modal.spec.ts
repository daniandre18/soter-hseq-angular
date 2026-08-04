import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ClientTagsManagerModal } from './client-tags-manager-modal';
import { ClientTagsFacade } from '../../facades/client-tags.facade';

describe('ClientTagsManagerModal', () => {
  let component: ClientTagsManagerModal;
  let fixture: ComponentFixture<ClientTagsManagerModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientTagsManagerModal],
      providers: [
        {
          provide: ClientTagsFacade,
          useValue: {
            tags: signal([]),
            addTag: async () => 'new-id',
            deleteTag: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientTagsManagerModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
