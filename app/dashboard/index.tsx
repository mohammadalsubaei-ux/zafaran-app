import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:    { label: "ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظ‚ط¨ظˆظ„", color: "#F0A500" },
  accepted:   { label: "طھظ… ط§ظ„ظ‚ط¨ظˆظ„",      color: "#2196F3" },
  preparing:  { label: "ظ‚ظٹط¯ ط§ظ„طھط­ط¶ظٹط± ًں”¥", color: "#FF6600" },
  ready:      { label: "ط¬ط§ظ‡ط² ظ„ظ„طھظˆطµظٹظ„",  color: "#9C27B0" },
  delivering: { label: "ظپظٹ ط§ظ„ط·ط±ظٹظ‚ ًںڑ—",  color: "#03A9F4" },
  delivered:  { label: "طھظ… ط§ظ„طھط³ظ„ظٹظ… âœ…",  color: "#4CAF50" },
  cancelled:  { label: "ظ…ظ„ط؛ظٹ â‌Œ",        color: "#E53935" },
};

export default function DashboardScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chefId, setChefId]   = useState<string | null>(null);
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

  const updateStatus = async (orderId: string, status: string) => {
    const res  = await fetch(`${API}/api/orders/${orderId}/status`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.success) { Alert.alert("âœ… طھظ… ط§ظ„طھط­ط¯ظٹط«"); load(); }
  };

  const getActions = (status: string, id: string) => {
    if (status === "pending") return (
      <View style={s.btns}>
        <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "accepted")}>
          <Text style={s.btnText}>âœ… ظ‚ط¨ظˆظ„</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnRej} onPress={() => updateStatus(id, "cancelled")}>
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
        <Text style={s.btnText}>âœ” ط§ظ„ط·ظ„ط¨ ط¬ط§ظ‡ط²</Text>
      </TouchableOpacity>
    );
    if (status === "ready") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "delivering")}>
        <Text style={s.btnText}>ًںڑ— ط®ط±ط¬ ظ„ظ„طھظˆطµظٹظ„</Text>
      </TouchableOpacity>
    );
    if (status === "delivering") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "delivered")}>
        <Text style={s.btnText}>âœ… طھظ… ط§ظ„طھط³ظ„ظٹظ…</Text>
      </TouchableOpacity>
    );
    return null;
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>â†’ ط±ط¬ظˆط¹</Text>
        </TouchableOpacity>
        <Text style={s.title}>ظ„ظˆط­ط© ط§ظ„ط·ط¨ط§ط®ط© ًں‘©â€چًںچ³</Text>
        <TouchableOpacity onPress={load}>
          <Text style={s.refresh}>طھط­ط¯ظٹط«</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} />
        : <FlatList
            data={orders}
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
                <Text style={s.address}>ًں“چ {item.delivery_address}</Text>
                <Text style={s.total}>ًں’° {item.total} ط±ظٹط§ظ„</Text>
                {getActions(item.status, item.id)}
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>ًں“¦</Text>
                <Text style={s.empty}>ظ…ط§ ظپظٹ ط·ظ„ط¨ط§طھ ط­ط§ظ„ظٹط§ظ‹</Text>
              </View>
            }
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: "#0E0700" },
  header:     { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:      { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:       { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  refresh:    { color: "#F0A500", fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  card:       { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  row:        { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderId:    { fontSize: 13, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:  { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  customer:   { fontSize: 13, color: "#C97D20", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_700Bold" },
  address:    { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_400Regular" },
  total:      { fontSize: 15, fontWeight: "900", color: "#F0A500", textAlign: "right", marginBottom: 12, fontFamily: "Almarai_800ExtraBold" },
  btns:       { flexDirection: "row-reverse", gap: 8 },
  btnAcc:     { flex: 1, backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)" },
  btnRej:     { flex: 1, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  btnText:    { color: "#F0A500", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  btnTextRej: { color: "#E53935", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  emptyWrap:  { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  empty:      { textAlign: "center", color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
});
