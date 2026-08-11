import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ToastService } from './toast.service';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  function setup(isEnabled: boolean) {
    const versionUpdates = new Subject<{ type: string }>();
    const checkForUpdate = vi.fn().mockResolvedValue(false);
    const action = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: SwUpdate, useValue: { isEnabled, versionUpdates, checkForUpdate } },
        { provide: ToastService, useValue: { action } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    });

    return { service: TestBed.inject(AppUpdateService), versionUpdates, action };
  }

  it('does nothing when the service worker is not enabled', () => {
    const { service, versionUpdates, action } = setup(false);

    service.init();
    versionUpdates.next({ type: 'VERSION_READY' });

    expect(action).not.toHaveBeenCalled();
  });

  it('prompts a reload when a new version is ready', () => {
    const { service, versionUpdates, action } = setup(true);

    service.init();
    versionUpdates.next({ type: 'VERSION_READY' });

    expect(action).toHaveBeenCalledWith(
      'common.appUpdate.message',
      expect.objectContaining({ label: 'common.appUpdate.reload' }),
    );
  });

  it('ignores version events other than VERSION_READY', () => {
    const { service, versionUpdates, action } = setup(true);

    service.init();
    versionUpdates.next({ type: 'VERSION_DETECTED' });

    expect(action).not.toHaveBeenCalled();
  });
});
