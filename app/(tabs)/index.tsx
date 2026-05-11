import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, StatusBar, TextInput, ScrollView
} from "react-native";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const CATS = [
  { id: "all",   label: "الكل",  emoji: "🍽️" },
  { id: "rice",  label: "أرز",   emoji: "🍛" },
  { id: "stew",  label: "مرق",   emoji: "🫕" },
  { id: "salad", label: "سلطة",  emoji: "🥗" },
  { id: "other", label: "أخرى",  emoji: "🍴" },
];

const GENDERS = [
  { id: "all",    label: "الكل",    emoji: "👥" },
  { id: "female", label: "طباخات",  emoji: "👩‍🍳" },
  { id: "male",   label: "طهاة",    emoji: "👨‍🍳" },
];

export default function HomeScreen() {
  const [chefs, setChefs]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser]       = useState<any>(null);
  const [search, setSearch]   = useState("");
  const [cat, setCat]         = useState("all");
  const [gender, setGender]   = useState("all");
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const loadChefs = (category = cat, gen = gender) => {
    setLoading(true);
    let url = `${API}/api/chefs`;
    const params: string[] = [];
    if (category !== "all") params.push(`category=${category}`);
    if (gen !== "all")      params.push(`gender=${gen}`);
    if (params.length > 0)  url += `?${params.join("&")}`;
    fetch(url)
      .then(r => r.json())
      .then(j => { if (j.success) setChefs(j.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => { if (u) setUser(JSON.parse(u)); });
    loadChefs();
  }, []);

  useEffect(() => {
    if (!search) { loadChefs(); return; }
    const timer = setTimeout(async () => {
      const res  = await fetch(`${API}/api/chefs/search?q=${search}`);
      const json = await res.json();
      if (json.success) setChefs(json.data);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCat = (id: string) => { setCat(id); loadChefs(id, gender); };
  const handleGender = (id: string) => { setGender(id); loadChefs(cat, id); };

  if (!fontsLoaded) return (
    <View style={s.safe}><ActivityIndicator color="#F0A500" style={{ marginTop: 100 }} /></View>
  );

  const sectionTitle = gender === "female" ? "الطباخات 👩‍🍳" : gender === "male" ? "الطهاة 👨‍🍳" : "الطهاة والطباخات 👥";

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

      {/* Gender Filter */}
      <View style={s.genderRow}>
        {GENDERS.map(g => (
          <TouchableOpacity
            key={g.id}
            style={[s.genderBtn, gender === g.id && s.genderBtnActive]}
            onPress={() => handleGender(g.id)}
          >
            <Text style={s.genderEmoji}>{g.emoji}</Text>
            <Text style={[s.genderLabel, gender === g.id && s.genderLabelActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Categories - ScrollView بدل FlatList */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catsList}
        style={s.catsScroll}
      >
        {[...CATS].reverse().map(item => (
          <TouchableOpacity
            key={item.id}
            style={[s.catBtn, cat === item.id && s.catBtnActive]}
            onPress={() => handleCat(item.id)}
          >
            <Text style={s.catEmoji}>{item.emoji}</Text>
            <Text style={[s.catLabel, cat === item.id && s.catLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section Header */}
      <View style={s.secHd}>
        <Text style={s.secTitle}>{sectionTitle}</Text>
        <Text style={s.secSub}>{chefs.length} نتيجة</Text>
      </View>

      {/* Chefs List */}
      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={chefs}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => {
              const isMale = item.users?.gender === "male";
              return (
                <TouchableOpacity style={s.card} onPress={() => router.push(`/chef/${item.id}`)}>
                  <View style={s.cardTop}>
                    <View style={[s.avatar, {
                      backgroundColor: item.is_open ? "rgba(240,165,0,0.1)" : "rgba(100,100,100,0.1)"
                    }]}>
                      <Text style={s.avatarEmoji}>{isMale ? "👨‍🍳" : "👩‍🍳"}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.chefName}>{item.users?.full_name}</Text>
                      <Text style={s.chefCity}>📍 {item.city} · {item.neighborhood}</Text>
                      <View style={s.cardRow}>
                        <Text style={s.rating}>⭐ {item.rating_avg}</Text>
                        <View style={[s.badge, item.is_open ? s.open : s.closed]}>
                          <Text style={[s.badgeText, { color: item.is_open ? "#4CAF50" : "#E53935" }]}>
                            {item.is_open
                              ? (isMale ? "● مفتوح" : "● مفتوحة")
                              : (isMale ? "● مغلق"  : "● مغلقة")}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={s.arrow}>←</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>🍽️</Text>
                <Text style={s.empty}>ما في نتائج</Text>
              </View>
            }
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#0E0700" },
  header:            { alignItems: "center", padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  title:             { fontSize: 28, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  greet:             { fontSize: 12, color: "#8A6030", marginTop: 2, fontFamily: "Almarai_400Regular" },
  locationBadge:     { position: "absolute", right: 16, top: 16, backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  locationText:      { fontSize: 11, color: "#C97D20", fontWeight: "700", fontFamily: "Almarai_700Bold" },
  searchWrap:        { flexDirection: "row-reverse", alignItems: "center", margin: 12, backgroundColor: "#1C1000", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", paddingHorizontal: 14 },
  searchIco:         { fontSize: 16, marginLeft: 8 },
  searchInput:       { flex: 1, height: 44, color: "#FDF0DC", fontSize: 14, fontFamily: "Almarai_400Regular" },
  genderRow:         { flexDirection: "row-reverse", paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  genderBtn:         { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#1C1000", borderRadius: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  genderBtnActive:   { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  genderEmoji:       { fontSize: 16 },
  genderLabel:       { fontSize: 12, color: "#8A6030", fontWeight: "700", fontFamily: "Almarai_700Bold" },
  genderLabelActive: { color: "#F0A500" },
  catsScroll:        { flexGrow: 0, height: 90 },
  catsList:          { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "center" },
  catBtn:            { alignItems: "center", backgroundColor: "#1C1000", borderRadius: 14, padding: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)", minWidth: 70 },
  catBtnActive:      { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  catEmoji:          { fontSize: 22, marginBottom: 4 },
  catLabel:          { fontSize: 11, color: "#8A6030", fontWeight: "700", fontFamily: "Almarai_700Bold" },
  catLabelActive:    { color: "#F0A500" },
  secHd:             { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  secTitle:          { fontSize: 15, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  secSub:            { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  card:              { backgroundColor: "#1C1000", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  cardTop:           { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  avatar:            { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarEmoji:       { fontSize: 28 },
  cardInfo:          { flex: 1 },
  chefName:          { fontSize: 15, fontWeight: "800", color: "#FDF0DC", textAlign: "right", marginBottom: 3, fontFamily: "Almarai_700Bold" },
  chefCity:          { fontSize: 11, color: "#8A6030", textAlign: "right", marginBottom: 6, fontFamily: "Almarai_400Regular" },
  cardRow:           { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  rating:            { fontSize: 12, color: "#F0A500", fontWeight: "700" },
  badge:             { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
  open:              { backgroundColor: "rgba(76,175,80,0.12)" },
  closed:            { backgroundColor: "rgba(229,57,53,0.12)" },
  badgeText:         { fontSize: 10, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  arrow:             { fontSize: 18, color: "#5A3A18" },
  emptyWrap:         { alignItems: "center", marginTop: 60 },
  emptyEmoji:        { fontSize: 48, marginBottom: 12 },
  empty:             { textAlign: "center", color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
});
