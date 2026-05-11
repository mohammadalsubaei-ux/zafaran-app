import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

export default function ItemScreen() {
  const { id, name, price, description, chef_id, chef_name } = useLocalSearchParams();
  const { addItem, items, chef_id: cartChefId, clearCart } = useCart();
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const qty = items.find(i => i.id === id)?.quantity || 0;

  const handleAdd = () => {
    if (cartChefId && cartChefId !== chef_id) {
      Alert.alert(
        "سلة جديدة؟",
        "عندك وجبات من طباخة ثانية — تبي تمسحها وتبدأ من هنا؟",
        [
          { text: "لا", style: "cancel" },
          { text: "نعم", style: "destructive", onPress: () => {
            clearCart();
            addItem({ id: String(id), name: String(name), price: Number(price), quantity: 1, chef_id: String(chef_id), chef_name: String(chef_name || "") });
            router.back();
          }},
        ]
      );
      return;
    }
    addItem({ id: String(id), name: String(name), price: Number(price), quantity: 1, chef_id: String(chef_id), chef_name: String(chef_name || "") });
    router.back();
  };

  if (!fontsLoaded) return null;

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

        {qty > 0 && (
          <View style={s.inCartBanner}>
            <Text style={s.inCartText}>✅ في السلة — {qty} قطعة</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} onPress={handleAdd}>
          <Text style={s.btnText}>🛒 {qty > 0 ? "أضف المزيد" : "أضف للسلة"} — {price} ريال</Text>
        </TouchableOpacity>
        {qty > 0 && (
          <TouchableOpacity style={s.cartBtn} onPress={() => router.push("/cart")}>
            <Text style={s.cartBtnText}>عرض السلة ←</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: "#0E0700" },
  back:         { padding: 16 },
  backText:     { color: "#F0A500", fontSize: 16, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  hero:         { alignItems: "center", padding: 24 },
  emoji:        { fontSize: 80, marginBottom: 16 },
  name:         { fontSize: 24, fontWeight: "900", color: "#FDF0DC", marginBottom: 8, fontFamily: "Almarai_800ExtraBold", textAlign: "center" },
  desc:         { fontSize: 14, color: "#8A6030", textAlign: "center", lineHeight: 22, marginBottom: 12, fontFamily: "Almarai_400Regular" },
  price:        { fontSize: 22, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  inCartBanner: { margin: 16, backgroundColor: "rgba(76,175,80,0.1)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(76,175,80,0.2)", alignItems: "center" },
  inCartText:   { color: "#4CAF50", fontSize: 14, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  footer:       { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#0E0700", borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.12)", gap: 10 },
  btn:          { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center" },
  btnText:      { fontSize: 17, fontWeight: "900", color: "#0E0700", fontFamily: "Almarai_800ExtraBold" },
  cartBtn:      { backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)" },
  cartBtnText:  { fontSize: 15, fontWeight: "800", color: "#F0A500", fontFamily: "Almarai_700Bold" },
});
