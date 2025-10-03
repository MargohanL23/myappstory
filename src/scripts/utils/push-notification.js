// src/scripts/utils/push-notification.js
import { VAPID_PUBLIC_KEY, BASE_URL } from './config';

// Helper function untuk konversi VAPID key
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const VAPID_UINT8 = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

const toPlainSubscription = (subscription) => {
  // Jika PushSubscription object, convert ke JSON
  if (!subscription) return {};
  if (typeof subscription.toJSON === 'function') {
    try {
      return subscription.toJSON();
    } catch (e) {
      console.warn('toJSON() failed on subscription, falling back to raw object', e);
      return subscription;
    }
  }
  // sudah plain object
  return subscription;
};

// Cek apakah sudah subscribe
export const getSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notification not supported');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

// Kirim subscription ke server
const sendSubscriptionToServer = async (subscription, action) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Unauthorized: No login token found.');
  }

  const apiPath = 'notifications/subscribe';
  const method = action === 'subscribe' ? 'POST' : 'DELETE';

  // Konversi ke plain object
  const subJson = toPlainSubscription(subscription);
  // Hapus field yang tidak diizinkan
  if ('expirationTime' in subJson) delete subJson.expirationTime;

  // Siapkan payload:
  // - subscribe (POST): kirim seluruh subscription (server butuh keys)
  // - unsubscribe (DELETE): kirim **HANYA** endpoint (server menolak "keys")
  let payload;
  if (method === 'POST') {
    payload = subJson;
  } else {
    // pastikan hanya endpoint dikirim
    payload = { endpoint: subJson.endpoint };
  }

  // Defensive: remove unexpected props for DELETE
  if (method === 'DELETE') {
    // pastikan tidak ada keys, auth, p256dh, atau anything else
    if ('keys' in payload) delete payload.keys;
    if ('auth' in payload) delete payload.auth;
    if ('p256dh' in payload) delete payload.p256dh;
  }

  // Logging stringified agar jelas apa yang dikirim
  console.log(`[push] subJson (raw):`, JSON.stringify(subJson));
  console.log(`[push] payload to send (${method}):`, JSON.stringify(payload));

  try {
    const response = await fetch(`${BASE_URL}/${apiPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      const errMsg = (data && (data.message || data.error || JSON.stringify(data))) ||
        `Failed to ${action} subscription to server (status ${response.status})`;
      throw new Error(errMsg);
    }

    console.log(`Subscription ${action} sent to server successfully!`, data);
    return data;
  } catch (err) {
    console.error(`Error sending ${action} subscription:`, err);
    throw err;
  }
};

// Subscribe ke push notification
export const subscribePush = async () => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications.');
  }
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.');
  }
  if (!('PushManager' in window)) {
    throw new Error('This browser does not support push notifications.');
  }

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please login first to enable notifications.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied.');
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_UINT8,
      });
      console.log('New push subscription created');
    } else {
      console.log('Already subscribed to push');
    }

    await sendSubscriptionToServer(subscription, 'subscribe');
    console.log('Push notification enabled successfully');
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    throw new Error(`Failed to enable push notification: ${error.message}`);
  }
};

// Unsubscribe dari push notification
export const unsubscribePush = async () => {
  try {
    const subscription = await getSubscription();

    if (!subscription) {
      console.log('No active subscription to unsubscribe');
      return true;
    }

    // Kirim unsubscribe ke server (kirim hanya endpoint)
    await sendSubscriptionToServer(subscription, 'unsubscribe');

    // Lalu unsubscribe dari browser
    const success = await subscription.unsubscribe();

    if (!success) {
      throw new Error('Browser unsubscribe failed.');
    }

    console.log('Push notification disabled successfully');
    return success;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    throw new Error(`Failed to disable push notification: ${error.message}`);
  }
};
