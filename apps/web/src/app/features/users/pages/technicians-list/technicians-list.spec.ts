import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { TechniciansList } from './technicians-list';
import { TechniciansFacade } from '../../facades/technicians.facade';

describe('TechniciansList', () => {
  let component: TechniciansList;
  let fixture: ComponentFixture<TechniciansList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechniciansList],
      providers: [
        {
          provide: TechniciansFacade,
          useValue: {
            technicians: signal([]),
            loading: signal(false),
            setStatus: async () => undefined,
            init: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TechniciansList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
