// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  زعفران — إرفاق رمز الجلسة تلقائياً بكل طلب للخادم
//
//  لماذا اعتراض fetch بدل تعديل 65 استدعاءً يدوياً:
//  التعديل اليدوي يعني نسيان استدعاء أو اثنين، والنسيان هنا يعني
//  شاشة معطّلة عند المستخدم. الاعتراض يغطي الكل بلا استثناء،
//  ويشمل أي استدعاء يُضاف مستقبلاً بلا عمل إضافي.
//
//  يُستدعى setupAuthFetch() مرة واحدة في app/_layout.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_HOST = "zafaran-backend-production.up.railway.app";

// نسخة مخزّنة من الرمز حتى لا نقرأ AsyncStorage مع كل طلب
let cachedToken: string | null = null;
let loaded = false;

export async function getToken(): Promise<string | null> {
  if (loaded) return cachedToken;

  try {
    const raw = await AsyncStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    cachedToken = user?.token || null;
  } catch {
    cachedToken = null;
  }

  loaded = true;
  return cachedToken;
}

// تُستدعى بعد الدخول أو التسجيل أو الخروج
export function setToken(token: string | null) {
  cachedToken = token;
  loaded = true;
}

export function clearToken() {
  cachedToken = null;
  loaded = true;
}

let installed = false;

export function setupAuthFetch() {
  if (installed) return;
  installed = true;

  const original = global.fetch;

  global.fetch = async function patchedFetch(input: any, init?: any) {
    let url = "";

    try {
      url = typeof input === "string" ? input : input?.url || "";
    } catch {
      url = "";
    }

    // لا نرسل الرمز لأي جهة خارجية — لخادم زعفران فقط
    if (!url.includes(API_HOST)) {
      return original(input, init);
    }

    const token = await getToken();
    if (!token) return original(input, init);

    const headers = new Headers(init?.headers || {});
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return original(input, { ...(init || {}), headers });
  } as typeof fetch;
}
