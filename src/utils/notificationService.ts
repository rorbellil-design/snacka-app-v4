import { Contact, RingtoneType } from '../types';
import { RINGTONE_OPTIONS } from './audioEffects';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const CALL_ICON_DATA_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2310b981"/><path d="M68 53.5c-4.5 0-8.8-.7-12.8-2.1-1.3-.4-2.7 0-3.6 1l-5.6 5.6C37.5 53.6 31.4 47.5 27 39l5.6-5.6c.9-.9 1.4-2.3 1-3.6C32.2 25.8 31.5 21.5 31.5 17c0-1.7-1.3-3-3-3H16c-1.7 0-3 1.3-3 3 0 30.9 25.1 56 56 56 1.7 0 3-1.3 3-3V56.5c0-1.7-1.3-3-3-3z" fill="white"/></svg>';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class NotificationService {
  private activeNotification: Notification | null = null;
  private originalTitle: string = typeof document !== 'undefined' ? document.title : 'Snacka';
  private titleFlashInterval: number | null = null;
  private vibrateInterval: number | null = null;
  private pushSubscribed: boolean = false;
  private registeredEmail: string = '';

  // Check if app is embedded in an iframe (e.g. preview) where notifications are restricted
  isInsideIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  // Check current permission
  getPermission(): NotificationPermissionStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationPermissionStatus;
  }

  // Register Web Push subscription with server so device rings in standby
  async registerPushSubscription(userEmail: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    if (!userEmail) return false;
    const cleanEmail = userEmail.trim().toLowerCase();

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg || !reg.pushManager) return false;

      // 1. Fetch server public VAPID key
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) return false;
      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;

      // 2. Check existing subscription or subscribe
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      if (!sub) return false;

      // 3. Send subscription to server
      const sendRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          subscription: sub.toJSON(),
        }),
      });

      if (sendRes.ok) {
        this.pushSubscribed = true;
        this.registeredEmail = cleanEmail;
        console.log(`[Web Push] Successfully registered push notifications for ${cleanEmail}`);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Web Push] Error registering push subscription:', err);
      return false;
    }
  }

  // Send real-time Web Push notification to target phone when making an outgoing call
  async triggerWebPushCallAlert(
    targetEmail: string,
    callerEmail: string,
    callerName: string,
    callerAvatar: string = '📞',
    ringtone: RingtoneType = 'marimba'
  ) {
    if (!targetEmail || !callerEmail) return;
    try {
      await fetch('/api/push/send-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: targetEmail.trim().toLowerCase(),
          callerEmail: callerEmail.trim().toLowerCase(),
          callerName,
          callerAvatar,
          ringtone,
        }),
      });
    } catch (e) {
      console.warn('[Web Push] Failed to trigger server push call alert:', e);
    }
  }

  // Cancel incoming call notification on recipient's locked screen
  async cancelWebPushCallAlert(targetEmail: string) {
    if (!targetEmail) return;
    try {
      await fetch('/api/push/cancel-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: targetEmail.trim().toLowerCase() }),
      });
    } catch (e) {
      console.warn('[Web Push] Failed to cancel push alert:', e);
    }
  }

  // Send test push from server
  async sendServerPushTest(userEmail: string): Promise<boolean> {
    if (!userEmail) return false;
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail.trim().toLowerCase() }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Request browser permission for push/background alerts
  async requestPermission(userEmail?: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted' && userEmail) {
        await this.registerPushSubscription(userEmail);
      }
      return result === 'granted';
    } catch {
      return false;
    }
  }

  // Send an instant test notification so user can verify on their device
  async sendTestNotification(userEmail?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (!('Notification' in window)) {
      alert('Denna webbläsare stöder inte systemnotiser.');
      return false;
    }

    let perm = Notification.permission;
    if (perm !== 'granted') {
      try {
        perm = await Notification.requestPermission();
      } catch (e) {
        console.warn(e);
      }
    }

    if (perm !== 'granted') {
      return false;
    }

    if (userEmail) {
      await this.registerPushSubscription(userEmail);
      await this.sendServerPushTest(userEmail);
    }

    const title = '🔔 Snacka: Notiser fungerar!';
    const options: NotificationOptions & { vibrate?: number[] } = {
      body: 'Du kommer nu få ringsignal och notis när någon ringer dig i standby-läge.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-notification',
      vibrate: [400, 200, 400],
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return true;
        }
      }
      new Notification(title, options);
      return true;
    } catch (err) {
      console.warn('Test notification fallback:', err);
      try {
        new Notification(title, options);
        return true;
      } catch {
        return false;
      }
    }
  }

  // Start flashing page title so user sees caller even in background tab
  private startTitleFlashing(callerName: string) {
    if (typeof document === 'undefined') return;
    this.stopTitleFlashing();
    this.originalTitle = document.title || 'Snacka';

    let toggle = false;
    this.titleFlashInterval = window.setInterval(() => {
      toggle = !toggle;
      document.title = toggle ? `📞 ${callerName} ringer!` : `🔴 INKOMMANDE SAMTAL - Snacka`;
    }, 800);
  }

  private stopTitleFlashing() {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = null;
    }
    if (typeof document !== 'undefined') {
      document.title = this.originalTitle || 'Snacka - Röstsamtal för barn';
    }
  }

  // Trigger continuous vibration if supported on mobile device
  startVibrate() {
    this.stopVibrate();
    const pattern = [600, 300, 600, 300, 800, 400];
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }

    // Repeat vibration while ringing
    this.vibrateInterval = window.setInterval(() => {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(pattern);
        } catch {}
      }
    }, 2800);
  }

  // Stop vibration
  stopVibrate() {
    if (this.vibrateInterval) {
      clearInterval(this.vibrateInterval);
      this.vibrateInterval = null;
    }
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }

  // Show rich incoming call notification even when tab is backgrounded
  async showIncomingCall(
    contact: Contact,
    ringtone: RingtoneType = 'marimba',
    onAnswer?: () => void
  ): Promise<Notification | null> {
    this.closeActiveNotification();

    // 1. Start continuous device vibration
    this.startVibrate();

    // 2. Start tab title flash
    this.startTitleFlashing(contact.name);

    // 3. Set app badge if supported
    if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
      try {
        (navigator as any).setAppBadge(1).catch(() => {});
      } catch {}
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    // Auto-request permission if not asked yet
    if (Notification.permission === 'default') {
      try {
        const granted = await Notification.requestPermission();
        if (granted !== 'granted') return null;
      } catch {
        return null;
      }
    }

    if (Notification.permission !== 'granted') {
      return null;
    }

    try {
      const ringtoneName =
        RINGTONE_OPTIONS.find((r) => r.id === ringtone)?.name || 'Klassisk Marimba';

      const title = `📞 ${contact.name} ringer dig!`;
      const options: NotificationOptions = {
        body: `Tryck här för att svara på röstsamtalet. (Ringsignal: ${ringtoneName})`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'incoming-call',
        requireInteraction: true, // Keeps alert visible on lockscreen / desktop until dismissed
        silent: false,
        data: { contactId: contact.id, callerEmail: contact.email },
      };

      // Try Service Worker registration if active (most reliable on mobile Chrome & Android PWA)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              ...options,
              vibrate: [600, 300, 600, 300, 800, 400],
              actions: [
                { action: 'answer', title: '📞 Svara' },
                { action: 'reject', title: '🔴 Avvisa' },
              ],
            } as any);
            return null;
          }
        } catch (swErr) {
          console.warn('Service worker notification fallback:', swErr);
        }
      }

      // Standard Notification fallback
      const notification = new Notification(title, options);

      notification.onclick = () => {
        try {
          window.focus();
        } catch {}
        notification.close();
        if (onAnswer) {
          onAnswer();
        }
      };

      this.activeNotification = notification;
      return notification;
    } catch (e) {
      console.warn('Could not display system notification:', e);
      return null;
    }
  }

  // Show voice message alert
  async showVoiceMessageNotification(senderName: string, durationSecs: number) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      const title = `🎙️ Nytt röstmemo från ${senderName}!`;
      const options: NotificationOptions = {
        body: `Ett ${durationSecs}s röstmeddelande väntar på dig. Klicka för att lyssna.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'voice-message',
      };

      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, options);
            return;
          }
        } catch {}
      }

      const notification = new Notification(title, options);
      notification.onclick = () => {
        try {
          window.focus();
        } catch {}
        notification.close();
      };
    } catch {}
  }

  // Close active notification (e.g. when call answered or rejected)
  closeActiveNotification() {
    this.stopVibrate();
    this.stopTitleFlashing();

    if ('clearAppBadge' in navigator && typeof (navigator as any).clearAppBadge === 'function') {
      try {
        (navigator as any).clearAppBadge().catch(() => {});
      } catch {}
    }

    if (this.activeNotification) {
      try {
        this.activeNotification.close();
      } catch {}
      this.activeNotification = null;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.getNotifications({ tag: 'incoming-call' }).then((notifs) => {
          notifs.forEach((n) => n.close());
        });
      }).catch(() => {});
    }
  }
}

export const notificationService = new NotificationService();
