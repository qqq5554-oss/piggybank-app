import { savePushSubscription, deletePushSubscription } from "../api/client";

// VAPID 公開金鑰是 base64url 字串，瀏覽器要的是 Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// iPhone 只有「加到主畫面」之後開啟的 App 才收得到推播
export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export async function getExistingSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// 註冊 Service Worker（App 一啟動就先做，之後要訂閱才不用等）
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("Service Worker 註冊失敗", err);
    return null;
  }
}

// 要求通知權限並訂閱推播，成功後把訂閱資料存到後端
export async function subscribePush(vapidPublicKey, label) {
  if (!pushSupported()) throw new Error("這個瀏覽器不支援推播通知");
  if (!vapidPublicKey) throw new Error("伺服器還沒設定推播金鑰（VAPID_PUBLIC_KEY）");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("你剛剛拒絕了通知權限，要到手機設定裡才能重新開啟");

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
  if (!reg) throw new Error("Service Worker 註冊失敗");
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  await savePushSubscription(sub.toJSON(), label);
  return sub;
}

export async function unsubscribePush() {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await deletePushSubscription(sub.endpoint);
  await sub.unsubscribe();
}
