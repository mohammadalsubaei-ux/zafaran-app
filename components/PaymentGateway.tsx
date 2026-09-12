import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { CheckCircle2, CreditCard, Smartphone, Wallet, XCircle } from "lucide-react-native";
import { useTheme, type Colors } from "@/context/ThemeContext";

const API = "https://zafaran-backend-production.up.railway.app";
const RETURN_LINK = "zafaranapp://payment-return";

export type PaymentMethod = "card" | "apple_pay" | "stc_pay";

type Props = {
  visible: boolean;
  orderId: string | null;
  paymentMethod: PaymentMethod;
  onSuccess: (transactionId: string) => void;
  onClose: () => void;
};

const METHOD_META: Record<PaymentMethod, { label: string; Icon: any }> = {
  card:      { label: "مدى / بطاقة", Icon: CreditCard },
  apple_pay: { label: "Apple Pay",   Icon: Smartphone },
  stc_pay:   { label: "STC Pay",     Icon: Wallet },
};

type Stage = "creating" | "browser" | "verifying" | "success" | "unconfirmed" | "error";

const POLL_ATTEMPTS = 6;
const POLL_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * الواجهة الوحيدة لأي عملية دفع إلكتروني في التطبيق.
 * التطبيق لا يعرف من هي البوابة:
 *   1. POST /api/payment/create  → رابط صفحة الدفع (يُفتح في المتصفح الداخلي — Apple Pay يعمل فيه)
 *   2. عند العودة: GET /api/payment/status/:id — الخادم يتحقق عند البوابة بالمفتاح السري
 * تبديل البوابة = الباك إند فقط. هذا الملف لا يتغير.
 */
export default function PaymentGateway({ visible, orderId, paymentMethod, onSuccess, onClose }: Props) {
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const [stage, setStage]       = useState<Stage>("creating");
  const [errorMsg, setErrorMsg] = useState("");
  const [runId, setRunId]       = useState(0);
  const cancelled = useRef(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkStatus = useCallback(async (id: string): Promise<{ paid: boolean; tx: string }> => {
    for (let i = 0; i < POLL_ATTEMPTS; i++) {
      if (cancelled.current) return { paid: false, tx: "" };
      try {
        const res  = await fetch(`${API}/api/payment/status/${encodeURIComponent(id)}`);
        const json = await res.json().catch(() => null);
        if (json?.success && json.data?.paid) return { paid: true, tx: String(json.data.transaction_id || "") };
      } catch {}
      await sleep(POLL_DELAY_MS);
    }
    return { paid: false, tx: "" };
  }, []);

  useEffect(() => {
    if (!visible || !orderId) return;
    cancelled.current = false;
    setStage("creating");
    setErrorMsg("");

    (async () => {
      try {
        // 1) رابط الدفع من الخادم
        const res  = await fetch(`${API}/api/payment/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        });
        const json = await res.json().catch(() => null);
        if (cancelled.current) return;

        if (!res.ok || !json?.success || !json.data?.url) {
          setStage("error");
          setErrorMsg(json?.message || "تعذر بدء عملية الدفع");
          return;
        }

        // 2) صفحة الدفع في المتصفح الداخلي — تُغلق تلقائياً عند العودة للتطبيق
        setStage("browser");
        await WebBrowser.openAuthSessionAsync(String(json.data.url), RETURN_LINK);
        if (cancelled.current) return;

        // 3) التحقق من الخادم — سواء أُغلق المتصفح بالعودة أو يدوياً
        setStage("verifying");
        const { paid, tx } = await checkStatus(orderId);
        if (cancelled.current) return;

        if (paid) {
          setStage("success");
          successTimer.current = setTimeout(() => onSuccess(tx), 1100);
        } else {
          setStage("unconfirmed");
        }
      } catch {
        if (cancelled.current) return;
        setStage("error");
        setErrorMsg("تعذر الاتصال بالخادم، تحقق من الإنترنت");
      }
    })();

    return () => {
      cancelled.current = true;
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [visible, orderId, runId, checkStatus, onSuccess]);

  const recheck = useCallback(async () => {
    if (!orderId) return;
    setStage("verifying");
    const { paid, tx } = await checkStatus(orderId);
    if (cancelled.current) return;
    if (paid) { setStage("success"); successTimer.current = setTimeout(() => onSuccess(tx), 1100); }
    else setStage("unconfirmed");
  }, [orderId, checkStatus, onSuccess]);

  const retry = useCallback(() => setRunId(n => n + 1), []);

  const methodMeta = METHOD_META[paymentMethod] ?? METHOD_META.card;
  const MethodIcon = methodMeta.Icon;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {(stage === "creating" || stage === "browser" || stage === "verifying") && (
            <>
              <View style={s.iconWrap}>
                <MethodIcon size={30} color={c.gold} strokeWidth={1.8} />
              </View>
              <ActivityIndicator size="large" color={c.gold} style={{ marginVertical: 14 }} />
              <Text style={s.title}>
                {stage === "creating" ? "جاري تجهيز الدفع..." : stage === "browser" ? "أكمل الدفع في الصفحة المفتوحة" : "جاري التحقق من الدفع..."}
              </Text>
              <Text style={s.sub}>عبر {methodMeta.label}</Text>
              {stage === "browser" ? (
                <TouchableOpacity activeOpacity={0.88} style={s.ghostBtn} onPress={onClose}>
                  <Text style={s.ghostText}>إلغاء</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {stage === "success" && (
            <>
              <View style={[s.iconWrap, { backgroundColor: c.successSoft }]}>
                <CheckCircle2 size={36} color={c.success} strokeWidth={1.8} />
              </View>
              <Text style={[s.title, { color: c.success }]}>تم الدفع بنجاح</Text>
              <Text style={s.sub}>جاري تأكيد طلبك...</Text>
            </>
          )}

          {stage === "unconfirmed" && (
            <>
              <View style={[s.iconWrap, { backgroundColor: c.dangerSoft }]}>
                <XCircle size={36} color={c.danger} strokeWidth={1.8} />
              </View>
              <Text style={[s.title, { color: c.danger }]}>لم يتأكد الدفع</Text>
              <Text style={s.sub}>إن كنت أكملت الدفع اضغط "تحقق مجدداً". وإلا يبقى طلبك محفوظاً وتقدر تدفعه لاحقاً من شاشة الطلب.</Text>
              <TouchableOpacity activeOpacity={0.88} style={s.retryBtn} onPress={recheck}>
                <Text style={s.retryText}>تحقق مجدداً</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.88} style={s.ghostBtn} onPress={onClose}>
                <Text style={s.ghostText}>لاحقاً</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === "error" && (
            <>
              <View style={[s.iconWrap, { backgroundColor: c.dangerSoft }]}>
                <XCircle size={36} color={c.danger} strokeWidth={1.8} />
              </View>
              <Text style={[s.title, { color: c.danger }]}>تعذر إتمام الدفع</Text>
              <Text style={s.sub}>{errorMsg}</Text>
              <TouchableOpacity activeOpacity={0.88} style={s.retryBtn} onPress={retry}>
                <Text style={s.retryText}>حاول مرة ثانية</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.88} style={s.ghostBtn} onPress={onClose}>
                <Text style={s.ghostText}>إغلاق</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  card:     { width: "100%", maxWidth: 340, backgroundColor: c.surface, borderRadius: 24, paddingVertical: 32, paddingHorizontal: 24, alignItems: "center", borderWidth: 1, borderColor: c.goldBorder },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center" },
  title:    { color: c.text, fontSize: 16, fontFamily: "Almarai_800ExtraBold", marginTop: 6, textAlign: "center" },
  sub:      { color: c.textSoft, fontSize: 12, fontFamily: "Almarai_400Regular", marginTop: 6, textAlign: "center", lineHeight: 20 },
  retryBtn: { marginTop: 18, backgroundColor: c.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 11 },
  retryText:{ color: c.bg, fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  ghostBtn: { marginTop: 10, paddingHorizontal: 28, paddingVertical: 9 },
  ghostText:{ color: c.textSoft, fontSize: 13, fontFamily: "Almarai_400Regular" },
});
