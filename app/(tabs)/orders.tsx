import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:    { label: "بانتظار القبول", color: "#F0A500" },
  accepted:   { label: "تم القبول", color: "#2196F3" },
  preparing:  { label: "قيد التحضير 🔥", color: "#FF6600" },
  ready:      { label: "جاهز للتوصيل", color: "#9C27B0" },
  delivering: { label: "في الطريق 🚗", color: "#03A9F4" },
  delivered:  { label: "تم التسليم ✅", color: "#4CAF50" },
  cancelled:  { label: "ملغي ❌", color: "#E53935" },
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const load = async () => {
    const u = await AsyncStorage.getItem("user");
    if (!u) return;
    const userData = JSON.parse(u);
    setUser(userData);
    fetch(`${API}/api/orders/customer/${userData.id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setOrders(j.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>طلباتي 📦</Text>
        <TouchableOpacity onPress={load}>
          <Text style={s.refresh}>تحديث</Text>
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
                <Text style={s.address}>📍 {item.delivery_address}</Text>
                <Text style={s.total}>💰 {item.total} ريال</Text>
                <Text style={s.date}>{new Date(item.created_at).toLocaleDateString("ar-SA")}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={s.empty}>ما عندك طلبات بعد</Text>}
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: "#140B00" },
  header:    { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:     { fontSize: 18, fontWeight: "900", color: "#FDF0DC" },
  refresh:   { color: "#F0A500", fontSize: 13, fontWeight: "700" },
  card:      { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  row:       { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderId:   { fontSize: 13, fontWeight: "800", color: "#FDF0DC" },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText: { fontSize: 11, fontWeight: "800" },
  address:   { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 4 },
  total:     { fontSize: 15, fontWeight: "900", color: "#F0A500", textAlign: "right", marginBottom: 4 },
  date:      { fontSize: 11, color: "#5A3A18", textAlign: "right" },
  empty:     { textAlign: "center", color: "#8A6030", marginTop: 40, fontSize: 14 },
});