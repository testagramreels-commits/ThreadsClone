import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

/* =========================
   FIREBASE CONFIG (YOUR PROJECT)
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyC9vA9X-TPzpHB7yaemYUTZuEaoZ-AB4Qc",
  authDomain: "threadsclone-43ca1.firebaseapp.com",
  projectId: "threadsclone-43ca1",
  storageBucket: "threadsclone-43ca1.appspot.com",
  messagingSenderId: "31488412729",
  appId: "1:31488412729:android:c0bace20152f9725b2d1e8"
};

/* =========================
   INITIALIZE FIREBASE
========================= */
const app = initializeApp(firebaseConfig);

/* =========================
   SAFE MESSAGING INIT
   (fixes crashes on unsupported devices)
========================= */
let messaging: any = null;

export const initMessaging = async () => {
  const supported = await isSupported();

  if (supported) {
    messaging = getMessaging(app);
    return messaging;
  } else {
    console.warn("⚠️ FCM not supported on this device");
    return null;
  }
};

export { app, messaging };
