import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, StatusBar } from "react-native";
import { useFonts, Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular } from "@expo-google-fonts/tajawal";

const API = "https://zafaran-backend-production.up.railway.app";

export default function HomeScreen() {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular });

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
    fetch(`${API}/api/chefs`)
      .then(r => r.json())
      .then(j => { if (j.success) setChefs(j.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert("خروج", "تبي تطلع من حسابك؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم", style: "destructive", onPress: () => {
        AsyncStorage.removeItem("user").then(() => {
          router.replace("/login");
        });
      }},
    ], { cancelable: true });
  };

  if (!fontsLoaded) return <View style={s.safe}><ActivityIndicator color="#F0A500" style={{ marginTop: 100 }} /></View>;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      
      <View style={s.header}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>خروج 🚪</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>زعفران 🍲</Text>
          <Text style={s.sub}>أهلاً {user?.full_name?.split(" ")[0]} 👋</Text>
        </View>
        <View style={s.locationBadge}>
          <Text style={s.locationText}>📍 القصيم</Text>
        </View>
      </View>

      <View style={s.btnsRow}>
        <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/orders")}>
          <Text style={s.actionBtnIco}>📦</Text>
          <Text style={s.actionBtnTxt}>طلباتي</Text>
        </TouchableOpacity>
        {user?.role === "chef" && (
          <TouchableOpacity style={[s.actionBtn, s.chefActionBtn]} onPress={() => router.push("/dashboard")}>
            <Text style={s.actionBtnIco}>👩‍🍳</Text>
            <Text style={s.actionBtnTxt}>لوحة الطباخة</Text>
          </TouchableOpacity>
        )}
        {user?.role === "driver" && (
          <TouchableOpacity style={[s.actionBtn, s.chefActionBtn]} onPress={() => router.push("/driver")}>
            <Text style={s.actionBtnIco}>🚗</Text>
            <Text style={s.actionBtnTxt}>لوحة المندوب</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.secHd}>
        <Text style={s.secTitle}>الطباخات المتاحة 👩‍🍳</Text>
        <Text style={s.secSub}>{chefs.length} طباخة</Text>
      </View>

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={chefs}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/chef/${item.id}`)}>
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: item.is_open ? "rgba(240,165,0,0.1)" : "rgba(100,100,100,0.1)" }]}>
                    <Text style={s.avatarEmoji}>👩‍🍳</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.chefName}>{item.users?.full_name}</Text>
                    <Text style={s.chefCity}>📍 {item.city} · {item.neighborhood}</Text>
                    <View style={s.cardRow}>
                      <Text style={s.rating}>⭐ {item.rating_avg}</Text>
                      <View style={[s.badge, item.is_open ? s.open : s.closed]}>
                        <Text style={[s.badgeText, { color: item.is_open ? "#4CAF50" : "#E53935" }]}>
                          {item.is_open ? "● مفتوحة" : "● مغلقة"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={s.arrow}>←</Text>
                </View>
              </TouchableOpacity>
            )}
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: "#0E0700" },
  header:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  headerCenter:   { alignItems: "center" },
  title:          { fontSize: 26, fontWeight: "900", color: "#F0A500", fontFamily: "Tajawal_900Black" },
  sub:            { fontSize: 11, color: "#8A6030", marginTop: 2, fontFamily: "Tajawal_400Regular" },
  logoutBtn:      { padding: 8 },
  logoutText:     { fontSize: 12, color: "#E53935", fontWeight: "700", fontFamily: "Tajawal_700Bold" },
  locationBadge:  { backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  locationText:   { fontSize: 11, color: "#C97D20", fontWeight: "700", fontFamily: "Tajawal_700Bold" },
  btnsRow:        { flexDirection: "row-reverse", gap: 10, padding: 16, paddingBottom: 8 },
  actionBtn:      { flex: 1, backgroundColor: "#1C1000", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", flexDirection: "row-reverse", justifyContent: "center", gap: 8 },
  chefActionBtn:  { borderColor: "rgba(240,165,0,0.4)", backgroundColor: "rgba(240,165,0,0.08)" },
  actionBtnIco:   { fontSize: 18 },
  actionBtnTxt:   { color: "#F0A500", fontSize: 14, fontWeight: "800", fontFamily: "Tajawal_700Bold" },
  secHd:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  secTitle:       { fontSize: 16, fontWeight: "800", color: "#FDF0DC", fontFamily: "Tajawal_700Bold" },
  secSub:         { fontSize: 12, color: "#8A6030", fontFamily: "Tajawal_400Regular" },
  card:           { backgroundColor: "#1C1000", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  cardTop:        { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  avatar:         { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarEmoji:    { fontSize: 28 },
  cardInfo:       { flex: 1 },
  chefName:       { fontSize: 15, fontWeight: "800", color: "#FDF0DC", textAlign: "right", marginBottom: 3, fontFamily: "Tajawal_700Bold" },
  chefCity:       { fontSize: 11, color: "#8A6030", textAlign: "right", marginBottom: 6, fontFamily: "Tajawal_400Regular" },
  cardRow:        { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  rating:         { fontSize: 12, color: "#F0A500", fontWeight: "700" },
  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
  open:           { backgroundColor: "rgba(76,175,80,0.12)" },
  closed:         { backgroundColor: "rgba(229,57,53,0.12)" },
  badgeText:      { fontSize: 10, fontWeight: "800", fontFamily: "Tajawal_700Bold" },
  arrow:          { fontSize: 18, color: "#5A3A18" },
});