import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, RefreshControl, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold, useFonts,
} from "@expo-google-fonts/almarai";
import {
  AlertCircle, ArrowRight, CalendarDays, CheckCircle2, ChefHat, Clock3,
  CreditCard, Flame, Gift, Home, MapPin, Navigation, PackageCheck,
  ReceiptText, RefreshCw, Smartphone, Star, Truck, UtensilsCrossed,
  Wallet, XCircle,
} from "lucide-react-native";

import PaymentGateway, { PaymentMethod as GatewayMethod } from "@/components/PaymentGateway";

const isWeb = require('react-native').Platform.OS === 'web';
const MapView   = isWeb ? () => null : require('react-native-maps').default;
const Marker    = isWeb ? () => null : require('react-native-maps').Marker;
const Polyline  = isWeb ? () => null : require('react-native-maps').Polyline;

const API = "https://zafaran-backend-production.up.railway.app";
const TRACKING_POLL_INTERVAL = 8000; // 8 ثواني

type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled" | "pending_time" | "time_confirmed";
type PaymentMethod = "stc_pay" | "apple_pay" | "card" | string;
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | string;

type OrderItem = {
  id?: string;
  name?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
  subtotal?: number | string | null;
  menu_items?: { name?: string | null; price?: number | string | null } | null;
};

type Order = {
  id: string;
  status?: OrderStatus | string | null;
  created_at?: string | null;
  delivery_type?: "delivery" | "pickup" | string | null;
  delivery_address?: string | null;
  delivery_fee?: number | string | null;
  delivery_lat?: number | string | null;
  delivery_lng?: number | string | null;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
  subtotal?: number | string | null;
  total?: number | string | null;
  total_amount?: number | string | null;
  cancel_reason?: string | null;
  notes?: string | null;
  order_type?: string | null;
  requested_time?: string | null;
  proposed_time?: string | null;
  confirmed_time?: string | null;
  time_negotiation_status?: "pending" | "chef_countered" | "accepted" | "rejected" | string | null;
  chefs?: {
    city?: string | null;
    neighborhood?: string | null;
    users?: { full_name?: string | null; gender?: string | null; phone?: string | null } | null;
  } | null;
  order_items?: OrderItem[] | null;
  items?: OrderItem[] | null;
};

type DriverLocation = {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  updated_at?: string | null;
} | null;

const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  pending:        { label: "بانتظار القبول",       color: "#F2B233", bg: "rgba(242,178,51,0.12)",  Icon: Clock3       },
  pending_time:   { label: "بانتظار تأكيد الوقت",  color: "#FF9800", bg: "rgba(255,152,0,0.12)",   Icon: Clock3       },
  time_confirmed: { label: "تم تأكيد الوقت",       color: "#8BC34A", bg: "rgba(139,195,74,0.12)",  Icon: CheckCircle2 },
  accepted:       { label: "تم القبول",             color: "#2196F3", bg: "rgba(33,150,243,0.12)",  Icon: CheckCircle2 },
  preparing:      { label: "قيد التحضير",           color: "#FF6600", bg: "rgba(255,102,0,0.12)",   Icon: Flame        },
  ready:          { label: "جاهز للاستلام",         color: "#9C27B0", bg: "rgba(156,39,176,0.12)",  Icon: Gift         },
  delivering:     { label: "في الطريق",             color: "#03A9F4", bg: "rgba(3,169,244,0.12)",   Icon: Truck        },
  delivered:      { label: "تم التسليم",            color: "#4CAF50", bg: "rgba(76,175,80,0.12)",   Icon: Home         },
  cancelled:      { label: "ملغي",                  color: "#E53935", bg: "rgba(229,57,53,0.12)",   Icon: XCircle      },
};

const TRACK_STEPS_DELIVERY = [
  { key: "accepted",   label: "قبول الطلب",    Icon: CheckCircle2 },
  { key: "preparing",  label: "التحضير",        Icon: Flame        },
  { key: "ready",      label: "جاهز",           Icon: PackageCheck },
  { key: "delivering", label: "في الطريق",      Icon: Truck        },
  { key: "delivered",  label: "تم التسليم",     Icon: Home         },
];

const TRACK_STEPS_PICKUP = [
  { key: "accepted",  label: "قبول الطلب",     Icon: CheckCircle2 },
  { key: "preparing", label: "التحضير",         Icon: Flame        },
  { key: "ready",     label: "جاهز للاستلام",  Icon: PackageCheck },
  { key: "delivered", label: "تم الاستلام",    Icon: Home         },
];

function text(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const clean = String(value).trim();
  return clean.length ? clean : fallback;
}
function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
function money(value: unknown) {
  return `${numberValue(value).toFixed(2).replace(".00", "")} ريال`;
}
function shortId(id: unknown) {
  const clean = text(id, "");
  return clean ? clean.slice(0, 8).toUpperCase() : "—";
}
function formatDate(value: unknown) {
  const raw = text(value, "");
  if (!raw) return "غير محدد";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function formatDateTime(value: unknown) {
  const raw = text(value, "");
  if (!raw) return "غير محدد";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function paymentLabel(method?: PaymentMethod | null) {
  if (method === "stc_pay")   return "STC Pay";
  if (method === "apple_pay") return "Apple Pay";
  if (method === "card")      return "مدى / بطاقة";
  return "غير محدد";
}
function PaymentIcon({ method, color }: { method?: PaymentMethod | null; color: string }) {
  if (method === "apple_pay") return <Smartphone size={18} color={color} strokeWidth={1.8} />;
  if (method === "card")      return <CreditCard  size={18} color={color} strokeWidth={1.8} />;
  return <Wallet size={18} color={color} strokeWidth={1.8} />;
}
function paymentStatusLabel(status?: PaymentStatus | null) {
  if (status === "paid")     return "مدفوع";
  if (status === "failed")   return "فشل الدفع";
  if (status === "refunded") return "مسترجع";
  return "بانتظار الدفع";
}
function paymentStatusColor(status?: PaymentStatus | null) {
  if (status === "paid")     return "#4CAF50";
  if (status === "failed")   return "#E53935";
  if (status === "refunded") return "#03A9F4";
  return "#F2B233";
}

// خريطة بسيطة بدون react-native-maps (WebView بديل)
function SimpleMap({ driverLat, driverLng, destLat, destLng }: {
  driverLat: number; driverLng: number;
  destLat?: number | null; destLng?: number | null;
}) {
  const hasDest = destLat != null && destLng != null;

  // نطاق الخريطة يشمل المندوب والوجهة مع بعض إذا متوفرة، وإلا يتمركز على المندوب بس
  const midLat = hasDest ? (driverLat + destLat!) / 2 : driverLat;
  const midLng = hasDest ? (driverLng + destLng!) / 2 : driverLng;
  const latDelta = hasDest ? Math.max(Math.abs(driverLat - destLat!) * 1.8, 0.01) : 0.01;
  const lngDelta = hasDest ? Math.max(Math.abs(driverLng - destLng!) * 1.8, 0.01) : 0.01;

  return (
    <View style={ms.mapWrap}>
      <MapView
        style={ms.map}
        region={{ latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta }}
      >
        <Marker coordinate={{ latitude: driverLat, longitude: driverLng }} title="المندوب" pinColor="#03A9F4">
          <View style={ms.driverPin}>
            <Truck size={16} color="#17100B" strokeWidth={2} />
          </View>
        </Marker>

        {hasDest && (
          <Marker coordinate={{ latitude: destLat!, longitude: destLng! }} title="موقع التسليم" pinColor="#F2B233" />
        )}

        {hasDest && (
          <Polyline
            coordinates={[
              { latitude: driverLat, longitude: driverLng },
              { latitude: destLat!, longitude: destLng! },
            ]}
            strokeColor="#03A9F4"
            strokeWidth={3}
          />
        )}
      </MapView>

      <TouchableOpacity
        style={ms.openMapBtn}
        onPress={() => {
          const { Linking } = require("react-native");
          Linking.openURL(`https://www.google.com/maps?q=${driverLat},${driverLng}`);
        }}
        activeOpacity={0.9}
      >
        <Navigation size={13} color="#17100B" strokeWidth={2} />
        <Text style={ms.openMapBtnText}>فتح بخرائط جوجل</Text>
      </TouchableOpacity>
    </View>
  );
}

const ms = StyleSheet.create({
  mapWrap:        { borderRadius: 18, overflow: "hidden", marginBottom: 4 },
  map:            { width: "100%", height: 220 },
  driverPin:      { backgroundColor: "#03A9F4", padding: 6, borderRadius: 20, borderWidth: 2, borderColor: "#17100B" },
  openMapBtn:     { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#03A9F4", paddingVertical: 10, },
  openMapBtnText: { color: "#17100B", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
});

export default function OrderDetailScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams();
  const orderId = Array.isArray(id) ? id[0] : id;

  const [order, setOrder]             = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [respondLoading, setRespondLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const trackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const loadOrder = useCallback(async (silent = false) => {
    if (!orderId) { setOrder(null); setError("رقم الطلب غير موجود."); setLoading(false); return; }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/api/orders/${orderId}`);
      const json     = await response.json().catch(() => null);
      if (!response.ok || !json?.success || !json?.data) {
        setOrder(null); setError(json?.message || "الطلب غير موجود."); return;
      }
      setOrder(json.data);
    } catch {
      setOrder(null); setError("تعذر الاتصال بالخادم.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [orderId]);

  const fetchDriverLocation = useCallback(async () => {
    if (!orderId) return;
    try {
      const res  = await fetch(`${API}/api/tracking/${orderId}`);
      const json = await res.json().catch(() => null);
      if (json?.success && json?.data) {
        setDriverLocation(json.data);
        setLastUpdated(json.data.updated_at || new Date().toISOString());
      }
    } catch {}
  }, [orderId]);

  useEffect(() => { loadOrder(false); }, [loadOrder]);

  // تتبع لحظي عند حالة delivering
  useEffect(() => {
    if (order?.status === "delivering") {
      fetchDriverLocation();
      trackingIntervalRef.current = setInterval(fetchDriverLocation, TRACKING_POLL_INTERVAL);
    } else {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      if (order?.status !== "delivering") setDriverLocation(null);
    }
    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, [order?.status, fetchDriverLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrder(true);
    if (order?.status === "delivering") await fetchDriverLocation();
  }, [loadOrder, order?.status, fetchDriverLocation]);

  const respondToTime = useCallback(async (action: "accept" | "reject") => {
    if (!orderId) return;
    setRespondLoading(true);
    try {
      const res  = await fetch(`${API}/api/orders/${orderId}/respond-time`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        await loadOrder(true);
      }
    } finally {
      setRespondLoading(false);
    }
  }, [orderId, loadOrder]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false);
    loadOrder(true);
  }, [loadOrder]);

  const handlePaymentClose = useCallback(() => {
    setShowPayment(false);
  }, []);

  const goBack      = useCallback(() => { router.back(); }, [router]);
  const orderItems  = useMemo(() => order?.order_items || order?.items || [], [order]);

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تحميل تفاصيل الطلب...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={goBack}>
            <ArrowRight size={20} color="#F2B233" />
          </TouchableOpacity>
          <Text style={s.title}>تفاصيل الطلب</Text>
          <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={onRefresh}>
            <RefreshCw size={18} color="#F2B233" />
          </TouchableOpacity>
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}><AlertCircle size={58} color="#E53935" strokeWidth={1.5} /></View>
          <Text style={s.emptyTitle}>الطلب غير موجود</Text>
          <Text style={s.emptyText}>{error || "لم نتمكن من العثور على بيانات هذا الطلب."}</Text>
          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={onRefresh}>
            <Text style={s.primaryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusKey   = String(order.status || "pending");
  const status      = STATUS_META[statusKey] || STATUS_META.pending;
  const StatusIcon  = status.Icon;
  const TRACK_STEPS = order?.delivery_address === "استلام شخصي" ? TRACK_STEPS_PICKUP : TRACK_STEPS_DELIVERY;
  const normalizedKey = statusKey === "time_confirmed" ? "accepted" : statusKey === "pending_time" ? "pending" : statusKey;
  const currentStep = TRACK_STEPS.findIndex((st) => st.key === normalizedKey);
  const isCancelled = statusKey === "cancelled";
  const isDelivered = statusKey === "delivered";
  const isDelivering = statusKey === "delivering";
  const isPreorder  = order.order_type === "preorder";
  const isMale      = order.chefs?.users?.gender === "male";
  const isPickup    = order.delivery_type === "pickup" || text(order.delivery_address, "") === "استلام شخصي";
  const subtotal    = numberValue(order.subtotal);
  const deliveryFee = isPickup ? 0 : numberValue(order.delivery_fee);
  const total       = numberValue(order.total_amount || order.total || subtotal + deliveryFee);
  const chefName    = text(order.chefs?.users?.full_name, isMale ? "الشيف" : "الشيفة");
  const chefLocation = [order.chefs?.city, order.chefs?.neighborhood].filter(Boolean).join(" · ");
  const paymentColor = paymentStatusColor(order.payment_status);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={goBack}>
          <ArrowRight size={20} color="#F2B233" />
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.title}>تفاصيل الطلب</Text>
          <Text style={s.headerSub}>#{shortId(order.id)}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={onRefresh}>
          <RefreshCw size={18} color="#F2B233" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F2B233" />}
      >
        {/* Hero */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
              <StatusIcon size={15} color={status.color} strokeWidth={1.8} />
              <Text style={[s.statusBadgeText, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={s.orderNumber}>#{shortId(order.id)}</Text>
          </View>
          <Text style={s.heroTitle}>
            {isCancelled ? "تم إلغاء الطلب" : isDelivered ? "تم اكتمال الطلب" : "طلبك قيد المتابعة"}
          </Text>
          <Text style={s.heroSub}>{formatDate(order.created_at)}</Text>
        </View>

        {/* تتبع المندوب اللحظي */}
        {isDelivering && (
          <View style={s.trackingCard}>
            <View style={s.cardTitleRow}>
              <Truck size={17} color="#03A9F4" strokeWidth={1.8} />
              <Text style={[s.cardTitle, { color: "#03A9F4" }]}>تتبع المندوب</Text>
              {driverLocation && (
                <View style={s.liveBadge}>
                  <View style={s.liveDot} />
                  <Text style={s.liveBadgeText}>مباشر</Text>
                </View>
              )}
            </View>

            {driverLocation ? (
              <>
                <SimpleMap
                  driverLat={driverLocation.lat}
                  driverLng={driverLocation.lng}
                  destLat={numberValue(order.delivery_lat) || null}
                  destLng={numberValue(order.delivery_lng) || null}
                />
                {lastUpdated && (
                  <Text style={s.lastUpdatedText}>
                    آخر تحديث: {new Date(lastUpdated).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </Text>
                )}
              </>
            ) : (
              <View style={s.trackingWaiting}>
                <ActivityIndicator color="#03A9F4" size="small" />
                <Text style={s.trackingWaitingText}>في انتظار موقع المندوب...</Text>
              </View>
            )}
          </View>
        )}

        {/* معلومات الحجز المسبق */}
        {isPreorder && (order.proposed_time || order.requested_time || order.confirmed_time) && (
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <CalendarDays size={17} color="#F2B233" strokeWidth={1.8} />
              <Text style={s.cardTitle}>وقت الحجز</Text>
            </View>
            {(order.proposed_time || order.requested_time) && (
              <View style={s.timeRow}>
                <Text style={s.timeLabel}>الوقت المطلوب</Text>
                <Text style={s.timeValue}>{formatDateTime(order.proposed_time || order.requested_time || "")}</Text>
              </View>
            )}
            {order.confirmed_time && order.time_negotiation_status === "accepted" && (
              <View style={[s.timeRow, { marginTop: 8 }]}>
                <Text style={[s.timeLabel, { color: "#8BC34A" }]}>الوقت المؤكد</Text>
                <Text style={[s.timeValue, { color: "#8BC34A" }]}>{formatDateTime(order.confirmed_time)}</Text>
              </View>
            )}

            {/* الشيف اقترح وقتاً بديلاً — بانتظار رد العميل */}
            {order.time_negotiation_status === "chef_countered" && order.confirmed_time && (
              <View style={s.counterBox}>
                <Text style={s.counterTitle}>الشيف اقترح وقتاً بديلاً</Text>
                <Text style={s.counterTime}>{formatDateTime(order.confirmed_time)}</Text>
                <Text style={s.counterSub}>وافق على الوقت الجديد أو ألغِ الطلب بدون أي رسوم</Text>

                <View style={s.counterBtns}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={s.acceptBtn}
                    disabled={respondLoading}
                    onPress={() => respondToTime("accept")}
                  >
                    {respondLoading ? (
                      <ActivityIndicator color="#17100B" size="small" />
                    ) : (
                      <Text style={s.acceptBtnText}>موافق على الوقت الجديد</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={s.rejectBtn}
                    disabled={respondLoading}
                    onPress={() => respondToTime("reject")}
                  >
                    <Text style={s.rejectBtnText}>إلغاء الطلب</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* بانتظار رد الشيف على الوقت المقترح من العميل */}
            {order.time_negotiation_status === "pending" && (
              <View style={s.waitingBox}>
                <Clock3 size={14} color="#F0A500" strokeWidth={1.8} />
                <Text style={s.waitingText}>بانتظار تأكيد الشيف للوقت</Text>
              </View>
            )}

            {/* الوقت اتفق عليه، بس الدفع لسا ما تم */}
            {order.time_negotiation_status === "accepted" && order.payment_status !== "paid" && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={s.payNowBtn}
                onPress={() => setShowPayment(true)}
              >
                <CreditCard size={16} color="#17100B" strokeWidth={1.8} />
                <Text style={s.payNowBtnText}>ادفع الآن لتأكيد الطلب</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* الطلب الفوري غير مدفوع (فشل أو أُلغي أثناء الدفع سابقاً) */}
        {!isPreorder && order.payment_status !== "paid" && !isCancelled && (
          <View style={s.card}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={s.payNowBtn}
              onPress={() => setShowPayment(true)}
            >
              <CreditCard size={16} color="#17100B" strokeWidth={1.8} />
              <Text style={s.payNowBtnText}>ادفع الآن</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* تتبع الطلب */}
        {!isCancelled ? (
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Navigation size={17} color="#F2B233" strokeWidth={1.8} />
              <Text style={s.cardTitle}>تتبع الطلب</Text>
            </View>
            <View style={s.timeline}>
              {TRACK_STEPS.map((step, index) => {
                const done   = index <= currentStep;
                const active = index === currentStep;
                const StepIcon = step.Icon;
                return (
                  <View key={step.key} style={s.trackItem}>
                    <View style={[s.trackIcon, done && s.trackIconDone, active && s.trackIconActive]}>
                      <StepIcon size={17} color={done ? "#F2B233" : "#6D4E2D"} strokeWidth={1.8} />
                    </View>
                    <Text style={[s.trackLabel, done && s.trackLabelDone, active && s.trackLabelActive]}>
                      {step.label}
                    </Text>
                    {index < TRACK_STEPS.length - 1 && (
                      <View style={[s.trackLine, index < currentStep && s.trackLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={s.cancelCard}>
            <View style={s.cardTitleRow}>
              <XCircle size={17} color="#E53935" strokeWidth={1.8} />
              <Text style={[s.cardTitle, { color: "#FF9A9A" }]}>سبب الإلغاء</Text>
            </View>
            <Text style={s.cancelText}>{text(order.cancel_reason, "تم إلغاء الطلب.")}</Text>
          </View>
        )}

        {/* الشيف */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <ChefHat size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.cardTitle}>{isMale ? "الشيف" : "الشيفة"}</Text>
          </View>
          <Text style={s.chefName}>{chefName}</Text>
          <View style={s.inlineRow}>
            <MapPin size={13} color="#8A6030" strokeWidth={1.6} />
            <Text style={s.mutedText}>{text(chefLocation, "الموقع غير محدد")}</Text>
          </View>
        </View>

        {/* الوجبات */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <UtensilsCrossed size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.cardTitle}>الوجبات</Text>
          </View>
          {orderItems.length ? orderItems.map((item, index) => {
            const name         = text(item.name || item.menu_items?.name, "وجبة");
            const qty          = numberValue(item.quantity || 1);
            const itemPrice    = numberValue(item.price || item.menu_items?.price);
            const itemSubtotal = numberValue(item.subtotal || itemPrice * qty);
            return (
              <View key={String(item.id || `${name}-${index}`)} style={[s.itemRow, index === orderItems.length - 1 && s.itemRowLast]}>
                <View style={s.itemInfo}>
                  <Text style={s.itemName} numberOfLines={2}>{name}</Text>
                  <Text style={s.itemQty}>الكمية: {qty}</Text>
                </View>
                <Text style={s.itemPrice}>{money(itemSubtotal)}</Text>
              </View>
            );
          }) : <Text style={s.emptyMiniText}>لا توجد وجبات مسجلة.</Text>}
        </View>

        {/* الدفع */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <CreditCard size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.cardTitle}>الدفع</Text>
          </View>
          <View style={s.paymentRow}>
            <View style={s.paymentIconBox}>
              <PaymentIcon method={order.payment_method} color="#F2B233" />
            </View>
            <View style={s.paymentInfo}>
              <Text style={s.paymentTitle}>{paymentLabel(order.payment_method)}</Text>
              <Text style={[s.paymentStatus, { color: paymentColor }]}>{paymentStatusLabel(order.payment_status)}</Text>
            </View>
          </View>
        </View>

        {/* الملخص */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <ReceiptText size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.cardTitle}>ملخص المبالغ</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>الوجبات</Text>
            <Text style={s.summaryValue}>{money(subtotal)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>التوصيل</Text>
            <Text style={s.summaryValue}>{isPickup ? "مجاني" : money(deliveryFee)}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>الإجمالي</Text>
            <Text style={s.totalValue}>{money(total)}</Text>
          </View>
        </View>

        {/* العنوان */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            {isPickup ? <Home size={17} color="#F2B233" strokeWidth={1.8} /> : <MapPin size={17} color="#F2B233" strokeWidth={1.8} />}
            <Text style={s.cardTitle}>{isPickup ? "طريقة الاستلام" : "عنوان التوصيل"}</Text>
          </View>
          <Text style={s.addressText}>
            {isPickup ? "استلام شخصي من الشيف" : text(order.delivery_address, "العنوان غير محدد")}
          </Text>
        </View>

        {/* زر التقييم */}
        {isDelivered && (
          <TouchableOpacity activeOpacity={0.92} style={s.reviewBtn}
            onPress={() => router.push(`/review/${order.id}` as any)}>
            <Star size={18} color="#17100B" strokeWidth={2} fill="#17100B" />
            <Text style={s.reviewBtnText}>قيّم طلبك</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <PaymentGateway
        visible={showPayment}
        orderId={order.id}
        paymentMethod={(order.payment_method as GatewayMethod) || "card"}
        onSuccess={handlePaymentSuccess}
        onClose={handlePaymentClose}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: "#17100B" },
  loadingWrap:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText:      { color: "#FDF0DC", fontSize: 14, fontFamily: "Almarai_700Bold" },
  header:           { minHeight: 68, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.1)", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  headerBtn:        { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,178,51,0.08)", borderWidth: 1, borderColor: "rgba(242,178,51,0.14)" },
  headerTitleWrap:  { alignItems: "center" },
  title:            { color: "#FDF0DC", fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  headerSub:        { color: "#8A6030", fontSize: 11, marginTop: 3, fontFamily: "Almarai_400Regular" },
  content:          { padding: 16, paddingBottom: 36 },
  heroCard:         { backgroundColor: "#21160D", borderRadius: 28, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: "rgba(242,178,51,0.13)" },
  heroTop:          { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  statusBadge:      { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  statusBadgeText:  { fontSize: 11, fontFamily: "Almarai_800ExtraBold" },
  orderNumber:      { color: "#F2B233", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  heroTitle:        { color: "#FDF0DC", textAlign: "right", fontSize: 22, lineHeight: 32, fontFamily: "Almarai_800ExtraBold" },
  heroSub:          { color: "#A98961", textAlign: "right", marginTop: 6, fontSize: 12, lineHeight: 21, fontFamily: "Almarai_400Regular" },
  trackingCard:     { backgroundColor: "#111C22", borderRadius: 24, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "rgba(3,169,244,0.25)" },
  liveBadge:        { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(76,175,80,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: "auto" },
  liveDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4CAF50" },
  liveBadgeText:    { color: "#4CAF50", fontSize: 10, fontFamily: "Almarai_700Bold" },
  trackingWaiting:  { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 12, backgroundColor: "rgba(3,169,244,0.08)", borderRadius: 14 },
  trackingWaitingText: { color: "#03A9F4", fontSize: 12, fontFamily: "Almarai_700Bold" },
  lastUpdatedText:  { color: "#5A6A7A", textAlign: "center", fontSize: 10, marginTop: 6, fontFamily: "Almarai_400Regular" },
  card:             { backgroundColor: "#21160D", borderRadius: 24, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "rgba(242,178,51,0.1)" },
  cancelCard:       { backgroundColor: "#321717", borderRadius: 24, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "rgba(229,57,53,0.25)" },
  cardTitleRow:     { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 13 },
  cardTitle:        { color: "#FDF0DC", fontSize: 15, textAlign: "right", fontFamily: "Almarai_800ExtraBold" },
  timeRow:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  timeLabel:        { color: "#8A6030", fontSize: 12, fontFamily: "Almarai_400Regular" },
  timeValue:        { color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_700Bold" },

  counterBox: {
    marginTop: 12, backgroundColor: "rgba(240,165,0,0.08)", borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.25)",
  },
  counterTitle: { color: "#FFD27A", fontSize: 13, fontFamily: "Almarai_800ExtraBold", textAlign: "right" },
  counterTime:  { color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_800ExtraBold", textAlign: "right", marginTop: 4 },
  counterSub:   { color: "#A98961", fontSize: 11, fontFamily: "Almarai_400Regular", textAlign: "right", marginTop: 4, marginBottom: 10 },
  counterBtns:  { flexDirection: "row-reverse", gap: 8 },
  acceptBtn:    { flex: 1, backgroundColor: "#F2B233", borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  acceptBtnText:{ color: "#17100B", fontSize: 12, fontFamily: "Almarai_800ExtraBold" },
  rejectBtn:    { flex: 1, backgroundColor: "rgba(229,57,53,0.12)", borderRadius: 12, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.3)" },
  rejectBtnText:{ color: "#FF9A9A", fontSize: 12, fontFamily: "Almarai_800ExtraBold" },

  waitingBox: {
    marginTop: 12, flexDirection: "row-reverse", alignItems: "center", gap: 6,
    backgroundColor: "rgba(240,165,0,0.08)", borderRadius: 14, padding: 12,
  },
  waitingText: { color: "#FFD27A", fontSize: 12, fontFamily: "Almarai_700Bold" },

  payNowBtn: {
    marginTop: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F2B233", borderRadius: 14, paddingVertical: 13,
  },
  payNowBtnText: { color: "#17100B", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  timeline:         { gap: 0 },
  trackItem:        { minHeight: 56, flexDirection: "row-reverse", alignItems: "center", position: "relative" },
  trackIcon:        { width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#17100B", borderWidth: 1, borderColor: "rgba(242,178,51,0.1)", zIndex: 2 },
  trackIconDone:    { backgroundColor: "rgba(242,178,51,0.09)", borderColor: "rgba(242,178,51,0.32)" },
  trackIconActive:  { borderColor: "#F2B233", borderWidth: 2 },
  trackLabel:       { flex: 1, color: "#6D4E2D", textAlign: "right", paddingRight: 11, fontSize: 13, fontFamily: "Almarai_700Bold" },
  trackLabelDone:   { color: "#FDF0DC" },
  trackLabelActive: { color: "#F2B233", fontFamily: "Almarai_800ExtraBold" },
  trackLine:        { position: "absolute", right: 19, top: 40, width: 2, height: 18, backgroundColor: "rgba(242,178,51,0.1)", zIndex: 1 },
  trackLineDone:    { backgroundColor: "#F2B233" },
  chefName:         { color: "#FDF0DC", textAlign: "right", fontSize: 16, marginBottom: 8, fontFamily: "Almarai_800ExtraBold" },
  inlineRow:        { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  mutedText:        { flex: 1, color: "#8A6030", textAlign: "right", fontSize: 12, fontFamily: "Almarai_400Regular" },
  itemRow:          { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.07)", gap: 12 },
  itemRowLast:      { borderBottomWidth: 0 },
  itemInfo:         { flex: 1 },
  itemName:         { color: "#FDF0DC", textAlign: "right", fontSize: 14, lineHeight: 22, fontFamily: "Almarai_800ExtraBold" },
  itemQty:          { color: "#8A6030", textAlign: "right", fontSize: 11, marginTop: 4, fontFamily: "Almarai_400Regular" },
  itemPrice:        { color: "#F2B233", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  emptyMiniText:    { color: "#8A6030", textAlign: "right", fontSize: 12, fontFamily: "Almarai_400Regular" },
  paymentRow:       { flexDirection: "row-reverse", alignItems: "center", gap: 11, backgroundColor: "#17100B", borderRadius: 18, padding: 13, borderWidth: 1, borderColor: "rgba(242,178,51,0.1)" },
  paymentIconBox:   { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,178,51,0.08)" },
  paymentInfo:      { flex: 1 },
  paymentTitle:     { color: "#FDF0DC", textAlign: "right", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  paymentStatus:    { textAlign: "right", fontSize: 11, marginTop: 4, fontFamily: "Almarai_700Bold" },
  summaryRow:       { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel:     { color: "#8A6030", fontSize: 13, fontFamily: "Almarai_400Regular" },
  summaryValue:     { color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_700Bold" },
  summaryDivider:   { height: 1, backgroundColor: "rgba(242,178,51,0.12)", marginVertical: 4 },
  totalLabel:       { color: "#FDF0DC", fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  totalValue:       { color: "#F2B233", fontSize: 20, fontFamily: "Almarai_800ExtraBold" },
  addressText:      { color: "#A98961", textAlign: "right", fontSize: 13, lineHeight: 23, fontFamily: "Almarai_400Regular" },
  cancelText:       { color: "#FFCECE", textAlign: "right", fontSize: 13, lineHeight: 23, fontFamily: "Almarai_400Regular" },
  reviewBtn:        { minHeight: 56, borderRadius: 20, backgroundColor: "#F2B233", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  reviewBtnText:    { color: "#17100B", fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  emptyWrap:        { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyIcon:        { width: 116, height: 116, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#21160D", borderWidth: 1, borderColor: "rgba(229,57,53,0.18)", marginBottom: 22 },
  emptyTitle:       { color: "#FDF0DC", fontSize: 20, textAlign: "center", fontFamily: "Almarai_800ExtraBold" },
  emptyText:        { color: "#A98961", textAlign: "center", fontSize: 13, lineHeight: 23, marginTop: 8, marginBottom: 20, fontFamily: "Almarai_400Regular" },
  primaryBtn:       { minWidth: 180, borderRadius: 17, backgroundColor: "#F2B233", paddingHorizontal: 22, paddingVertical: 13, alignItems: "center" },
  primaryBtnText:   { color: "#17100B", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
});