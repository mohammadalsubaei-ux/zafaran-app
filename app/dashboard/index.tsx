import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, Modal
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:       { label: "بانتظار القبول", color: "#F0A500" },
  pending_time:  { label: "بانتظار تأكيد الوقت", color: "#FF9800" },
  time_confirmed:{ label: "تم تأكيد الوقت", color: "#8BC34A" },
  accepted:      { label: "تم القبول",      color: "#2196F3" },
  preparing:     { label: "قيد التحضير 🔥", color: "#FF6600" },
  ready:         { label: "جاهز للتوصيل",  color: "#9C27B0" },
  delivering:    { label: "في الطريق 🚗",  color: "#03A9F4" },
  delivered:     { label: "تم التسليم ✅", color: "#4CAF50" },
  cancelled:     { label: "ملغي ❌",       color: "#E53935" },
};

const CHEF_STATUS = [
  { id: "open",         label: "مفتوح",         desc: "يستقبل طلبات فورية",          color: "#4CAF50" },
  { id: "preorder_only",label: "حجز مسبق فقط",  desc: "للبوفيهات والمطابخ الكبيرة", color: "#F0A500" },
  { id: "unavailable",  label: "غير متاح",       desc: "يختفي من القائمة كلياً",     color: "#E53935" },
];

export default function DashboardScreen() {
  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [chefId, setChefId]       = useState<string | null>(null);
  const [chef, setChef]           = useState<any>(null);
  const [chefStatus, setChefStatus] = useState("open");
  const [showStatus, setShowStatus] = useState(false);
  const [tab, setTab]             = useState<"active" | "history">("active");
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useEffect(() => {
    AsyncStorage.getItem("user").then(async u => {
      if (!u) return;
      const user = JSON.parse(u);
      const res  = await fetch(`${API}/api/chefs?user_id=${user.id}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setChefId(json.data[0].id);
        setChef(json.data[0]);
        setChefStatus(json.data[0].status || "open");
      }
    });
  }, []);

  useEffect(() => { if (chefId) load(); }, [chefId]);

  const load = () => {
    if (!chefId) return;
    setLoading(true);
    fetch(`${API}/api/orders/chef/${chefId}`)
      .then(r => r.json())
      .then(j => { if (j.success) setOrders(j.data); })
      .finally(() => setLoading(false));
  };

  const changeStatus = async (newStatus: string) => {
    if (!chefId) return;
    const res  = await fetch(`${API}/api/chefs/${chefId}/toggle`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        status:  newStatus,
        is_open: newStatus === "open",
      }),
    });
    const json = await res.json();
    if (json.success) {
      setChefStatus(newStatus);
      setShowStatus(false);
      Alert.alert("✅ تم التحديث", `حالتك الآن: ${CHEF_STATUS.find(s => s.id === newStatus)?.label}`);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    const res  = await fetch(`${API}/api/orders/${orderId}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.success) { Alert.alert("✅ تم التحديث"); load(); }
  };

  const activeOrders  = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const historyOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));
  const displayOrders = tab === "active" ? activeOrders : historyOrders;

  const currentStatus = CHEF_STATUS.find(s => s.id === chefStatus) || CHEF_STATUS[0];

  const getActions = (status: string, id: string) => {
    if (status === "pending") return (
      <View style={s.btns}>
        <TouchableOpacity style={s.btnAcc} onPress={() => Alert.alert("قبول الطلب", "تبي تقبل؟", [
          { text: "لا", style: "cancel" },
          { text: "نعم", onPress: () => updateStatus(id, "accepted") }
        ])}>
          <Text style={s.btnText}>✅ قبول</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnRej} onPress={() => Alert.alert("رفض الطلب", "تبي ترفض؟", [
          { text: "لا", style: "cancel" },
          { text: "نعم", style: "destructive", onPress: () => updateStatus(id, "cancelled") }
        ])}>
          <Text style={s.btnTextRej}>❌ رفض</Text>
        </TouchableOpacity>
      </View>
    );
    if (status === "accepted") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "preparing")}>
        <Text style={s.btnText}>🔥 بدأ التحضير</Text>
      </TouchableOpacity>
    );
    if (status === "preparing") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "ready")}>
        <Text style={s.btnText}>✅ الطلب جاهز — أبلغ المندوب</Text>
      </TouchableOpacity>
    );
    return null;
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>

      {/* الهيدر */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>لوحة الشيف 👨‍🍳</Text>
        <TouchableOpacity onPress={load}>
          <Text style={s.refresh}>تحديث</Text>
        </TouchableOpacity>
      </View>

      {/* حالة المطبخ */}
      <TouchableOpacity
        style={[s.statusBar, { borderColor: currentStatus.color + "44" }]}
        onPress={() => setShowStatus(true)}
      >
        <View>
          <Text style={s.statusTitle}>حالة مطبخي</Text>
          <Text style={[s.statusVal, { color: currentStatus.color }]}>
            ● {currentStatus.label}
          </Text>
          <Text style={s.statusDesc}>{currentStatus.desc}</Text>
        </View>
        <Text style={[s.statusChange, { color: currentStatus.color }]}>تغيير ▾</Text>
      </TouchableOpacity>

      {/* إحصائيات */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{activeOrders.length}</Text>
          <Text style={s.statLabel}>نشطة</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{historyOrders.filter(o => o.status === "delivered").length}</Text>
          <Text style={s.statLabel}>مكتملة</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{chef?.rating_avg || "—"}</Text>
          <Text style={s.statLabel}>التقييم ⭐</Text>
        </View>
      </View>

      {/* التابات */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === "active" && s.tabBtnActive]} onPress={() => setTab("active")}>
          <Text style={[s.tabText, tab === "active" && s.tabTextActive]}>النشطة ({activeOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === "history" && s.tabBtnActive]} onPress={() => setTab("history")}>
          <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>السجل ({historyOrders.length})</Text>
        </TouchableOpacity>
      </View>

      {/* الطلبات */}
      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={displayOrders}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={s.row}>
                  <Text style={s.orderId}>#{item.id.slice(0, 8)}</Text>
                  <View style={[s.badge, { backgroundColor: STATUS[item.status]?.color + "22" }]}>
                    <Text style={[s.badgeText, { color: STATUS[item.status]?.color }]}>
                      {STATUS[item.status]?.label}
                    </Text>
                  </View>
                </View>
                <Text style={s.customer}>👤 {item.users?.full_name}</Text>
                <Text style={s.phone}>📞 {item.users?.phone}</Text>
                <Text style={s.address}>📍 {item.delivery_address}</Text>
                {item.order_items?.map((oi: any) => (
                  <Text key={oi.id} style={s.orderItem}>• {oi.name} × {oi.quantity} — {oi.subtotal} ريال</Text>
                ))}
                <View style={s.totalRow}>
                  <Text style={s.total}>💰 {item.total} ريال</Text>
                  <Text style={s.delivery}>توصيل: {item.delivery_fee} ريال</Text>
                </View>
                {item.notes ? <Text style={s.notes}>📝 {item.notes}</Text> : null}
                {getActions(item.status, item.id)}
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>{tab === "active" ? "📦" : "📋"}</Text>
                <Text style={s.empty}>{tab === "active" ? "ما في طلبات نشطة" : "ما في سجل بعد"}</Text>
              </View>
            }
          />
      }

      {/* Modal تغيير الحالة */}
      <Modal visible={showStatus} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>اختر حالة مطبخك</Text>
            {CHEF_STATUS.map(st => (
              <TouchableOpacity
                key={st.id}
                style={[s.statusOption, chefStatus === st.id && { borderColor: st.color, backgroundColor: st.color + "11" }]}
                onPress={() => changeStatus(st.id)}
              >
                <View>
                  <Text style={[s.statusOptionLabel, { color: st.color }]}>● {st.label}</Text>
                  <Text style={s.statusOptionDesc}>{st.desc}</Text>
                </View>
                {chefStatus === st.id && <Text style={{ color: st.color, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalClose} onPress={() => setShowStatus(false)}>
              <Text style={s.modalCloseText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#0E0700" },
  header:            { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:             { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:              { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  refresh:           { color: "#F0A500", fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  statusBar:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", margin: 16, backgroundColor: "#1C1000", borderRadius: 16, padding: 16, borderWidth: 1 },
  statusTitle:       { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginBottom: 4 },
  statusVal:         { fontSize: 15, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold" },
  statusDesc:        { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginTop: 2 },
  statusChange:      { fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  statsRow:          { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard:          { flex: 1, backgroundColor: "#1C1000", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  statNum:           { fontSize: 22, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  statLabel:         { fontSize: 10, color: "#8A6030", fontFamily: "Almarai_400Regular", marginTop: 2 },
  tabRow:            { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn:            { flex: 1, backgroundColor: "#1C1000", borderRadius: 12, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  tabBtnActive:      { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  tabText:           { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_700Bold" },
  tabTextActive:     { color: "#F0A500" },
  card:              { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  row:               { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderId:           { fontSize: 13, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  badge:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:         { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  customer:          { fontSize: 14, color: "#FDF0DC", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_700Bold" },
  phone:             { fontSize: 12, color: "#F0A500", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_400Regular" },
  address:           { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 8, fontFamily: "Almarai_400Regular" },
  orderItem:         { fontSize: 12, color: "#C97D20", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_400Regular" },
  totalRow:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 },
  total:             { fontSize: 16, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  delivery:          { fontSize: 11, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  notes:             { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 10, fontFamily: "Almarai_400Regular" },
  btns:              { flexDirection: "row-reverse", gap: 8, marginTop: 8 },
  btnAcc:            { flex: 1, backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)", marginTop: 8 },
  btnRej:            { flex: 1, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)", marginTop: 8 },
  btnText:           { color: "#F0A500", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  btnTextRej:        { color: "#E53935", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  emptyWrap:         { alignItems: "center", marginTop: 60 },
  emptyEmoji:        { fontSize: 48, marginBottom: 12 },
  empty:             { textAlign: "center", color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:          { backgroundColor: "#1C1000", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  modalTitle:        { fontSize: 18, fontWeight: "900", color: "#FDF0DC", textAlign: "right", marginBottom: 16, fontFamily: "Almarai_800ExtraBold" },
  statusOption:      { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)", backgroundColor: "#251400" },
  statusOptionLabel: { fontSize: 15, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold", marginBottom: 4 },
  statusOptionDesc:  { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  modalClose:        { backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  modalCloseText:    { color: "#E53935", fontSize: 14, fontWeight: "700", fontFamily: "Almarai_700Bold" },
});
