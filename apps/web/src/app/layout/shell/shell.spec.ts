import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Shell } from './shell';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { SettingsFacade } from '../../features/settings/facades/settings.facade';
import { PushNotificationsFacade } from '../../features/push-notifications/facades/push-notifications.facade';

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
        {
          provide: PushNotificationsFacade,
          useValue: {
            supported: false,
            enabled: signal(false),
            enabling: signal(false),
            error: signal<string | null>(null),
            enable: async () => undefined,
            disable: async () => undefined,
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
