import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCart } from "@/context/CartContext";
import * as Location from "expo-location";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

export default function CartScreen() {
  const { items, updateQty, clearCart, total, totalItems, chef_id } = useCart();
  const [loading, setLoading]         = useState(false);
  const [address, setAddress]         = useState("");
  const [lat, setLat]                 = useState<number | null>(null);
  const [lng, setLng]                 = useState<number | null>(null);
  const [locLoading, setLocLoading]   = useState(false);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const getLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo.length > 0) {
        const g = geo[0];
        setAddress(`${g.city || ""}، ${g.district || g.subregion || ""}`);
        setLat(loc.coords.latitude);
        setLng(loc.coords.longitude);
      }
    } finally {
      setLocLoading(false);
    }
  };

  const handleOrder = async () => {
    if (deliveryType === "delivery" && !address) {
      Alert.alert("تنبيه", "حدد موقعك أو أدخل العنوان");
      return;
    }
    const u = await AsyncStorage.getItem("user");
    if (!u) { router.replace("/login"); return; }
    const user = JSON.parse(u);
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/orders`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id:      user.id,
          chef_id:          chef_id,
          items:            items.map(i => ({ menu_item_id: i.id, quantity: i.quantity })),
          delivery_address: deliveryType === "delivery" ? address : "استلام شخصي",
          delivery_lat:     deliveryType === "delivery" ? lat : null,
          delivery_lng:     deliveryType === "delivery" ? lng : null,
          payment_method:   "stc_pay",
          notes:            deliveryType === "pickup" ? "استلام شخصي" : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        clearCart();
        Alert.alert("✅ تم الطلب!", `رقم طلبك: ${json.data.id.slice(0, 8)}`, [
          { text: "حسناً", onPress: () => router.replace("/(tabs)/orders") }
        ]);
      } else {
        Alert.alert("خطأ", json.message);
      }
    } catch {
      Alert.alert("خطأ", "تعذر إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  const deliveryFee = deliveryType === "delivery" ? 8 : 0;
  const grandTotal  = total + deliveryFee;

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>سلتي 🛒</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert("مسح السلة", "تبي تمسح كل الوجبات؟", [
            { text: "لا", style: "cancel" },
            { text: "نعم", style: "destructive", onPress: clearCart }
          ]);
        }}>
          <Text style={s.clearBtn}>مسح</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        ListHeaderComponent={
          <View style={s.chefInfo}>
            <Text style={s.chefName}>👩‍🍳 {items[0]?.chef_name}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRight}>
              <Text style={s.itemEmoji}>🍽️</Text>
              <View>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemPrice}>{item.price} ريال</Text>
              </View>
            </View>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, item.quantity + 1)}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={s.qtyNum}>{item.quantity}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, item.quantity - 1)}>
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            {/* طريقة الاستلام */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🚗 طريقة الاستلام</Text>
              <View style={s.deliveryRow}>
                <TouchableOpacity
                  style={[s.deliveryBtn, deliveryType === "delivery" && s.deliveryBtnActive]}
                  onPress={() => setDeliveryType("delivery")}
                >
                  <Text style={s.deliveryEmoji}>🚗</Text>
                  <Text style={[s.deliveryLabel, deliveryType === "delivery" && s.deliveryLabelActive]}>توصيل</Text>
                  <Text style={[s.deliveryPrice, deliveryType === "delivery" && s.deliveryLabelActive]}>+8 ريال</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.deliveryBtn, deliveryType === "pickup" && s.deliveryBtnActive]}
                  onPress={() => setDeliveryType("pickup")}
                >
                  <Text style={s.deliveryEmoji}>🚶</Text>
                  <Text style={[s.deliveryLabel, deliveryType === "pickup" && s.deliveryLabelActive]}>استلام</Text>
                  <Text style={[s.deliveryPrice, deliveryType === "pickup" && s.deliveryLabelActive]}>مجاني</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* الموقع */}
            {deliveryType === "delivery" && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>📍 عنوان التوصيل</Text>
                <TouchableOpacity style={s.locBtn} onPress={getLocation} disabled={locLoading}>
                  {locLoading
                    ? <ActivityIndicator color="#0E0700" />
                    : <Text style={s.locBtnText}>📌 تحديد موقعي تلقائياً</Text>
                  }
                </TouchableOpacity>
                {address ? <Text style={s.addressText}>✅ {address}</Text> : null}
              </View>
            )}

            {/* الملخص */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>📋 ملخص الطلب</Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>الوجبات ({totalItems})</Text>
                <Text style={s.summaryVal}>{total} ريال</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>التوصيل</Text>
                <Text style={s.summaryVal}>{deliveryFee} ريال</Text>
              </View>
              <View style={[s.summaryRow, s.totalRow]}>
                <Text style={s.totalLabel}>المجموع</Text>
                <Text style={s.totalVal}>{grandTotal} ريال</Text>
              </View>
            </View>
          </View>
        }
      />

      {/* زر الطلب */}
      <View style={s.footer}>
        <TouchableOpacity style={s.orderBtn} onPress={handleOrder} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0E0700" />
            : <Text style={s.orderBtnText}>🛒 اطلب الآن — {grandTotal} ريال</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: "#0E0700" },
  header:              { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:               { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:                { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  clearBtn:            { color: "#E53935", fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  chefInfo:            { backgroundColor: "#1C1000", borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  chefName:            { fontSize: 14, fontWeight: "800", color: "#F0A500", textAlign: "right", fontFamily: "Almarai_700Bold" },
  card:                { backgroundColor: "#1C1000", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  cardRight:           { flexDirection: "row-reverse", alignItems: "center", gap: 10, flex: 1 },
  itemEmoji:           { fontSize: 28 },
  itemName:            { fontSize: 14, fontWeight: "800", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold" },
  itemPrice:           { fontSize: 13, color: "#F0A500", fontWeight: "700", textAlign: "right", marginTop: 3, fontFamily: "Almarai_400Regular" },
  qtyRow:              { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  qtyBtn:              { width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(240,165,0,0.15)", alignItems: "center", justifyContent: "center" },
  qtyBtnText:          { fontSize: 18, fontWeight: "900", color: "#F0A500" },
  qtyNum:              { fontSize: 16, fontWeight: "900", color: "#FDF0DC", minWidth: 20, textAlign: "center", fontFamily: "Almarai_800ExtraBold" },
  section:             { backgroundColor: "#1C1000", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  sectionTitle:        { fontSize: 14, fontWeight: "800", color: "#FDF0DC", textAlign: "right", marginBottom: 12, fontFamily: "Almarai_700Bold" },
  deliveryRow:         { flexDirection: "row-reverse", gap: 10 },
  deliveryBtn:         { flex: 1, backgroundColor: "#251400", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  deliveryBtnActive:   { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  deliveryEmoji:       { fontSize: 24, marginBottom: 4 },
  deliveryLabel:       { fontSize: 13, fontWeight: "700", color: "#8A6030", fontFamily: "Almarai_700Bold" },
  deliveryLabelActive: { color: "#F0A500" },
  deliveryPrice:       { fontSize: 11, color: "#5A3A18", marginTop: 2, fontFamily: "Almarai_400Regular" },
  locBtn:              { backgroundColor: "#F0A500", borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 8 },
  locBtnText:          { fontSize: 14, fontWeight: "800", color: "#0E0700", fontFamily: "Almarai_700Bold" },
  addressText:         { color: "#4CAF50", fontSize: 12, textAlign: "right", fontWeight: "700", fontFamily: "Almarai_400Regular" },
  summaryRow:          { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel:        { fontSize: 13, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  summaryVal:          { fontSize: 13, color: "#FDF0DC", fontWeight: "700", fontFamily: "Almarai_700Bold" },
  totalRow:            { borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.12)", paddingTop: 10, marginTop: 4 },
  totalLabel:          { fontSize: 15, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  totalVal:            { fontSize: 18, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  footer:              { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#0E0700", borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.12)" },
  orderBtn:            { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center" },
  orderBtnText:        { fontSize: 17, fontWeight: "900", color: "#0E0700", fontFamily: "Almarai_800ExtraBold" },
});
