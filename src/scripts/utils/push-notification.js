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

// Kirim subscription ke server (POST/DELETE)
const sendSubscriptionToServer = async (subscription, action) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Unauthorized: No login token found.');
  }

  // FIX: Path API benar
  const apiPath = 'notifications/subscribe';
  const method = action === 'subscribe' ? 'POST' : 'DELETE';

  // FIX UTAMA 1: convert ke JSON dan hapus expirationTime
  const subJson = subscription.toJSON ? subscription.toJSON() : subscription;
  const cleanedSubscription = { ...subJson };
  delete cleanedSubscription.expirationTime;

  // FIX UTAMA 2: Selalu kirim body JSON yang sudah dibersihkan, bahkan untuk DELETE
  // Ini memperbaiki error "value" must be of type object
  const bodyData = JSON.stringify(cleanedSubscription); 

  try {
    const response = await fetch(`${BASE_URL}/${apiPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: bodyData, 
    });

    const data = await response.json();

    if (!response.ok) {
      // Menangani pesan error dari server secara spesifik
      throw new Error(data.message || `Failed to ${action} subscription to server`);
    }

    console.log(`Subscription ${action} sent to server successfully!`);
    return data;
  } catch (err) {
    console.error(`Error sending ${action} subscription:`, err);
    // Melemparkan error yang lebih jelas ke fungsi subscribePush/unsubscribePush
    throw new Error(err.message || `API call failed during ${action}`);
  }
};

// Subscribe ke push notification
export const subscribePush = async () => {
  // Cek support browser
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notification not fully supported by this browser.');
  }

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

    // Kirim subscription ke server (POST)
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

    // Kirim unsubscribe ke server dulu (menggunakan DELETE)
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