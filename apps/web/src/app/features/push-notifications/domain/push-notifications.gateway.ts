import { InjectionToken } from '@angular/core';
import type { RawPushSubscription } from '../models/push-subscription.model';

export interface PushNotificationsGateway {
  saveSubscription(subscription: RawPushSubscription): Promise<void>;
  deleteSubscription(endpoint: string): Promise<void>;
}

export const PUSH_NOTIFICATIONS_GATEWAY = new InjectionToken<PushNotificationsGateway>(
  'PushNotificationsGateway',
);
