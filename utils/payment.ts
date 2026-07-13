const API = "https://zafaran-backend-production.up.railway.app";

export type PaymentMethod = "card" | "apple_pay" | "stc_pay";

export type PaymentResult = {
  success: boolean;
  data?: any;
  message?: string;
};

/**
 * نقطة الاستدعاء الوحيدة للدفع بكل التطبيق.
 * حالياً تستدعي محاكاة الباك إند (routes/payment.js).
 * لما Moyasar يجهز، ما نغيّر شي هنا — التغيير يصير بالباك إند فقط.
 */
export async function processPayment(
  orderId: string,
  method: PaymentMethod
): Promise<PaymentResult> {
  try {
    const res = await fetch(`${API}/api/payment/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, payment_method: method }),
    });

    const json = await res.json();

    if (!json?.success) {
      return { success: false, message: json?.message || "فشلت عملية الدفع" };
    }

    return { success: true, data: json.data };
  } catch {
    return { success: false, message: "تعذر الاتصال بخادم الدفع" };
  }
}

export async function getPaymentStatus(orderId: string): Promise<PaymentResult> {
  try {
    const res = await fetch(`${API}/api/payment/${orderId}/status`);
    const json = await res.json();

    if (!json?.success) {
      return { success: false, message: json?.message || "تعذر جلب حالة الدفع" };
    }

    return { success: true, data: json.data };
  } catch {
    return { success: false, message: "تعذر الاتصال بخادم الدفع" };
  }
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "البطاقة البنكية",
  apple_pay: "Apple Pay",
  stc_pay: "STC Pay",
};