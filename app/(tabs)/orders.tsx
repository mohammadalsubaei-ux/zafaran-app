import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:    { label: "بانتظار القبول", color: "#F0A500" },
  accepted:   { label: "تم القبول",      color: "#2196F3" },
  preparing:  { label: "قيد التحضير 🔥", color: "#FF6600" },
  ready:      { label: "جاهز للتوصيل",   color: "#9C27B0" },
  delivering: { label: "في الطريق 🚗",   color: "#03A9F4" },
  delivered:  { label: "تم التسليم ✅",   color: "#4CAF50" },
  cancelled:  { label: "ملغي ❌",         color: "#E53935" },
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const u = await AsyncStorage.getItem("user");
    if (!u) return;
    const userData = JSON.parse(u);
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
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push(`/orders/${item.id}`)}
              >
                <View style={s.row}>
                  <Text style={s.orderId}>#{item.id.slice(0, 8)}</Text>
                  <View style={[s.badge, { backgroundColor: STATUS[item.status]?.color + "22" }]}>
                    <Text style={[s.badgeText, { color: STATUS[item.status]?.color }]}>
                      {STATUS[item.status]?.label}
                    </Text>
                  </View>
                </View>
                <Text style={s.chefName}>👩‍🍳 {item.chefs?.users?.full_name}</Text>
                <Text style={s.address}>📍 {item.delivery_address}</Text>
                <Text style={s.total}>💰 {item.total} ريال</Text>
                <Text style={s.date}>{new Date(item.created_at).toLocaleDateString("ar-SA")}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>📦</Text>
                <Text style={s.empty}>ما عندك طلبات بعد</Text>
                <TouchableOpacity style={s.orderBtn} onPress={() => router.push("/(tabs)")}>
                  <Text style={s.orderBtnText}>اطلب الحين 🍲</Text>
                </TouchableOpacity>
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
  title:      { fontSize: 18, fontWeight: "900", color: "#FDF0DC" },
  refresh:    { color: "#F0A500", fontSize: 13, fontWeight: "700" },
  card:       { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  row:        { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderId:    { fontSize: 13, fontWeight: "800", color: "#FDF0DC" },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:  { fontSize: 11, fontWeight: "800" },
  chefName:   { fontSize: 13, color: "#C97D20", textAlign: "right", marginBottom: 4, fontWeight: "700" },
  address:    { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 4 },
  total:      { fontSize: 15, fontWeight: "900", color: "#F0A500", textAlign: "right", marginBottom: 4 },
  date:       { fontSize: 11, color: "#5A3A18", textAlign: "right" },
  emptyWrap:  { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  empty:      { textAlign: "center", color: "#8A6030", fontSize: 14, marginBottom: 20 },
  orderBtn:   { backgroundColor: "#F0A500", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  orderBtnText: { color: "#1C0F00", fontWeight: "900", fontSize: 15 },
});
