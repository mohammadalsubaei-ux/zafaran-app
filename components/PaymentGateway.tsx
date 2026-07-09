import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CheckCircle2, CreditCard, Smartphone, Wallet, XCircle } from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

export type PaymentMethod = "card" | "apple_pay" | "stc_pay";

type Props = {
  visible: boolean;
  orderId: string | null;
  paymentMethod: PaymentMethod;
  onSuccess: (transactionId: string) => void;
  onClose: () => void;
};

const METHOD_META: Record<PaymentMethod, { label: string; Icon: any }> = {
  card: { label: "البطاقة البنكية", Icon: CreditCard },
  apple_pay: { label: "Apple Pay", Icon: Smartphone },
  stc_pay: { label: "STC Pay", Icon: Wallet },
};

/**
 * ⚠️ نقطة الدمج المستقبلية الوحيدة لبوابة دفع حقيقية (Moyasar) ⚠️
 * هذا المكوّن هو الواجهة الوحيدة لأي عملية دفع بالتطبيق.
 * حالياً يستدعي /api/payment/process (محاكاة بالباك إند).
 * لما تجهز Moyasar، التعديل يصير بالباك إند فقط (routes/payment.js) —
 * هذا المكوّن نفسه ما يحتاج أي تغيير.
 */
export default function PaymentGateway({
  visible,
  orderId,
  paymentMethod,
  onSuccess,
  onClose,
}: Props) {
  const [stage, setStage] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !orderId) return;

    setStage("processing");
    setErrorMsg("");

    let cancelled = false;

    fetch(`${API}/api/payment/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, payment_method: paymentMethod }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setStage("success");
          successTimer.current = setTimeout(() => {
            onSuccess(json.data?.transaction_id || "");
          }, 1100);
        } else {
          setStage("error");
          setErrorMsg(json.message || "تعذر إتمام الدفع");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStage("error");
        setErrorMsg("تعذر الاتصال بالخادم، تحقق من الإنترنت");
      });

    return () => {
      cancelled = true;
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [visible, orderId, paymentMethod, onSuccess]);

  const methodMeta = METHOD_META[paymentMethod] ?? METHOD_META.card;
  const MethodIcon = methodMeta.Icon;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {stage === "processing" && (
            <>
              <View style={s.iconWrap}>
                <MethodIcon size={30} color="#F2B233" strokeWidth={1.8} />
              </View>
              <ActivityIndicator size="large" color="#F2B233" style={{ marginVertical: 14 }} />
              <Text style={s.title}>جاري معالجة الدفع...</Text>
              <Text style={s.sub}>عبر {methodMeta.label}</Text>
            </>
          )}

          {stage === "success" && (
            <>
              <View style={[s.iconWrap, { backgroundColor: "rgba(76,175,80,0.12)" }]}>
                <CheckCircle2 size={36} color="#4CAF50" strokeWidth={1.8} />
              </View>
              <Text style={[s.title, { color: "#8AF0A5" }]}>تم الدفع بنجاح</Text>
              <Text style={s.sub}>جاري تأكيد طلبك...</Text>
            </>
          )}

          {stage === "error" && (
            <>
              <View style={[s.iconWrap, { backgroundColor: "rgba(229,57,53,0.12)" }]}>
                <XCircle size={36} color="#E53935" strokeWidth={1.8} />
              </View>
              <Text style={[s.title, { color: "#FF9A9A" }]}>تعذر إتمام الدفع</Text>
              <Text style={s.sub}>{errorMsg}</Text>

              <TouchableOpacity activeOpacity={0.88} style={s.retryBtn} onPress={onClose}>
                <Text style={s.retryText}>حسناً</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#21160D",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.15)",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(242,178,51,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FDF0DC",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
    marginTop: 6,
    textAlign: "center",
  },
  sub: {
    color: "#A98961",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
    marginTop: 6,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: "#F2B233",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 11,
  },
  retryText: {
    color: "#17100B",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },
});