import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Header } from './header';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { NotificationsFacade } from '../../features/notifications/facades/notifications.facade';

function configureHeader(role: string | null) {
  return TestBed.configureTestingModule({
    imports: [Header],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: {
          currentUser: signal(role ? { id: 'user-1', displayName: 'Ana Ramírez' } : null),
          currentRole: signal(role),
        },
      },
      {
        provide: NotificationsFacade,
        useValue: { notifications: signal([]), unreadCount: signal(0) },
      },
    ],
  }).compileComponents();
}

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await configureHeader(null);
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not show the notification bell when logged out', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-notification-bell')).toBeFalsy();
  });
});

describe('Header (ADMIN)', () => {
  it('shows the notification bell for ADMIN', async () => {
    await configureHeader('ADMIN');
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-notification-bell')).toBeTruthy();
  });
});

describe('Header (TECHNICIAN)', () => {
  it('hides the notification bell for TECHNICIAN', async () => {
    await configureHeader('TECHNICIAN');
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-notification-bell')).toBeFalsy();
  });
});
