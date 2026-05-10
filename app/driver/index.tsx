import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  ready:      { label: "جاهز للتوصيل 🎁", color: "#9C27B0" },
  delivering: { label: "في الطريق 🚗", color: "#03A9F4" },
  delivered:  { label: "تم التسليم ✅", color: "#4CAF50" },
};

export default function DriverScreen() {
  const [readyOrders, setReadyOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
    loadOrders();
  }, []);

  const loadOrders = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/orders?status=ready`).then(r => r.json()),
      fetch(`${API}/api/orders?status=delivering`).then(r => r.json()),
    ]).then(([ready, delivering]) => {
      if (ready.success) setReadyOrders(ready.data);
      if (delivering.success) setMyOrders(delivering.data);
    }).finally(() => setLoading(false));
  };

  const updateStatus = async (orderId: string, status: string) => {
    const res = await fetch(`${API}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.success) {
      Alert.alert("✅ تم التحديث");
      loadOrders();
    }
  };

  const openMap = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const allOrders = [...myOrders, ...readyOrders];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>لوحة المندوب 🚗</Text>
        <TouchableOpacity onPress={loadOrders}>
          <Text style={s.refresh}>تحديث</Text>
        </TouchableOpacity>
      </View>

      <View style={s.availRow}>
        <View>
          <Text style={s.availTitle}>أنا متاح للتوصيل</Text>
          <Text style={s.availSub}>{isAvailable ? "✅ تظهر لك الطلبات" : "❌ لن تظهر لك طلبات"}</Text>
        </View>
        <TouchableOpacity
          style={[s.toggle, isAvailable && s.toggleOn]}
          onPress={() => setIsAvailable(!isAvailable)}
        >
          <View style={[s.toggleThumb, isAvailable && s.toggleThumbOn]} />
        </TouchableOpacity>
      </View>

      <Text style={s.secTitle}>
        {isAvailable ? `الطلبات المتاحة 📦 (${allOrders.length})` : "أنت غير متاح حالياً"}
      </Text>

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} />
        : !isAvailable
        ? <Text style={s.empty}>فعّل التوفر لترى الطلبات</Text>
        : <FlatList
            data={allOrders}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={[s.card, item.status === "delivering" && s.cardActive]}>
                <View style={s.cardRow}>
                  <Text style={s.orderId}>#{item.id.slice(0, 8)}</Text>
                  <View style={[s.badge, { backgroundColor: STATUS[item.status]?.color + "22" }]}>
                    <Text style={[s.badgeText, { color: STATUS[item.status]?.color }]}>
                      {STATUS[item.status]?.label}
                    </Text>
                  </View>
                </View>

                <Text style={s.customerName}>👤 {item.users?.full_name}</Text>
                <Text style={s.customerPhone}>📞 {item.users?.phone}</Text>
                <Text style={s.address}>📍 {item.delivery_address}</Text>
                <Text style={s.total}>💰 {item.total} ريال</Text>

                {item.delivery_lat && item.delivery_lng && (
                  <TouchableOpacity
                    style={s.mapBtn}
                    onPress={() => openMap(item.delivery_lat, item.delivery_lng)}
                  >
                    <Text style={s.mapBtnText}>🗺️ افتح الخريطة</Text>
                  </TouchableOpacity>
                )}

                {item.status === "ready" && (
                  <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(item.id, "delivering")}>
                    <Text style={s.btnText}>🚗 استلم الطلب وابدأ التوصيل</Text>
                  </TouchableOpacity>
                )}
                {item.status === "delivering" && (
                  <TouchableOpacity style={s.btnDone} onPress={() => updateStatus(item.id, "delivered")}>
                    <Text style={s.btnText}>✅ تم التسليم</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={s.empty}>ما في طلبات حالياً</Text>}
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#140B00" },
  header:        { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:         { fontSize: 18, fontWeight: "900", color: "#FDF0DC" },
  back:          { color: "#F0A500", fontSize: 15, fontWeight: "700" },
  refresh:       { color: "#F0A500", fontSize: 13, fontWeight: "700" },
  availRow:      { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", margin: 16, backgroundColor: "#1C1000", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  availTitle:    { fontSize: 14, fontWeight: "800", color: "#FDF0DC", textAlign: "right" },
  availSub:      { fontSize: 11, color: "#8A6030", textAlign: "right", marginTop: 3 },
  toggle:        { width: 50, height: 28, borderRadius: 14, backgroundColor: "#333", padding: 3 },
  toggleOn:      { backgroundColor: "#F0A500" },
  toggleThumb:   { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleThumbOn: { transform: [{ translateX: 22 }] },
  secTitle:      { fontSize: 15, fontWeight: "800", color: "#FDF0DC", paddingHorizontal: 16, marginBottom: 8 },
  card:          { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  cardActive:    { borderColor: "rgba(3,169,244,0.4)", backgroundColor: "#0D1A1F" },
  cardRow:       { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderId:       { fontSize: 13, fontWeight: "800", color: "#FDF0DC" },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:     { fontSize: 11, fontWeight: "800" },
  customerName:  { fontSize: 14, fontWeight: "800", color: "#FDF0DC", textAlign: "right", marginBottom: 3 },
  customerPhone: { fontSize: 12, color: "#F0A500", textAlign: "right", marginBottom: 4 },
  address:       { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 4 },
  total:         { fontSize: 15, fontWeight: "900", color: "#F0A500", textAlign: "right", marginBottom: 10 },
  mapBtn:        { backgroundColor: "rgba(33,150,243,0.15)", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(33,150,243,0.3)", marginBottom: 8 },
  mapBtnText:    { color: "#2196F3", fontSize: 13, fontWeight: "800" },
  btnAcc:        { backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)", marginBottom: 6 },
  btnDone:       { backgroundColor: "rgba(76,175,80,0.15)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(76,175,80,0.3)" },
  btnText:       { color: "#FDF0DC", fontSize: 13, fontWeight: "800" },
  empty:         { textAlign: "center", color: "#8A6030", marginTop: 40, fontSize: 14 },
});