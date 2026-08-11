/** Suscripción cruda de la Push API del navegador — misma forma que
 *  `PushSubscriptionJSON`, sin depender de ese tipo del DOM en el dominio. */
export interface RawPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
