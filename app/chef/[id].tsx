import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFonts, Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular } from "@expo-google-fonts/tajawal";
import { useCart } from "@/context/CartContext";

const API = "https://zafaran-backend-production.up.railway.app";

export default function ChefScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [chef, setChef] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { items, addItem, clearCart, total, totalItems, chef_id } = useCart();
  const [fontsLoaded] = useFonts({ Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular });

  useEffect(() => {
    fetch(`${API}/api/chefs/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setChef(j.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddItem = (item: any) => {
    // لو السلة فيها وجبات من طباخة ثانية
    if (chef_id && chef_id !== chef?.id) {
      Alert.alert(
        "سلة جديدة؟",
        "عندك وجبات من طباخة ثانية — تبي تمسحها وتبدأ من هنا؟",
        [
          { text: "لا", style: "cancel" },
          { text: "نعم", style: "destructive", onPress: () => {
            clearCart();
            addItem({ id: item.id, name: item.name, price: item.price, quantity: 1, chef_id: chef?.id, chef_name: chef?.users?.full_name });
          }},
        ]
      );
      return;
    }
    addItem({ id: item.id, name: item.name, price: item.price, quantity: 1, chef_id: chef?.id, chef_name: chef?.users?.full_name });
  };

  const getItemQty = (itemId: string) => {
    return items.find(i => i.id === itemId)?.quantity || 0;
  };

  if (loading || !fontsLoaded) return (
    <View style={s.loadingWrap}>
      <ActivityIndicator color="#F0A500" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={chef?.menu || []}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingBottom: totalItems > 0 ? 100 : 32 }}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Text style={s.backText}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Chef Info */}
            <View style={s.chefCard}>
              <View style={s.avatarWrap}>
                <Text style={s.avatarEmoji}>👩‍🍳</Text>
              </View>
              <Text style={s.chefName}>{chef?.users?.full_name}</Text>
              <Text style={s.chefCity}>📍 {chef?.city} · {chef?.neighborhood}</Text>

              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statVal}>⭐ {chef?.rating_avg}</Text>
                  <Text style={s.statLabel}>التقييم</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statVal}>{chef?.total_orders}</Text>
                  <Text style={s.statLabel}>طلب</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: chef?.is_open ? "#4CAF50" : "#E53935" }]}>
                    {chef?.is_open ? "مفتوحة" : "مغلقة"}
                  </Text>
                  <Text style={s.statLabel}>الحالة</Text>
                </View>
              </View>

              {!chef?.is_open && (
                <View style={s.closedBanner}>
                  <Text style={s.closedText}>⚠️ الطباخة مغلقة حالياً</Text>
                </View>
              )}
            </View>

            {/* Menu Title */}
            <View style={s.menuHd}>
              <Text style={s.menuTitle}>🍽️ القائمة</Text>
              <Text style={s.menuCount}>{chef?.menu?.length || 0} وجبة</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const qty = getItemQty(item.id);
          return (
            <View style={[s.card, !chef?.is_open && s.cardDisabled]}>
              <View style={s.cardContent}>
                <View style={s.itemEmoji}>
                  <Text style={{ fontSize: 32 }}>🍽️</Text>
                </View>
                <View style={s.itemInfo}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={s.itemFooter}>
                    <Text style={s.itemPrice}>{item.price} ريال</Text>
                    {item.prep_minutes && (
                      <Text style={s.itemTime}>⏱️ {item.prep_minutes} دقيقة</Text>
                    )}
                  </View>
                </View>
              </View>

              {chef?.is_open && (
                <View style={s.qtyCtrl}>
                  {qty > 0 ? (
                    <View style={s.qtyRow}>
                      <TouchableOpacity style={s.qtyBtn} onPress={() => {
                        const { updateQty, removeItem } = require("@/context/CartContext");
                      }}>
                        <Text style={s.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={s.qtyNum}>{qty}</Text>
                      <TouchableOpacity style={s.qtyBtn} onPress={() => handleAddItem(item)}>
                        <Text style={s.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={s.addBtn} onPress={() => handleAddItem(item)}>
                      <Text style={s.addBtnText}>+ أضف</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🍽️</Text>
            <Text style={s.empty}>لا توجد وجبات حالياً</Text>
          </View>
        }
      />

      {/* Cart Bar */}
      {totalItems > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => router.push("/cart")}>
          <View style={s.cartBadge}>
            <Text style={s.cartBadgeText}>{totalItems}</Text>
          </View>
          <Text style={s.cartBarText}>عرض السلة</Text>
          <Text style={s.cartBarTotal}>{total} ريال</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: "#0E0700" },
  loadingWrap:  { flex: 1, backgroundColor: "#0E0700", alignItems: "center", justifyContent: "center" },
  header:       { padding: 16 },
  backBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: "#1C1000", borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", alignItems: "center", justifyContent: "center" },
  backText:     { color: "#F0A500", fontSize: 18, fontWeight: "700" },
  chefCard:     { margin: 16, marginTop: 0, backgroundColor: "#1C1000", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)", alignItems: "center" },
  avatarWrap:   { width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 2, borderColor: "rgba(240,165,0,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarEmoji:  { fontSize: 40 },
  chefName:     { fontSize: 22, fontWeight: "900", color: "#FDF0DC", fontFamily: "Tajawal_900Black", marginBottom: 6 },
  chefCity:     { fontSize: 13, color: "#8A6030", fontFamily: "Tajawal_400Regular", marginBottom: 16 },
  statsRow:     { flexDirection: "row-reverse", width: "100%", justifyContent: "space-around" },
  statItem:     { alignItems: "center" },
  statVal:      { fontSize: 16, fontWeight: "900", color: "#F0A500", fontFamily: "Tajawal_700Bold" },
  statLabel:    { fontSize: 11, color: "#5A3A18", marginTop: 3, fontFamily: "Tajawal_400Regular" },
  statDivider:  { width: 1, backgroundColor: "rgba(240,165,0,0.1)" },
  closedBanner: { marginTop: 14, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(229,57,53,0.2)", width: "100%" },
  closedText:   { color: "#E53935", fontSize: 12, textAlign: "center", fontFamily: "Tajawal_700Bold" },
  menuHd:       { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  menuTitle:    { fontSize: 16, fontWeight: "800", color: "#FDF0DC", fontFamily: "Tajawal_700Bold" },
  menuCount:    { fontSize: 12, color: "#8A6030", fontFamily: "Tajawal_400Regular" },
  card:         { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#1C1000", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  cardDisabled: { opacity: 0.5 },
  cardContent:  { flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 10 },
  itemEmoji:    { width: 60, height: 60, borderRadius: 16, backgroundColor: "rgba(240,165,0,0.08)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemInfo:     { flex: 1 },
  itemName:     { fontSize: 15, fontWeight: "800", color: "#FDF0DC", textAlign: "right", fontFamily: "Tajawal_700Bold", marginBottom: 4 },
  itemDesc:     { fontSize: 12, color: "#8A6030", textAlign: "right", fontFamily: "Tajawal_400Regular", lineHeight: 18 },
  itemFooter:   { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  itemPrice:    { fontSize: 15, fontWeight: "900", color: "#F0A500", fontFamily: "Tajawal_700Bold" },
  itemTime:     { fontSize: 11, color: "#5A3A18", fontFamily: "Tajawal_400Regular" },
  qtyCtrl:      { alignItems: "flex-start" },
  qtyRow:       { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: "rgba(240,165,0,0.08)", borderRadius: 12, padding: 6, paddingHorizontal: 12 },
  qtyBtn:       { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(240,165,0,0.15)", alignItems: "center", justifyContent: "center" },
  qtyBtnText:   { fontSize: 18, fontWeight: "900", color: "#F0A500" },
  qtyNum:       { fontSize: 16, fontWeight: "900", color: "#FDF0DC", minWidth: 24, textAlign: "center" },
  addBtn:       { backgroundColor: "#F0A500", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnText:   { fontSize: 13, fontWeight: "800", color: "#0E0700" },
  emptyWrap:    { alignItems: "center", marginTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  empty:        { textAlign: "center", color: "#8A6030", fontSize: 14 },
  cartBar:      { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: "#F0A500", borderRadius: 18, padding: 16, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", shadowColor: "#F0A500", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  cartBadge:    { backgroundColor: "#0E0700", width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cartBadgeText:{ fontSize: 13, fontWeight: "900", color: "#F0A500" },
  cartBarText:  { fontSize: 16, fontWeight: "900", color: "#0E0700", flex: 1, textAlign: "center" },
  cartBarTotal: { fontSize: 15, fontWeight: "900", color: "#0E0700" },
});