import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';

import { DemoLogin } from './demo-login';
import { AuthFacade } from '../../facades/auth.facade';

describe('DemoLogin', () => {
  let component: DemoLogin;
  let fixture: ComponentFixture<DemoLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoLogin],
      providers: [
        {
          provide: AuthFacade,
          useValue: { loading: signal(false), error: signal(null), login: async () => true },
        },
        { provide: Router, useValue: { navigateByUrl: async () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the four demo profiles', () => {
    expect(fixture.nativeElement.querySelectorAll('.profile-card')).toHaveLength(4);
  });
});
