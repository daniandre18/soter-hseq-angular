import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';

import { DemoLogin } from './demo-login';
import { AuthFacade } from '../../facades/auth.facade';
import { BrowserReloadService } from '../../../../core/services/browser-reload.service';

describe('DemoLogin', () => {
  let component: DemoLogin;
  let fixture: ComponentFixture<DemoLogin>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigateByUrl = vi.fn().mockResolvedValue(true);
    reload = vi.fn();

    await TestBed.configureTestingModule({
      imports: [DemoLogin],
      providers: [
        {
          provide: AuthFacade,
          useValue: { loading: signal(false), error: signal(null), login: async () => true },
        },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: BrowserReloadService, useValue: { reload } },
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

  it('uses the PNG logo provided for the login', () => {
    expect(fixture.nativeElement.querySelector('.demo-brand img')?.getAttribute('src')).toBe(
      'soter-hseq-login.png',
    );
  });

  it('reloads once after navigating from a successful demo login', async () => {
    fixture.nativeElement.querySelector('.profile-card').click();
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith('/');
    expect(reload).toHaveBeenCalledOnce();
  });
});
