import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const API = "https://zafaran-backend-production.up.railway.app";

export default function ItemScreen() {
  const { id, name, price, description, chef_id } = useLocalSearchParams();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
  }, []);

  const getLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("تنبيه", "يجب السماح بالوصول للموقع");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo.length > 0) {
        const g = geo[0];
        const addr = `${g.city || ""}، ${g.district || g.subregion || ""}`;
        setAddress(addr);
        setLat(loc.coords.latitude);
        setLng(loc.coords.longitude);
      }
    } catch (e) {
      Alert.alert("خطأ", "تعذر تحديد الموقع");
    } finally {
      setLocLoading(false);
    }
  };

  const deliveryFee = deliveryType === "delivery" ? 8 : 0;
  const total = Number(price) * qty + deliveryFee;

  const handleOrder = async () => {
    if (!user?.id) {
      Alert.alert("خطأ", "يجب تسجيل الدخول أولاً");
      return;
    }
    if (deliveryType === "delivery" && !address.trim()) {
      Alert.alert("تنبيه", "حدد موقعك أو أدخل العنوان");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: user.id,
          chef_id: chef_id,
          items: [{ menu_item_id: id, quantity: qty }],
          delivery_address: deliveryType === "delivery" ? address : "استلام شخصي",
          delivery_lat: deliveryType === "delivery" ? lat : null,
          delivery_lng: deliveryType === "delivery" ? lng : null,
          payment_method: "stc_pay",
          notes: deliveryType === "pickup" ? "استلام شخصي" : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("✅ تم الطلب!", `رقم طلبك: ${json.data.id.slice(0, 8)}`, [
          { text: "حسناً", onPress: () => router.replace("/(tabs)") }
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

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>→ رجوع</Text>
        </TouchableOpacity>

        <View style={s.hero}>
          <Text style={s.emoji}>🍽️</Text>
          <Text style={s.name}>{name}</Text>
          <Text style={s.desc}>{description}</Text>
          <Text style={s.price}>{price} ريال</Text>
        </View>

        {/* الكمية */}
        <View style={s.qtyRow}>
          <Text style={s.qtyLabel}>الكمية</Text>
          <View style={s.qtyCtrl}>
            <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
              <Text style={s.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.qtyNum}>{qty}</Text>
            <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(q => q + 1)}>
              <Text style={s.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* طريقة الاستلام */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🚗 طريقة الاستلام</Text>
          <View style={s.deliveryRow}>
            <TouchableOpacity
              style={[s.deliveryBtn, deliveryType === "delivery" && s.deliveryBtnActive]}
              onPress={() => setDeliveryType("delivery")}
            >
              <Text style={s.deliveryEmoji}>🚗</Text>
              <Text style={[s.deliveryLabel, deliveryType === "delivery" && s.deliveryLabelActive]}>توصيل للبيت</Text>
              <Text style={[s.deliveryPrice, deliveryType === "delivery" && s.deliveryLabelActive]}>+8 ريال</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.deliveryBtn, deliveryType === "pickup" && s.deliveryBtnActive]}
              onPress={() => setDeliveryType("pickup")}
            >
              <Text style={s.deliveryEmoji}>🚶</Text>
              <Text style={[s.deliveryLabel, deliveryType === "pickup" && s.deliveryLabelActive]}>استلام شخصي</Text>
              <Text style={[s.deliveryPrice, deliveryType === "pickup" && s.deliveryLabelActive]}>مجاني</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* عنوان التوصيل */}
        {deliveryType === "delivery" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📍 عنوان التوصيل</Text>
            <TouchableOpacity style={s.locBtn} onPress={getLocation} disabled={locLoading}>
              {locLoading
                ? <ActivityIndicator color="#1C0F00" />
                : <Text style={s.locBtnText}>📡 تحديد موقعي تلقائياً</Text>
              }
            </TouchableOpacity>
            <Text style={s.orText}>أو أدخل العنوان يدوياً</Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="مثال: بريدة، حي النرجس"
                placeholderTextColor="#8A6030"
                value={address}
                onChangeText={setAddress}
                textAlign="right"
              />
            </View>
            {address ? <Text style={s.selectedAddr}>✅ {address}</Text> : null}
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>
            {deliveryType === "delivery" ? "المجموع (يشمل التوصيل 8 ر)" : "المجموع (استلام شخصي)"}
          </Text>
          <Text style={s.totalVal}>{total} ريال</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={handleOrder} disabled={loading}>
          {loading ? <ActivityIndicator color="#1C0F00" /> : <Text style={s.btnText}>🛍️ اطلب الآن</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#140B00" },
  back:              { padding: 16 },
  backText:          { color: "#F0A500", fontSize: 16, fontWeight: "700" },
  hero:              { alignItems: "center", padding: 24 },
  emoji:             { fontSize: 80, marginBottom: 16 },
  name:              { fontSize: 24, fontWeight: "900", color: "#FDF0DC", marginBottom: 8 },
  desc:              { fontSize: 14, color: "#8A6030", textAlign: "center", lineHeight: 22, marginBottom: 12 },
  price:             { fontSize: 22, fontWeight: "900", color: "#F0A500" },
  qtyRow:            { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 20, backgroundColor: "#1C1000", borderRadius: 16, margin: 16, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  qtyLabel:          { fontSize: 16, fontWeight: "700", color: "#FDF0DC" },
  qtyCtrl:           { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn:            { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(240,165,0,0.15)", alignItems: "center", justifyContent: "center" },
  qtyBtnText:        { fontSize: 20, fontWeight: "800", color: "#F0A500" },
  qtyNum:            { fontSize: 20, fontWeight: "900", color: "#FDF0DC" },
  section:           { margin: 16, backgroundColor: "#1C1000", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  sectionTitle:      { fontSize: 15, fontWeight: "800", color: "#FDF0DC", textAlign: "right", marginBottom: 14 },
  deliveryRow:       { flexDirection: "row-reverse", gap: 10 },
  deliveryBtn:       { flex: 1, backgroundColor: "#251400", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  deliveryBtnActive: { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.5)" },
  deliveryEmoji:     { fontSize: 28, marginBottom: 6 },
  deliveryLabel:     { fontSize: 13, fontWeight: "700", color: "#8A6030", marginBottom: 3 },
  deliveryLabelActive: { color: "#F0A500" },
  deliveryPrice:     { fontSize: 11, color: "#5A3A18", fontWeight: "700" },
  locBtn:            { backgroundColor: "#F0A500", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 12 },
  locBtnText:        { fontSize: 15, fontWeight: "800", color: "#1C0F00" },
  orText:            { textAlign: "center", color: "#8A6030", fontSize: 12, marginBottom: 10 },
  inputWrap:         { backgroundColor: "#251400", borderRadius: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 14 },
  input:             { height: 46, color: "#FDF0DC", fontSize: 14 },
  selectedAddr:      { color: "#4CAF50", fontSize: 12, textAlign: "right", marginTop: 8, fontWeight: "700" },
  footer:            { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#1C1000", borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.12)" },
  totalRow:          { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 12 },
  totalLabel:        { fontSize: 12, color: "#8A6030" },
  totalVal:          { fontSize: 20, fontWeight: "900", color: "#F0A500" },
  btn:               { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center" },
  btnText:           { fontSize: 18, fontWeight: "800", color: "#1C0F00" },
});