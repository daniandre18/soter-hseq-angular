import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Login } from './login';
import { AuthFacade } from '../../facades/auth.facade';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            loading: signal(false),
            error: signal(null),
            login: async () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the PNG logo provided for the login', () => {
    expect(fixture.nativeElement.querySelector('.login-brand img')?.getAttribute('src')).toBe(
      'soter-hseq-login.png',
    );
  });
});
