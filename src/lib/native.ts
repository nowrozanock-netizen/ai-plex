// Browser/native helpers. Native plugins are loaded lazily so the web build never touches them.
import { Capacitor } from "@capacitor/core";

export const isNative = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

/** Pick or capture a photo. Returns a data URL (JPEG/PNG) or null when cancelled. */
export async function pickImage(source: "camera" | "gallery"): Promise<string | null> {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const perm = await Camera.requestPermissions({ permissions: source === "camera" ? ["camera"] : ["photos"] });
    const state = source === "camera" ? perm.camera : perm.photos;
    if (state === "denied") throw new Error(`Please allow ${source === "camera" ? "camera" : "photo"} access in your device settings.`);
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1600,
        resultType: CameraResultType.DataUrl,
        source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      });
      return photo.dataUrl ?? null;
    } catch (e) {
      if (String(e).toLowerCase().includes("cancel")) return null;
      throw e;
    }
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resizeImage(file).then(resolve, reject);
    };
    input.click();
  });
}

async function resizeImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Couldn't read that image."));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Ask for notification permission and register for Firebase push on Android. */
export async function initNotifications() {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.requestPermissions();
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive === "granted") {
        await PushNotifications.addListener("registration", (t) => localStorage.setItem("aiplex_fcm_token", t.value));
        await PushNotifications.addListener("registrationError", (e) => console.warn("Push registration failed", e));
        await PushNotifications.register();
      }
    } catch (e) {
      console.warn("Notifications unavailable", e);
    }
    return;
  }
  if ("Notification" in window && Notification.permission === "default" && window.top === window.self) {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
  }
}

/** Notify that an AI answer is ready (shown when the app is in the background). */
export async function notifyReady(preview: string) {
  const body = preview.replace(/[#*`_>]/g, "").slice(0, 120);
  try {
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [{ id: Date.now() % 2147483647, title: "AI PLEX answer ready", body }],
      });
      return;
    }
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      new Notification("AI PLEX answer ready", { body });
    }
  } catch (e) {
    console.warn("Notification failed", e);
  }
}
