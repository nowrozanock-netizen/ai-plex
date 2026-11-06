import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.aiplex",
  appName: "AI PLEX",
  webDir: "dist/client",
  // The native app loads the hosted app so AI calls stay on the server (keys never ship in the APK).
  // Replace with your published URL before releasing.
  server: {
    url: "https://id-preview--6bc58330-e924-4c09-a5d4-1f47b5158e15.lovable.app?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    LocalNotifications: { smallIcon: "ic_stat_icon_config_sample" },
    CapacitorSQLite: { androidIsEncryption: false },
  },
};

export default config;
