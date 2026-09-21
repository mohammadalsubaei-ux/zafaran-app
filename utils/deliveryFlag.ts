import { useEffect, useState } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  مفتاح التوصيل — delivery_enabled في app_settings (الباك إند)
//  "true" فقط يُظهر خيار التوصيل وتسجيل المناديب.
//  غياب الإعداد (404) أو تعذر القراءة = مطفأ: التطبيق يعمل بالاستلام من المتجر فقط.
//  التشغيل والإطفاء من قاعدة البيانات مباشرة، بلا بناء جديد.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API = "https://zafaran-backend-production.up.railway.app";
const TTL_MS = 5 * 60 * 1000;

let cachedValue: boolean | null = null;
let cachedAt = 0;
let inflight: Promise<boolean> | null = null;

export function fetchDeliveryEnabled(): Promise<boolean> {
  const fresh = cachedValue !== null && Date.now() - cachedAt < TTL_MS;
  if (fresh) return Promise.resolve(cachedValue as boolean);
  if (inflight) return inflight;

  inflight = fetch(`${API}/api/settings/delivery_enabled`)
    .then((r) => r.json())
    .then((j) => String(j?.data?.value || "").trim().toLowerCase() === "true")
    .catch(() => false)
    .then((value) => {
      cachedValue = value;
      cachedAt = Date.now();
      inflight = null;
      return value;
    });

  return inflight;
}

export function useDeliveryEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(cachedValue === true);

  useEffect(() => {
    let alive = true;
    fetchDeliveryEnabled().then((value) => { if (alive) setEnabled(value); });
    return () => { alive = false; };
  }, []);

  return enabled;
}
