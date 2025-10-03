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

  const endpoint = action === 'subscribe' ? 'push-subscribe' : 'push-unsubscribe';

  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscription),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Failed to ${action} subscription to server`);
    }

    console.log(`Subscription ${action} sent to server successfully!`);
    return data;
  } catch (err) {
    console.error(`Error sending ${action} subscription:`, err);
    throw err;
  }
};

// Subscribe ke push notification
export const subscribePush = async () => {
  // Cek support browser
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications.');
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.');
  }

  if (!('PushManager' in window)) {
    throw new Error('This browser does not support push notifications.');
  }

  // Cek apakah user sudah login
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please login first to enable notifications.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  
  if (permission !== 'granted') {
    throw new Error('Notification permission denied.');
  }

  try {
    // Tunggu service worker ready
    const registration = await navigator.serviceWorker.ready;

    // Cek apakah sudah subscribe
    let subscription = await registration.pushManager.getSubscription();

    // Jika belum subscribe, buat subscription baru
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_UINT8,
      });
      console.log('New push subscription created');
    } else {
      console.log('Already subscribed to push');
    }

    // Kirim subscription ke server
    await sendSubscriptionToServer(subscription.toJSON(), 'subscribe');

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

    // Kirim unsubscribe ke server dulu
    await sendSubscriptionToServer(subscription.toJSON(), 'unsubscribe');

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