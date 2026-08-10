import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Shell } from './shell';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { SettingsFacade } from '../../features/settings/facades/settings.facade';

describe('Shell', () => {
  let component: Shell;
  let fixture: ComponentFixture<Shell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            currentUser: signal(null),
            currentRole: signal(null),
            logout: async () => undefined,
          },
        },
        {
          provide: SettingsFacade,
          useValue: {
            settings: signal({
              businessName: 'SOTER HSEQ',
              logoUrl: undefined,
              logoDesktopSize: 44,
              logoMobileSize: 36,
              logoAlignment: 'left',
              updatedAt: new Date(0),
              updatedBy: '',
            }),
            loading: signal(false),
            init: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
