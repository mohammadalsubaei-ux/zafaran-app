import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, StatusBar, TextInput } from "react-native";
import { useFonts, Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular } from "@expo-google-fonts/tajawal";

const API = "https://zafaran-backend-production.up.railway.app";

const CATS = [
  { id: "all", label: "الكل", emoji: "🍽️" },
  { id: "rice", label: "أرز", emoji: "🍛" },
  { id: "stew", label: "مرق", emoji: "🫕" },
  { id: "salad", label: "سلطة", emoji: "🥗" },
  { id: "other", label: "أخرى", emoji: "🍴" },
];

export default function HomeScreen() {
  const [chefs, setChefs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular });

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
    fetch(`${API}/api/chefs`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setChefs(j.data);
          setFiltered(j.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

useEffect(() => {
    if (!search) {
      setFiltered(chefs);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`${API}/api/chefs/search?q=${search}`);
      const json = await res.json();
      if (json.success) setFiltered(json.data);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, chefs]);

  if (!fontsLoaded) return <View style={s.safe}><ActivityIndicator color="#F0A500" style={{ marginTop: 100 }} /></View>;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.locationBadge}>
          <Text style={s.locationText}>📍 القصيم ▾</Text>
        </View>
        <Text style={s.title}>زعفران 🍲</Text>
        <Text style={s.greet}>أهلاً {user?.full_name?.split(" ")[0]} 👋</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIco}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="ابحث عن طباخة أو حي..."
          placeholderTextColor="#5A3A18"
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        inverted
        data={CATS}
        keyExtractor={i => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.catBtn, cat === item.id && s.catBtnActive]}
            onPress={() => setCat(item.id)}
          >
            <Text style={s.catEmoji}>{item.emoji}</Text>
            <Text style={[s.catLabel, cat === item.id && s.catLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Chefs */}
      <View style={s.secHd}>
        <Text style={s.secTitle}>الطباخات المتاحة 👩‍🍳</Text>
        <Text style={s.secSub}>{filtered.length} طباخة</Text>
      </View>

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={filtered}
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
            ListEmptyComponent={<Text style={s.empty}>ما في طباخات متاحة</Text>}
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: "#0E0700" },
  header:         { alignItems: "center", padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  title:          { fontSize: 28, fontWeight: "900", color: "#F0A500", fontFamily: "Tajawal_900Black" },
  greet:          { fontSize: 12, color: "#8A6030", marginTop: 2, fontFamily: "Tajawal_400Regular" },
  locationBadge:  { position: "absolute", right: 16, top: 16, backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  locationText:   { fontSize: 11, color: "#C97D20", fontWeight: "700", fontFamily: "Tajawal_700Bold" },
  searchWrap:     { flexDirection: "row-reverse", alignItems: "center", margin: 12, backgroundColor: "#1C1000", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", paddingHorizontal: 14 },
  searchIco:      { fontSize: 16, marginLeft: 8 },
  searchInput:    { flex: 1, height: 44, color: "#FDF0DC", fontSize: 14, fontFamily: "Tajawal_400Regular" },
  catsList:       { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  catBtn:         { alignItems: "center", backgroundColor: "#1C1000", borderRadius: 14, padding: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)", minWidth: 70 },
  catBtnActive:   { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  catEmoji:       { fontSize: 22, marginBottom: 4 },
  catLabel:       { fontSize: 11, color: "#8A6030", fontWeight: "700", fontFamily: "Tajawal_700Bold" },
  catLabelActive: { color: "#F0A500" },
  secHd:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  secTitle:       { fontSize: 15, fontWeight: "800", color: "#FDF0DC", fontFamily: "Tajawal_700Bold" },
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
  empty:          { textAlign: "center", color: "#8A6030", marginTop: 40, fontSize: 14 },
});