import { get, post } from './request';

export function getPushVapidPublicKey() {
  return get('/api/push/vapid-public-key', { skipAuth: true });
}

/** subscription: PushSubscription.toJSON() */
export function subscribePush(subscription) {
  return post('/api/push/subscribe', subscription);
}

export function unsubscribePushEndpoint(endpoint) {
  return post('/api/push/unsubscribe', { endpoint });
}

export function testPushNotification() {
  return post('/api/push/test', {});
}
