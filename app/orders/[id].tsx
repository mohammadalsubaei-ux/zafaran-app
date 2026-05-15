import { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:       { label: "بانتظار القبول",        color: "#F0A500", emoji: "⏳" },
  accepted:      { label: "تم القبول",              color: "#2196F3", emoji: "✅" },
  preparing:     { label: "قيد التحضير",            color: "#FF6600", emoji: "🔥" },
  ready:         { label: "جاهز للاستلام/التوصيل", color: "#9C27B0", emoji: "🎁" },
  delivering:    { label: "في الطريق",              color: "#03A9F4", emoji: "🚗" },
  delivered:     { label: "تم التسليم",             color: "#4CAF50", emoji: "✅" },
  cancelled:     { label: "ملغي",                   color: "#E53935", emoji: "❌" },
  pending_time:  { label: "بانتظار تأكيد الوقت",   color: "#FF9800", emoji: "📅" },
  time_confirmed:{ label: "تم تأكيد الوقت",        color: "#8BC34A", emoji: "📅" },
};

const TRACK_STEPS = [
  { key: "pending",    label: "استلام الطلب", emoji: "📥" },
  { key: "accepted",   label: "تم القبول",    emoji: "✅" },
  { key: "preparing",  label: "قيد التحضير",  emoji: "🔥" },
  { key: "ready",      label: "جاهز",         emoji: "🎁" },
  { key: "delivering", label: "في الطريق",    emoji: "🚗" },
  { key: "delivered",  label: "تم التسليم",   emoji: "🏠" },
];

const TRACK_INDEX: any = {
  pending: 0, pending_time: 0, time_confirmed: 1,
  accepted: 1, preparing: 2, ready: 3, delivering: 4, delivered: 5,
};

export default function OrderDetailScreen() {
  const { id }            = useLocalSearchParams();
  const orderId           = Array.isArray(id) ? id[0] : id;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${API}/api/orders/${orderId}`);
        const json = await res.json();
        if (json.success) setOrder(json.data);
        else setOrder(null);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) loadOrder();
  }, [orderId]);

  if (!fontsLoaded || loading) return (
    <View style={s.loadingWrap}>
      <ActivityIndicator color="#F0A500" size="large" />
    </View>
  );

  if (!order) return (
    <SafeAreaView style={s.safe}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>→ رجوع</Text>
      </TouchableOpacity>
      <View style={s.emptyWrap}>
        <Text style={s.emptyEmoji}>❌</Text>
        <Text style={s.empty}>الطلب غير موجود</Text>
      </View>
    </SafeAreaView>
  );

  const st          = STATUS[order.status] || STATUS.pending;
  const currentStep = TRACK_INDEX[order.status] ?? 0;
  const isMale      = order.chefs?.users?.gender === "male";
  const orderItems  = order.order_items || order.items || [];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>تفاصيل الطلب</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* رقم الطلب والحالة */}
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.orderId}>#{order.id.slice(0, 8)}</Text>
            <View style={[s.badge, { backgroundColor: st.color + "22" }]}>
              <Text style={[s.badgeText, { color: st.color }]}>{st.emoji} {st.label}</Text>
            </View>
          </View>
          <Text style={s.date}>
            {new Date(order.created_at).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </Text>
        </View>

        {/* تتبع الطلب */}
        {order.status !== "cancelled" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>تتبع الطلب 📍</Text>
            {TRACK_STEPS.map((step, idx) => {
              const done    = idx <= currentStep;
              const current = idx === currentStep;
              return (
                <View key={step.key} style={s.trackRow}>
                  <View style={[s.trackDot, done && s.trackDotDone, current && s.trackDotCurrent]}>
                    <Text style={s.trackDotEmoji}>{done ? step.emoji : "○"}</Text>
                  </View>
                  <View style={s.trackInfo}>
                    <Text style={[s.trackLabel, done && { color: "#FDF0DC" }, current && { color: "#F0A500" }]}>
                      {step.label}
                    </Text>
                  </View>
                  {idx < TRACK_STEPS.length - 1 && (
                    <View style={[s.trackLine, idx < currentStep && s.trackLineDone]} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* سبب الإلغاء */}
        {order.status === "cancelled" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>سبب الإلغاء ❌</Text>
            <Text style={s.address}>{order.cancel_reason || "تم إلغاء الطلب"}</Text>
          </View>
        )}

        {/* الشيف */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{isMale ? "الشيف 👨‍🍳" : "الشيفة 👩‍🍳"}</Text>
          <Text style={s.chefName}>{isMale ? "👨‍🍳" : "👩‍🍳"} {order.chefs?.users?.full_name || "الشيف"}</Text>
          <Text style={s.chefCity}>
            📍 {order.chefs?.city || ""}{order.chefs?.neighborhood ? ` · ${order.chefs.neighborhood}` : ""}
          </Text>
        </View>

        {/* الوجبات */}
        <View style={s.card}>
          <Text style={s.cardTitle}>الوجبات 🍽️</Text>
          {orderItems.map((oi: any) => (
            <View key={oi.id} style={s.itemRow}>
              <Text style={s.itemName}>{oi.name}</Text>
              <View style={s.itemRight}>
                <Text style={s.itemQty}>× {oi.quantity || 1}</Text>
                <Text style={s.itemPrice}>
                  {oi.subtotal || ((oi.price || 0) * (oi.quantity || 1))} ريال
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ملخص المبالغ */}
        <View style={s.card}>
          <Text style={s.cardTitle}>ملخص المبالغ 💰</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>الوجبات</Text>
            <Text style={s.summaryVal}>{order.subtotal || 0} ريال</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>التوصيل</Text>
            <Text style={s.summaryVal}>{order.delivery_fee || 0} ريال</Text>
          </View>
          {(order.distance_km || 0) > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>المسافة</Text>
              <Text style={s.summaryVal}>{order.distance_km} كم</Text>
            </View>
          )}
          <View style={[s.summaryRow, s.totalRow]}>
            <Text style={s.totalLabel}>المجموع</Text>
            <Text style={s.totalVal}>{order.total || 0} ريال</Text>
          </View>
        </View>

        {/* عنوان التوصيل */}
        {order.delivery_address && (
          <View style={s.card}>
            <Text style={s.cardTitle}>عنوان التوصيل 📍</Text>
            <Text style={s.address}>{order.delivery_address}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: "#0E0700" },
  loadingWrap:     { flex: 1, backgroundColor: "#0E0700", alignItems: "center", justifyContent: "center" },
  header:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:           { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  backBtn:         { padding: 16 },
  backText:        { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  card:            { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  cardTitle:       { fontSize: 14, fontWeight: "800", color: "#FDF0DC", textAlign: "right", marginBottom: 12, fontFamily: "Almarai_700Bold", borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.08)", paddingBottom: 8 },
  row:             { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  orderId:         { fontSize: 15, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  badge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:       { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  date:            { fontSize: 12, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  trackRow:        { flexDirection: "row-reverse", alignItems: "flex-start", marginBottom: 16, position: "relative" },
  trackDot:        { width: 36, height: 36, borderRadius: 18, backgroundColor: "#251400", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  trackDotDone:    { backgroundColor: "rgba(240,165,0,0.15)", borderColor: "rgba(240,165,0,0.4)" },
  trackDotCurrent: { backgroundColor: "rgba(240,165,0,0.2)", borderColor: "#F0A500", borderWidth: 2 },
  trackDotEmoji:   { fontSize: 16 },
  trackInfo:       { flex: 1, paddingRight: 10, justifyContent: "center", minHeight: 36 },
  trackLabel:      { fontSize: 13, color: "#5A3A18", textAlign: "right", fontFamily: "Almarai_700Bold" },
  trackLine:       { position: "absolute", right: 17, top: 36, width: 2, height: 16, backgroundColor: "rgba(240,165,0,0.15)" },
  trackLineDone:   { backgroundColor: "#F0A500" },
  chefName:        { fontSize: 15, fontWeight: "800", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold", marginBottom: 4 },
  chefCity:        { fontSize: 12, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  itemRow:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.06)" },
  itemName:        { fontSize: 14, color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold", flex: 1 },
  itemRight:       { flexDirection: "row", gap: 12, alignItems: "center" },
  itemQty:         { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  itemPrice:       { fontSize: 13, color: "#F0A500", fontWeight: "700", fontFamily: "Almarai_700Bold" },
  summaryRow:      { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel:    { fontSize: 13, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  summaryVal:      { fontSize: 13, color: "#FDF0DC", fontWeight: "700", fontFamily: "Almarai_700Bold" },
  totalRow:        { borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.12)", paddingTop: 10, marginTop: 4 },
  totalLabel:      { fontSize: 15, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  totalVal:        { fontSize: 18, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  address:         { fontSize: 13, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  emptyWrap:       { alignItems: "center", marginTop: 60 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  empty:           { color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
});
