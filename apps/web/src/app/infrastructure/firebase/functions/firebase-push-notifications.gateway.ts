import { Injectable } from '@angular/core';
import type { PushNotificationsGateway } from '../../../features/push-notifications/domain/push-notifications.gateway';
import type { RawPushSubscription } from '../../../features/push-notifications/models/push-subscription.model';
import { firebaseCallable } from './firebase-callable';

/** Adapter sobre las callables `savePushSubscription`/`deletePushSubscription`
 *  (Admin SDK — ver `functions/src/index.ts`). */
@Injectable({ providedIn: 'root' })
export class FirebasePushNotificationsGateway implements PushNotificationsGateway {
  async saveSubscription(subscription: RawPushSubscription): Promise<void> {
    const save = await firebaseCallable<RawPushSubscription, { id: string }>(
      'savePushSubscription',
    );
    await save(subscription);
  }

  async deleteSubscription(endpoint: string): Promise<void> {
    const remove = await firebaseCallable<{ endpoint: string }, { deleted: boolean }>(
      'deletePushSubscription',
    );
    await remove({ endpoint });
  }
}
