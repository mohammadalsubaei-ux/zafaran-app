import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://zafaran-backend-production.up.railway.app";

// إعداد طريقة عرض الإشعار
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// طلب إذن الإشعارات وتسجيل التوكن
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name:       "زعفران",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F2B233",
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({
  projectId: "4afa0fbf-0d21-4926-b6dd-fe7706254776",
})).data;
  return token;
}

// حفظ التوكن في السيرفر
export async function savePushToken(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;

    // لا نرسل الرمز قبل الدخول — الخادم يرفضه بلا جلسة
    const stored = await AsyncStorage.getItem("user");
    if (!stored) return;

    // الخادم يأخذ الهوية من رمز الجلسة — لا نرسل user_id
    await fetch(`${API}/api/users/push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    await AsyncStorage.setItem("push_token", token);
  } catch {
    // تجاهل الخطأ — الإشعارات اختيارية
  }
}

// الاستماع للإشعارات الواردة
export function setupNotificationListeners(
  onNotification?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
) {
  const notifSub = Notifications.addNotificationReceivedListener((notification) => {
    onNotification?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse?.(response);
  });

  return () => {
    notifSub.remove();
    responseSub.remove();
  };
}