import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '@/context/LanguageContext';
import { useFonts, Almarai_800ExtraBold, Almarai_400Regular, Almarai_700Bold } from '@expo-google-fonts/almarai';
import Svg, { Path, Ellipse } from 'react-native-svg';

const API = "https://zafaran-backend-production.up.railway.app";

const TABS = {
  ar: { cooking: "الطبخ", sweets: "الحلويات", pastries: "المعجنات", orders: "طلباتي", account: "حسابي" },
  en: { cooking: "Cooking", sweets: "Sweets", pastries: "Pastries", orders: "Orders", account: "Account" },
};

function BowlSVG() {
  return (
    <Svg width={36} height={40} viewBox="0 0 100 110">
      <Path d="M30,22 C27,14 33,8 30,22 C27,32 33,38 30,48" stroke="#F0A500" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.5}/>
      <Path d="M50,18 C47,8 53,12 50,24 C47,36 53,42 50,52" stroke="#F0A500" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity={0.85}/>
      <Path d="M70,22 C67,14 73,8 70,22 C67,32 73,38 70,48" stroke="#F0A500" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.5}/>
      <Ellipse cx="50" cy="58" rx="44" ry="10" fill="#F0A500" opacity={0.9}/>
      <Path d="M6,58 Q6,95 50,99 Q94,95 94,58 Z" fill="#1C1000" stroke="#F0A500" strokeWidth="2.5"/>
      <Path d="M6,58 Q6,50 50,47 Q94,50 94,58" fill="#F0A500" opacity={0.2}/>
      <Ellipse cx="50" cy="102" rx="42" ry="7" fill="none" stroke="#F0A500" strokeWidth="2" opacity={0.45}/>
    </Svg>
  );
}

function ZafaranHeader() {
  const [user, setUser]             = useState<any>(null);
  const [city, setCity]             = useState("القصيم");
  const [showCities, setShowCities] = useState(false);
  const [cities, setCities]         = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const { lang, toggleLang }        = useLang();

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => { if (u) setUser(JSON.parse(u)); });
    AsyncStorage.getItem("selected_city").then(c => { if (c) setCity(c); });
  }, []);

  const loadCities = async () => {
    setLoadingCities(true);
    try {
      const res  = await fetch(`${API}/api/cities`);
      const json = await res.json();
      if (json.success) setCities(json.data);
    } finally {
      setLoadingCities(false);
    }
  };

  const selectCity = async (cityName: string) => {
    setCity(cityName);
    await AsyncStorage.setItem("selected_city", cityName);
    setShowCities(false);
  };

  const firstName = user?.full_name?.split(" ")[0] || "";

  return (
    <>
      <View style={h.container}>
        {/* يمين — اللوقو */}
        <View style={h.logoWrap}>
          <BowlSVG />
          <View style={h.logoText}>
            <Text style={h.logoName}>زعفران</Text>
            <Text style={h.logoSlogan}>أكل بيتي · طعم أصيل</Text>
          </View>
        </View>

        {/* يسار — الترحيب والمدينة واللغة */}
        <View style={h.greetWrap}>
          <View style={h.greetRow}>
            <Text style={h.greetText}>
              {firstName ? `أهلاً ${firstName} 👋` : "أهلاً بك 👋"}
            </Text>
            <TouchableOpacity style={h.langBtn} onPress={toggleLang}>
              <Text style={h.langText}>{lang === "ar" ? "EN" : "ع"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={h.cityBtn}
            onPress={() => { setShowCities(true); loadCities(); }}
          >
            <Text style={h.cityText}>📍 {city} ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal اختيار المدينة */}
      <Modal visible={showCities} transparent animationType="slide">
        <View style={h.modalOverlay}>
          <View style={h.modalBox}>
            <View style={h.modalHeader}>
              <Text style={h.modalTitle}>اختر مدينتك</Text>
              <TouchableOpacity onPress={() => setShowCities(false)}>
                <Text style={h.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingCities
              ? <ActivityIndicator color="#F0A500" style={{ marginTop: 20 }} />
              : <FlatList
                  data={cities}
                  keyExtractor={i => i.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[h.cityItem, city === item.name_ar && h.cityItemActive]}
                      onPress={() => selectCity(item.name_ar)}
                    >
                      <Text style={[h.cityItemText, city === item.name_ar && h.cityItemTextActive]}>
                        {item.name_ar}
                      </Text>
                      <Text style={h.cityRegion}>{item.region}</Text>
                      {city === item.name_ar && <Text style={h.cityCheck}>✓</Text>}
                    </TouchableOpacity>
                  )}
                />
            }
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const { lang } = useLang();
  const t = TABS[lang as keyof typeof TABS] || TABS.ar;
  const [fontsLoaded] = useFonts({ Almarai_800ExtraBold, Almarai_400Regular, Almarai_700Bold });
  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#0E0700" }}>
      <SafeAreaView style={{ backgroundColor: "#0E0700" }}>
        <ZafaranHeader />
      </SafeAreaView>

      <Tabs
        key={lang}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0E0700",
            borderTopColor: "rgba(240,165,0,0.15)",
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 10,
            paddingTop: 5,
          },
          tabBarActiveTintColor:   "#F0A500",
          tabBarInactiveTintColor: "#5A3A18",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700", fontFamily: "Almarai_700Bold" },
        }}
      >
        <Tabs.Screen name="index"    options={{ title: t.cooking,  tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍲</Text> }} />
        <Tabs.Screen name="sweets"   options={{ title: t.sweets,   tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍰</Text> }} />
        <Tabs.Screen name="pastries" options={{ title: t.pastries, tabBarIcon: () => <Text style={{ fontSize: 22 }}>🥐</Text> }} />
        <Tabs.Screen name="orders"   options={{ title: t.orders,   tabBarIcon: () => <Text style={{ fontSize: 22 }}>📦</Text> }} />
        <Tabs.Screen name="profile"  options={{ title: t.account,  tabBarIcon: () => <Text style={{ fontSize: 22 }}>👤</Text> }} />
        <Tabs.Screen name="wallet"   options={{ href: null }} />
        <Tabs.Screen name="explore"  options={{ href: null }} />
        <Tabs.Screen name="chef"     options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const h = StyleSheet.create({
  container:          { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)", backgroundColor: "#0E0700" },
  logoWrap:           { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  logoText:           { flexDirection: "column", alignItems: "flex-end" },
  logoName:           { fontSize: 22, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold", lineHeight: 24 },
  logoSlogan:         { fontSize: 8, color: "#8A6030", fontFamily: "Almarai_400Regular", letterSpacing: 2 },
  greetWrap:          { alignItems: "flex-start" },
  greetRow:           { flexDirection: "row", alignItems: "center", gap: 8 },
  greetText:          { fontSize: 13, fontWeight: "700", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  langBtn:            { backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(240,165,0,0.3)" },
  langText:           { fontSize: 11, color: "#F0A500", fontWeight: "900", fontFamily: "Almarai_700Bold" },
  cityBtn:            { backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", marginTop: 4 },
  cityText:           { fontSize: 11, color: "#F0A500", fontFamily: "Almarai_700Bold" },
  modalOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:           { backgroundColor: "#1C1000", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%", borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  modalHeader:        { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)", paddingBottom: 12 },
  modalTitle:         { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  modalClose:         { fontSize: 18, color: "#8A6030", padding: 4 },
  cityItem:           { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.06)" },
  cityItemActive:     { backgroundColor: "rgba(240,165,0,0.08)" },
  cityItemText:       { fontSize: 16, color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  cityItemTextActive: { color: "#F0A500" },
  cityRegion:         { fontSize: 11, color: "#5A3A18", fontFamily: "Almarai_400Regular", flex: 1, textAlign: "center" },
  cityCheck:          { fontSize: 16, color: "#F0A500", fontWeight: "900" },
});
