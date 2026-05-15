import { useEffect, useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, ScrollView, Image
} from "react-native";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";
import { Search, Star, ChevronLeft } from "lucide-react-native";
import { CATEGORIES } from "@/constants/categories";

const API = "https://zafaran-backend-production.up.railway.app";

const SECTIONS = [
  { id: "kitchen",  label: "الطبخ",      sub: "أكلات شعبية",    color: "#F2B233", bg: "#2A1E00" },
  { id: "sweets",   label: "الحلا",       sub: "حلويات لذيذة",   color: "#E8A0BF", bg: "#2A1220" },
  { id: "pastries", label: "الفطائر",    sub: "فطائر ومعجنات",  color: "#A8D8A8", bg: "#0F2A0F" },
  { id: "drinks",   label: "المشروبات",  sub: "قهوة وعصائر",    color: "#87CEEB", bg: "#0F1E2A" },
];

export default function HomeScreen() {
  const [chefs, setChefs]         = useState<any[]>([]);
  const [topChefs, setTopChefs]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/chefs`);
      const json = await res.json();
      if (json.success) {
        setChefs(json.data);
        setTopChefs(json.data.slice(0, 5));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!search) { loadData(); return; }
    const timer = setTimeout(async () => {
      const res  = await fetch(`${API}/api/chefs/search?q=${search}`);
      const json = await res.json();
      if (json.success) setChefs(json.data);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  if (!fontsLoaded) return (
    <View style={s.safe}><ActivityIndicator color="#F2B233" style={{ marginTop: 100 }} /></View>
  );

  const ListHeader = () => (
    <View>
      {/* Search Bar */}
      <View style={s.searchWrap}>
        <Search size={18} color="#8A6030" strokeWidth={1.8}/>
        <TextInput
          style={s.searchInput}
          placeholder="ابحث عن طباخة أو طبق..."
          placeholderTextColor="#5A3A18"
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      {/* الأقسام الرئيسية */}
      <View style={s.sectionsRow}>
        {SECTIONS.map(sec => (
          <TouchableOpacity key={sec.id} style={[s.sectionCard, { backgroundColor: sec.bg }]}>
            <View style={[s.sectionIconWrap, { borderColor: sec.color + "44" }]}>
              <Text style={s.sectionIcon}>
                {sec.id === "kitchen" ? "🍲" : sec.id === "sweets" ? "🍰" : sec.id === "pastries" ? "🥐" : "☕"}
              </Text>
            </View>
            <Text style={[s.sectionLabel, { color: sec.color }]}>{sec.label}</Text>
            <Text style={s.sectionSub}>{sec.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* الأكثر طلباً */}
      <View style={s.secHeader}>
        <TouchableOpacity>
          <Text style={s.secMore}>عرض الكل</Text>
        </TouchableOpacity>
        <Text style={s.secTitle}>الأكثر طلباً</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topList}>
        {chefs.slice(0, 6).map(chef => (
          <TouchableOpacity key={chef.id} style={s.topCard} onPress={() => router.push(`/chef/${chef.id}`)}>
            <View style={s.topImgWrap}>
              {chef.menu?.[0]?.image_url
                ? <Image source={{ uri: chef.menu[0].image_url }} style={s.topImg}/>
                : <View style={[s.topImg, s.topImgPlaceholder]}>
                    <Text style={{ fontSize: 32 }}>🍽️</Text>
                  </View>
              }
              <View style={s.topRatingBadge}>
                <Star size={10} color="#F2B233" fill="#F2B233"/>
                <Text style={s.topRatingText}>{chef.rating_avg}</Text>
              </View>
            </View>
            <Text style={s.topChefName} numberOfLines={1}>{chef.menu?.[0]?.name || "وجبات متنوعة"}</Text>
            <Text style={s.topChefBy} numberOfLines={1}>{chef.users?.full_name}</Text>
            <Text style={s.topPrice}>{chef.menu?.[0]?.price || "—"} ر</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* بانر الأسر المنتجة */}
      <TouchableOpacity style={s.banner}>
        <View style={s.bannerContent}>
          <Text style={s.bannerTitle}>ادعم الأسر المنتجة</Text>
          <Text style={s.bannerSub}>كل طلب منك فرصة لهم</Text>
          <View style={s.bannerBtn}>
            <Text style={s.bannerBtnText}>اكتشف الآن</Text>
          </View>
        </View>
        <Text style={{ fontSize: 60 }}>👩‍🍳</Text>
      </TouchableOpacity>

      {/* الشيفين المميزين */}
      <View style={s.secHeader}>
        <TouchableOpacity>
          <Text style={s.secMore}>عرض الكل</Text>
        </TouchableOpacity>
        <Text style={s.secTitle}>الأسر المميزة</Text>
      </View>
    </View>
  );

  return (
    <View style={s.safe}>
      {loading
        ? <ActivityIndicator color="#F2B233" style={{ marginTop: 100 }} size="large"/>
        : <FlatList
            data={chefs}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={<ListHeader/>}
            renderItem={({ item }) => {
              const isMale = item.users?.gender === "male";
              return (
                <TouchableOpacity style={s.chefCard} onPress={() => router.push(`/chef/${item.id}`)}>
                  <View style={s.chefAvatarWrap}>
                    <Text style={s.chefAvatar}>{isMale ? "👨‍🍳" : "👩‍🍳"}</Text>
                  </View>
                  <View style={s.chefInfo}>
                    <View style={s.chefNameRow}>
                      <Text style={s.chefName}>{item.users?.full_name}</Text>
                      <View style={[s.statusDot, { backgroundColor: item.is_open ? "#4CAF50" : "#E53935" }]}/>
                    </View>
                    <Text style={s.chefCity}>📍 {item.city} · {item.neighborhood}</Text>
                    <View style={s.chefMeta}>
                      <Text style={s.chefRating}>⭐ {item.rating_avg}</Text>
                      <Text style={s.chefOrders}>{item.total_orders} طلب</Text>
                    </View>
                  </View>
                  <ChevronLeft size={18} color="#5A3A18" strokeWidth={1.8}/>
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
    </View>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#1C140F" },
  searchWrap:        { flexDirection: "row-reverse", alignItems: "center", marginHorizontal: 16, marginVertical: 12, backgroundColor: "#251A0E", borderRadius: 16, paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: "rgba(242,178,51,0.1)" },
  searchInput:       { flex: 1, height: 46, color: "#FDF0DC", fontSize: 14, fontFamily: "Almarai_400Regular" },
  sectionsRow:       { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  sectionCard:       { flex: 1, borderRadius: 18, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  sectionIconWrap:   { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  sectionIcon:       { fontSize: 22 },
  sectionLabel:      { fontSize: 12, fontWeight: "800", fontFamily: "Almarai_700Bold", textAlign: "center" },
  sectionSub:        { fontSize: 9, color: "#8A6030", fontFamily: "Almarai_400Regular", textAlign: "center" },
  secHeader:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  secTitle:          { fontSize: 16, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  secMore:           { fontSize: 12, color: "#F2B233", fontFamily: "Almarai_700Bold" },
  topList:           { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  topCard:           { width: 140, backgroundColor: "#251A0E", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(242,178,51,0.08)" },
  topImgWrap:        { position: "relative" },
  topImg:            { width: 140, height: 110, resizeMode: "cover" },
  topImgPlaceholder: { backgroundColor: "#2A1E00", alignItems: "center", justifyContent: "center" },
  topRatingBadge:    { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(28,20,15,0.85)", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 3 },
  topRatingText:     { fontSize: 10, color: "#F2B233", fontFamily: "Almarai_700Bold" },
  topChefName:       { fontSize: 13, fontWeight: "800", color: "#FDF0DC", textAlign: "right", paddingHorizontal: 10, paddingTop: 8, fontFamily: "Almarai_700Bold" },
  topChefBy:         { fontSize: 10, color: "#8A6030", textAlign: "right", paddingHorizontal: 10, marginTop: 2, fontFamily: "Almarai_400Regular" },
  topPrice:          { fontSize: 13, fontWeight: "900", color: "#F2B233", textAlign: "right", paddingHorizontal: 10, paddingBottom: 10, marginTop: 4, fontFamily: "Almarai_800ExtraBold" },
  banner:            { marginHorizontal: 16, marginVertical: 16, backgroundColor: "#2A1E00", borderRadius: 20, padding: 20, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "rgba(242,178,51,0.15)" },
  bannerContent:     { flex: 1 },
  bannerTitle:       { fontSize: 18, fontWeight: "900", color: "#F2B233", fontFamily: "Almarai_800ExtraBold", marginBottom: 4 },
  bannerSub:         { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_400Regular", marginBottom: 12 },
  bannerBtn:         { backgroundColor: "#F2B233", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" },
  bannerBtnText:     { fontSize: 12, fontWeight: "800", color: "#1C140F", fontFamily: "Almarai_700Bold" },
  chefCard:          { flexDirection: "row-reverse", alignItems: "center", marginHorizontal: 16, marginBottom: 10, backgroundColor: "#251A0E", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(242,178,51,0.08)", gap: 12 },
  chefAvatarWrap:    { width: 54, height: 54, borderRadius: 16, backgroundColor: "rgba(242,178,51,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(242,178,51,0.15)" },
  chefAvatar:        { fontSize: 28 },
  chefInfo:          { flex: 1 },
  chefNameRow:       { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 },
  chefName:          { fontSize: 14, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  statusDot:         { width: 8, height: 8, borderRadius: 4 },
  chefCity:          { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginBottom: 6 },
  chefMeta:          { flexDirection: "row-reverse", gap: 12 },
  chefRating:        { fontSize: 12, color: "#F2B233", fontFamily: "Almarai_700Bold" },
  chefOrders:        { fontSize: 11, color: "#5A3A18", fontFamily: "Almarai_400Regular" },
  emptyWrap:         { alignItems: "center", marginTop: 60 },
  emptyEmoji:        { fontSize: 48, marginBottom: 12 },
  empty:             { textAlign: "center", color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
});
