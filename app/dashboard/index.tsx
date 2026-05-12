import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, Switch
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:    { label: "ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظ‚ط¨ظˆظ„", color: "#F0A500" },
  accepted:   { label: "طھظ… ط§ظ„ظ‚ط¨ظˆظ„",      color: "#2196F3" },
  preparing:  { label: "ظ‚ظٹط¯ ط§ظ„طھط­ط¶ظٹط± ًں”¥", color: "#FF6600" },
  ready:      { label: "ط¬ط§ظ‡ط² ظ„ظ„طھظˆطµظٹظ„",   color: "#9C27B0" },
  delivering: { label: "ظپظٹ ط§ظ„ط·ط±ظٹظ‚ ًںڑ—",   color: "#03A9F4" },
  delivered:  { label: "طھظ… ط§ظ„طھط³ظ„ظٹظ… âœ…",  color: "#4CAF50" },
  cancelled:  { label: "ظ…ظ„ط؛ظٹ â‌Œ",        color: "#E53935" },
};

export default function DashboardScreen() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chefId, setChefId]   = useState<string | null>(null);
  const [chef, setChef]       = useState<any>(null);
  const [isOpen, setIsOpen]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [tab, setTab]         = useState<"active" | "history">("active");
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
        setIsOpen(json.data[0].is_open);
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

  const toggleOpen = async () => {
    if (!chefId) return;
    setToggling(true);
    try {
      const res  = await fetch(`${API}/api/chefs/${chefId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_open: !isOpen }),
      });
      const json = await res.json();
      if (json.success) setIsOpen(!isOpen);
    } finally { setToggling(false); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    const res  = await fetch(`${API}/api/orders/${orderId}/status`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.success) { Alert.alert("âœ… طھظ… ط§ظ„طھط­ط¯ظٹط«"); load(); }
  };

  const activeOrders  = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const historyOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));
  const displayOrders = tab === "active" ? activeOrders : historyOrders;

  const getActions = (status: string, id: string) => {
    if (status === "pending") return (
      <View style={s.btns}>
        <TouchableOpacity style={s.btnAcc} onPress={() => {
          Alert.alert("ظ‚ط¨ظˆظ„ ط§ظ„ط·ظ„ط¨", "طھط¨ظٹ طھظ‚ط¨ظ„ ظ‡ط°ط§ ط§ظ„ط·ظ„ط¨طں", [
            { text: "ظ„ط§", style: "cancel" },
            { text: "ظ†ط¹ظ…", onPress: () => updateStatus(id, "accepted") }
          ]);
        }}>
          <Text style={s.btnText}>âœ… ظ‚ط¨ظˆظ„</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnRej} onPress={() => {
          Alert.alert("ط±ظپط¶ ط§ظ„ط·ظ„ط¨", "طھط¨ظٹ طھط±ظپط¶ ظ‡ط°ط§ ط§ظ„ط·ظ„ط¨طں", [
            { text: "ظ„ط§", style: "cancel" },
            { text: "ظ†ط¹ظ…", style: "destructive", onPress: () => updateStatus(id, "cancelled") }
          ]);
        }}>
          <Text style={s.btnTextRej}>â‌Œ ط±ظپط¶</Text>
        </TouchableOpacity>
      </View>
    );
    if (status === "accepted") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "preparing")}>
        <Text style={s.btnText}>ًں”¥ ط¨ط¯ط£ ط§ظ„طھط­ط¶ظٹط±</Text>
      </TouchableOpacity>
    );
    if (status === "preparing") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "ready")}>
        <Text style={s.btnText}>âœ… ط§ظ„ط·ظ„ط¨ ط¬ط§ظ‡ط² â€” ط£ط¨ظ„ط؛ ط§ظ„ظ…ظ†ط¯ظˆط¨</Text>
      </TouchableOpacity>
    );
    return null;
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>

      {/* ط§ظ„ظ‡ظٹط¯ط± */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>â†’ ط±ط¬ظˆط¹</Text>
        </TouchableOpacity>
        <Text style={s.title}>ظ„ظˆط­ط© ط§ظ„ط´ظٹظپ ًں‘¨â€چًںچ³</Text>
        <TouchableOpacity onPress={load}>
          <Text style={s.refresh}>طھط­ط¯ظٹط«</Text>
        </TouchableOpacity>
      </View>

      {/* ط­ط§ظ„ط© ط§ظ„ظ…ط·ط¨ط® */}
      <View style={[s.statusBar, { borderColor: isOpen ? "rgba(76,175,80,0.3)" : "rgba(229,57,53,0.3)" }]}>
        <View>
          <Text style={s.statusTitle}>ط­ط§ظ„ط© ظ…ط·ط¨ط®ظٹ</Text>
          <Text style={[s.statusVal, { color: isOpen ? "#4CAF50" : "#E53935" }]}>
            {isOpen ? "â—ڈ ظ…ظپطھظˆط­ â€” طھط³طھظ‚ط¨ظ„ ط·ظ„ط¨ط§طھ" : "â—ڈ ظ…ط؛ظ„ظ‚ â€” ظ„ط§ طھط³طھظ‚ط¨ظ„ ط·ظ„ط¨ط§طھ"}
          </Text>
        </View>
        <Switch
          value={isOpen}
          onValueChange={toggleOpen}
          disabled={toggling}
          trackColor={{ false: "rgba(229,57,53,0.3)", true: "rgba(76,175,80,0.4)" }}
          thumbColor={isOpen ? "#4CAF50" : "#E53935"}
        />
      </View>

      {/* ط¥ط­طµط§ط¦ظٹط§طھ ط³ط±ظٹط¹ط© */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{activeOrders.length}</Text>
          <Text style={s.statLabel}>ط·ظ„ط¨ط§طھ ظ†ط´ط·ط©</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{historyOrders.filter(o => o.status === "delivered").length}</Text>
          <Text style={s.statLabel}>ظ…ظƒطھظ…ظ„ط©</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{chef?.rating_avg || "â€”"}</Text>
          <Text style={s.statLabel}>ط§ظ„طھظ‚ظٹظٹظ… â­گ</Text>
        </View>
      </View>

      {/* ط§ظ„طھط§ط¨ط§طھ */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === "active" && s.tabBtnActive]}
          onPress={() => setTab("active")}
        >
          <Text style={[s.tabText, tab === "active" && s.tabTextActive]}>
            ط§ظ„ط·ظ„ط¨ط§طھ ط§ظ„ظ†ط´ط·ط© ({activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === "history" && s.tabBtnActive]}
          onPress={() => setTab("history")}
        >
          <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>
            ط§ظ„ط³ط¬ظ„ ({historyOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ظ‚ط§ط¦ظ…ط© ط§ظ„ط·ظ„ط¨ط§طھ */}
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

                <Text style={s.customer}>ًں‘¤ {item.users?.full_name}</Text>
                <Text style={s.phone}>ًں“‍ {item.users?.phone}</Text>
                <Text style={s.address}>ًں“چ {item.delivery_address}</Text>

                {/* طھظپط§طµظٹظ„ ط§ظ„ظˆط¬ط¨ط§طھ */}
                {item.order_items?.map((oi: any) => (
                  <Text key={oi.id} style={s.orderItem}>
                    â€¢ {oi.name} أ— {oi.quantity} â€” {oi.subtotal} ط±ظٹط§ظ„
                  </Text>
                ))}

                <View style={s.totalRow}>
                  <Text style={s.total}>ًں’° {item.total} ط±ظٹط§ظ„</Text>
                  <Text style={s.delivery}>طھظˆطµظٹظ„: {item.delivery_fee} ط±ظٹط§ظ„</Text>
                </View>

                {item.notes ? <Text style={s.notes}>ًں“‌ {item.notes}</Text> : null}

                {getActions(item.status, item.id)}
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>{tab === "active" ? "ًں“¦" : "ًں“‹"}</Text>
                <Text style={s.empty}>
                  {tab === "active" ? "ظ…ط§ ظپظٹ ط·ظ„ط¨ط§طھ ظ†ط´ط·ط© ط­ط§ظ„ظٹط§ظ‹" : "ظ…ط§ ظپظٹ ط³ط¬ظ„ ط¨ط¹ط¯"}
                </Text>
              </View>
            }
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: "#0E0700" },
  header:      { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:       { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:        { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  refresh:     { color: "#F0A500", fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  statusBar:   { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", margin: 16, backgroundColor: "#1C1000", borderRadius: 16, padding: 16, borderWidth: 1 },
  statusTitle: { fontSize: 13, fontWeight: "700", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold" },
  statusVal:   { fontSize: 12, textAlign: "right", marginTop: 3, fontFamily: "Almarai_400Regular" },
  statsRow:    { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard:    { flex: 1, backgroundColor: "#1C1000", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  statNum:     { fontSize: 22, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  statLabel:   { fontSize: 10, color: "#8A6030", fontFamily: "Almarai_400Regular", marginTop: 2 },
  tabRow:      { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn:      { flex: 1, backgroundColor: "#1C1000", borderRadius: 12, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  tabBtnActive:{ backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  tabText:     { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_700Bold" },
  tabTextActive:{ color: "#F0A500" },
  card:        { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  row:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderId:     { fontSize: 13, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:   { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  customer:    { fontSize: 14, color: "#FDF0DC", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_700Bold" },
  phone:       { fontSize: 12, color: "#F0A500", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_400Regular" },
  address:     { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 8, fontFamily: "Almarai_400Regular" },
  orderItem:   { fontSize: 12, color: "#C97D20", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_400Regular" },
  totalRow:    { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 },
  total:       { fontSize: 16, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  delivery:    { fontSize: 11, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  notes:       { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 10, fontFamily: "Almarai_400Regular" },
  btns:        { flexDirection: "row-reverse", gap: 8, marginTop: 8 },
  btnAcc:      { flex: 1, backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)", marginTop: 8 },
  btnRej:      { flex: 1, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)", marginTop: 8 },
  btnText:     { color: "#F0A500", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  btnTextRej:  { color: "#E53935", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  emptyWrap:   { alignItems: "center", marginTop: 60 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  empty:       { textAlign: "center", color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
});
