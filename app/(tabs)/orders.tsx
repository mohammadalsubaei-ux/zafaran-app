import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const TRACK_STEPS = ["pending", "accepted", "preparing", "ready", "delivering", "delivered"];
const TRACK_INDEX: any = {
  pending: 0, pending_time: 0, time_confirmed: 1,
  accepted: 1, preparing: 2, ready: 3, delivering: 4, delivered: 5,
};

export default function OrdersScreen() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"active" | "history">("active");
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const load = async () => {
    setLoading(true);
    const u = await AsyncStorage.getItem("user");
    if (!u) {
      setLoading(false);
      router.replace("/login");
      return;
    }
    const userData = JSON.parse(u);
    try {
      const res  = await fetch(`${API}/api/orders/customer/${userData.id}`);
      const j    = await res.json();
      if (j.success) setOrders(j.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeOrders  = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const historyOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));
  const displayOrders = tab === "active" ? activeOrders : historyOrders;

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>طلباتي 📦</Text>
        <TouchableOpacity onPress={load}>
          <Text style={s.refresh}>تحديث</Text>
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

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={displayOrders}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const st     = STATUS[item.status] || STATUS.pending;
              const isMale = item.chefs?.users?.gender === "male";
              const orderItems = item.order_items || item.items || [];
              const currentStep = TRACK_INDEX[item.status] ?? 0;

              return (
                <TouchableOpacity style={s.card} onPress={() => router.push(`/orders/${item.id}`)}>
                  <View style={s.cardHeader}>
                    <Text style={s.orderId}>#{item.id.slice(0, 8)}</Text>
                    <View style={[s.badge, { backgroundColor: st.color + "22" }]}>
                      <Text style={[s.badgeText, { color: st.color }]}>
                        {st.emoji} {st.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.chefName}>
                    {isMale ? "👨‍🍳" : "👩‍🍳"} {item.chefs?.users?.full_name}
                  </Text>

                  {orderItems.slice(0, 2).map((oi: any) => (
                    <Text key={oi.id} style={s.orderItem}>• {oi.name} × {oi.quantity}</Text>
                  ))}
                  {orderItems.length > 2 && (
                    <Text style={s.moreItems}>+{orderItems.length - 2} وجبات أخرى</Text>
                  )}

                  <View style={s.cardFooter}>
                    <Text style={s.total}>💰 {item.total} ريال</Text>
                    <Text style={s.date}>{new Date(item.created_at).toLocaleDateString("ar-SA")}</Text>
                  </View>

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
                <Text style={s.emptyEmoji}>{tab === "active" ? "📦" : "📋"}</Text>
                <Text style={s.empty}>
                  {tab === "active" ? "ما عندك طلبات نشطة" : "ما عندك سجل بعد"}
                </Text>
                {tab === "active" && (
                  <TouchableOpacity style={s.orderBtn} onPress={() => router.push("/(tabs)")}>
                    <Text style={s.orderBtnText}>اطلب الحين 🍲</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#0E0700" },
  header:        { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:         { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  refresh:       { color: "#F0A500", fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  tabRow:        { flexDirection: "row-reverse", padding: 12, gap: 8 },
  tabBtn:        { flex: 1, backgroundColor: "#1C1000", borderRadius: 12, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  tabBtnActive:  { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  tabText:       { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_700Bold" },
  tabTextActive: { color: "#F0A500" },
  card:          { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  cardHeader:    { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderId:       { fontSize: 13, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:     { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  chefName:      { fontSize: 13, color: "#C97D20", textAlign: "right", marginBottom: 8, fontFamily: "Almarai_700Bold" },
  orderItem:     { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_400Regular" },
  moreItems:     { fontSize: 11, color: "#5A3A18", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_400Regular" },
  cardFooter:    { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  total:         { fontSize: 15, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  date:          { fontSize: 11, color: "#5A3A18", fontFamily: "Almarai_400Regular" },
  trackBar:      { flexDirection: "row-reverse", gap: 4, marginTop: 12 },
  trackStep:     { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(240,165,0,0.15)" },
  trackStepDone: { backgroundColor: "#F0A500" },
  emptyWrap:     { alignItems: "center", marginTop: 60 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  empty:         { textAlign: "center", color: "#8A6030", fontSize: 14, marginBottom: 20, fontFamily: "Almarai_400Regular" },
  orderBtn:      { backgroundColor: "#F0A500", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  orderBtnText:  { color: "#1C0F00", fontWeight: "900", fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
});
