import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";
import { RefreshCw, Package, ClipboardList, ShoppingBag, CalendarDays, CheckCircle2, X } from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:        { label: "بانتظار القبول",         color: "#F0A500" },
  accepted:       { label: "تم القبول",               color: "#2196F3" },
  preparing:      { label: "قيد التحضير",             color: "#FF6600" },
  ready:          { label: "جاهز للاستلام",           color: "#9C27B0" },
  delivering:     { label: "في الطريق",               color: "#03A9F4" },
  delivered:      { label: "تم التسليم",              color: "#4CAF50" },
  cancelled:      { label: "ملغي",                    color: "#E53935" },
  pending_time:   { label: "بانتظار تأكيد الوقت",    color: "#FF9800" },
  time_confirmed: { label: "تم تأكيد الوقت",         color: "#8BC34A" },
};

const TRACK_STEPS = ["pending", "accepted", "preparing", "ready", "delivering", "delivered"];
const TRACK_INDEX: any = {
  pending: 0, pending_time: 0, time_confirmed: 1,
  accepted: 1, preparing: 2, ready: 3, delivering: 4, delivered: 5,
};

function formatArabicDateTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ar-SA", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function OrdersScreen() {
  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]           = useState<"active" | "history">("active");
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const u = await AsyncStorage.getItem("user");
    if (!u) { setLoading(false); router.replace("/login"); return; }
    const userData = JSON.parse(u);
    try {
      const res = await fetch(`${API}/api/orders/customer/${userData.id}`);
      const j   = await res.json();
      if (j.success) setOrders(j.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
  }, [load]);

  // العميل يوافق على الوقت البديل المقترح من الشيف
  const acceptProposedTime = useCallback(async (orderId: string) => {
    try {
      const res  = await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "time_confirmed" }),
      });
      const json = await res.json();
      if (json.success) { Alert.alert("تم", "وافقت على الوقت المقترح"); load(true); }
      else Alert.alert("خطأ", json.message || "تعذر التحديث");
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالخادم"); }
  }, [load]);

  // العميل يرفض الوقت البديل ويلغي الطلب
  const rejectProposedTime = useCallback(async (orderId: string) => {
    Alert.alert("رفض الوقت البديل", "سيتم إلغاء الطلب بدون رسوم. تأكد؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم، إلغاء الطلب", style: "destructive", onPress: async () => {
        try {
          const res  = await fetch(`${API}/api/orders/${orderId}/status`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
          });
          const json = await res.json();
          if (json.success) { Alert.alert("تم إلغاء الطلب"); load(true); }
        } catch { Alert.alert("خطأ", "تعذر الإلغاء"); }
      }},
    ]);
  }, [load]);

  const activeOrders  = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const historyOrders = orders.filter(o => ["delivered",  "cancelled"].includes(o.status));
  const displayOrders = tab === "active" ? activeOrders : historyOrders;

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>طلباتي</Text>
        <TouchableOpacity onPress={() => load(true)} style={s.refreshBtn}>
          <RefreshCw size={18} color="#F0A500" />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === "active" && s.tabBtnActive]} onPress={() => setTab("active")}>
          <Text style={[s.tabText, tab === "active" && s.tabTextActive]}>النشطة ({activeOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === "history" && s.tabBtnActive]} onPress={() => setTab("history")}>
          <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>السجل ({historyOrders.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F0A500" />}
          renderItem={({ item }) => {
            const st          = STATUS[item.status] || STATUS.pending;
            const orderItems  = item.order_items || item.items || [];
            const currentStep = TRACK_INDEX[item.status] ?? 0;
            const isPreorder  = item.order_type === "preorder";

            // هل الشيف اقترح وقت بديل (confirmed_time مختلف عن requested_time)
            const hasProposedTime = isPreorder
              && item.confirmed_time
              && item.status === "pending_time"
              && item.confirmed_time !== item.requested_time;

            return (
              <TouchableOpacity
                style={[s.card, isPreorder && s.cardPreorder]}
                onPress={() => router.push(`/order/${item.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={s.cardHeader}>
                  <Text style={s.orderId}>#{item.id.slice(0, 8)}</Text>
                  <View style={s.badgesRow}>
                    {isPreorder && (
                      <View style={s.preorderTag}>
                        <CalendarDays size={10} color="#FF9800" strokeWidth={1.8} />
                        <Text style={s.preorderTagText}>حجز مسبق</Text>
                      </View>
                    )}
                    <View style={[s.badge, { backgroundColor: st.color + "22" }]}>
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>

                <Text style={s.chefName}>{item.chefs?.users?.full_name}</Text>

                {orderItems.slice(0, 2).map((oi: any) => (
                  <Text key={oi.id} style={s.orderItem}>• {oi.name} x {oi.quantity}</Text>
                ))}
                {orderItems.length > 2 && (
                  <Text style={s.moreItems}>+{orderItems.length - 2} وجبات اخرى</Text>
                )}

                {/* وقت الحجز المطلوب */}
                {isPreorder && item.requested_time && (
                  <View style={s.timeBox}>
                    <CalendarDays size={13} color="#FF9800" strokeWidth={1.8} />
                    <Text style={s.timeBoxText}>
                      الوقت المطلوب: {formatArabicDateTime(item.requested_time)}
                    </Text>
                  </View>
                )}

                {/* وقت بديل مقترح من الشيف */}
                {hasProposedTime && (
                  <View style={s.proposedTimeBox}>
                    <CalendarDays size={13} color="#8BC34A" strokeWidth={1.8} />
                    <Text style={s.proposedTimeText}>
                      الشيف اقترح: {formatArabicDateTime(item.confirmed_time)}
                    </Text>
                  </View>
                )}

                {/* وقت مؤكد */}
                {item.status === "time_confirmed" && item.confirmed_time && (
                  <View style={s.confirmedTimeBox}>
                    <CheckCircle2 size={13} color="#8BC34A" strokeWidth={1.8} />
                    <Text style={s.confirmedTimeText}>
                      الوقت المؤكد: {formatArabicDateTime(item.confirmed_time)}
                    </Text>
                  </View>
                )}

                <View style={s.cardFooter}>
                  <Text style={s.total}>{item.total} ريال</Text>
                  <Text style={s.date}>
                    {new Date(item.created_at).toLocaleDateString("ar-SA")}
                    {" · "}
                    {new Date(item.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>

                {/* أزرار الموافقة/الرفض على الوقت البديل */}
                {hasProposedTime && (
                  <View style={s.actionBtns}>
                    <TouchableOpacity
                      style={s.acceptBtn}
                      onPress={e => { e.stopPropagation?.(); acceptProposedTime(item.id); }}
                      activeOpacity={0.9}
                    >
                      <View style={s.btnInner}>
                        <CheckCircle2 size={14} color="#1C0F00" strokeWidth={2} />
                        <Text style={s.acceptBtnText}>موافق على الوقت</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={e => { e.stopPropagation?.(); rejectProposedTime(item.id); }}
                      activeOpacity={0.9}
                    >
                      <View style={s.btnInner}>
                        <X size={14} color="#E53935" strokeWidth={2} />
                        <Text style={s.rejectBtnText}>رفض</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {!["delivered", "cancelled"].includes(item.status) && (
                  <View style={s.trackBar}>
                    {TRACK_STEPS.map((_, idx) => (
                      <View key={idx} style={[s.trackStep, idx <= currentStep && s.trackStepDone]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              {tab === "active" ? <Package size={52} color="#5A3A18" /> : <ClipboardList size={52} color="#5A3A18" />}
              <Text style={s.empty}>{tab === "active" ? "ما عندك طلبات نشطة" : "ما عندك سجل بعد"}</Text>
              {tab === "active" && (
                <TouchableOpacity style={s.orderBtn} onPress={() => router.push("/(tabs)" as any)}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                    <ShoppingBag size={16} color="#1C0F00" />
                    <Text style={s.orderBtnText}>اطلب الحين</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#0E0700" },
  header:            { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:             { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  refreshBtn:        { padding: 4 },
  tabRow:            { flexDirection: "row-reverse", padding: 12, gap: 8 },
  tabBtn:            { flex: 1, backgroundColor: "#1C1000", borderRadius: 12, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  tabBtnActive:      { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  tabText:           { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_700Bold" },
  tabTextActive:     { color: "#F0A500" },
  card:              { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  cardPreorder:      { borderColor: "rgba(255,152,0,0.3)", backgroundColor: "#1A1200" },
  cardHeader:        { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  badgesRow:         { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  preorderTag:       { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: "rgba(255,152,0,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  preorderTagText:   { color: "#FF9800", fontSize: 10, fontFamily: "Almarai_700Bold" },
  orderId:           { fontSize: 13, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  badge:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:         { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  chefName:          { fontSize: 13, color: "#C97D20", textAlign: "right", marginBottom: 8, fontFamily: "Almarai_700Bold" },
  orderItem:         { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_400Regular" },
  moreItems:         { fontSize: 11, color: "#5A3A18", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_400Regular" },
  timeBox:           { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(255,152,0,0.08)", padding: 8, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: "rgba(255,152,0,0.18)" },
  timeBoxText:       { flex: 1, color: "#FF9800", textAlign: "right", fontSize: 11, fontFamily: "Almarai_700Bold" },
  proposedTimeBox:   { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(139,195,74,0.08)", padding: 8, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: "rgba(139,195,74,0.25)" },
  proposedTimeText:  { flex: 1, color: "#8BC34A", textAlign: "right", fontSize: 11, fontFamily: "Almarai_700Bold" },
  confirmedTimeBox:  { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(139,195,74,0.08)", padding: 8, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: "rgba(139,195,74,0.2)" },
  confirmedTimeText: { flex: 1, color: "#8BC34A", textAlign: "right", fontSize: 11, fontFamily: "Almarai_700Bold" },
  cardFooter:        { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  total:             { fontSize: 15, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  date:              { fontSize: 11, color: "#5A3A18", fontFamily: "Almarai_400Regular" },
  actionBtns:        { flexDirection: "row-reverse", gap: 8, marginTop: 10 },
  btnInner:          { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  acceptBtn:         { flex: 1, backgroundColor: "#F0A500", borderRadius: 12, padding: 11, alignItems: "center" },
  acceptBtnText:     { color: "#1C0F00", fontSize: 12, fontWeight: "900", fontFamily: "Almarai_700Bold" },
  rejectBtn:         { flex: 1, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 12, padding: 11, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  rejectBtnText:     { color: "#E53935", fontSize: 12, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  trackBar:          { flexDirection: "row-reverse", gap: 4, marginTop: 12 },
  trackStep:         { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(240,165,0,0.15)" },
  trackStepDone:     { backgroundColor: "#F0A500" },
  emptyWrap:         { alignItems: "center", marginTop: 60, gap: 16 },
  empty:             { textAlign: "center", color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
  orderBtn:          { backgroundColor: "#F0A500", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  orderBtnText:      { color: "#1C0F00", fontWeight: "900", fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
});