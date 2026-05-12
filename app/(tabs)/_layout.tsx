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
  const [addresses, setAddresses]   = useState<any[]>([]);
  const [currentAddr, setCurrentAddr] = useState<any>(null);
  const [showAddresses, setShowAddresses] = useState(false);
  const [loading, setLoading]       = useState(false);
  const { lang }                    = useLang();

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const u = await AsyncStorage.getItem("user");
    if (!u) return;
    const user = JSON.parse(u);

    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/addresses/${user.id}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setAddresses(json.data);
        // العنوان الافتراضي
        const def = json.data.find((a: any) => a.is_default) || json.data[0];
        setCurrentAddr(def);
        await AsyncStorage.setItem("last_address", def.address);
        await AsyncStorage.setItem("last_address_lat", String(def.lat || ""));
        await AsyncStorage.setItem("last_address_lng", String(def.lng || ""));
      } else {
        // لا يوجد عناوين
        const savedAddr = await AsyncStorage.getItem("last_address");
        if (savedAddr) setCurrentAddr({ label: "موقعي", address: savedAddr });
      }
    } finally {
      setLoading(false);
    }
  };

  const selectAddress = async (addr: any) => {
    setCurrentAddr(addr);
    setShowAddresses(false);
    await AsyncStorage.setItem("last_address", addr.address);
    await AsyncStorage.setItem("last_address_lat", String(addr.lat || ""));
    await AsyncStorage.setItem("last_address_lng", String(addr.lng || ""));
  };

  const LABELS: any = { "منزل": "🏠", "عمل": "💼", "استراحة": "⭐", "أخرى": "📍" };

  return (
    <>
      <View style={h.container}>
        {/* يمين — اللوقو */}
        <View style={h.logoWrap}>
          <BowlSVG />
          <Text style={h.logoName}>زعفران</Text>
        </View>

        {/* يسار — العنوان */}
        <TouchableOpacity
          style={h.addressBtn}
          onPress={() => { setShowAddresses(true); loadAddresses(); }}
        >
          <Text style={h.addressIcon}>📍</Text>
          <View style={h.addressTextWrap}>
            <Text style={h.addressLabel} numberOfLines={1}>
              {currentAddr?.label || "حدد موقعك"}
            </Text>
            <Text style={h.addressValue} numberOfLines={1}>
              {currentAddr?.address ? currentAddr.address.slice(0, 20) + "..." : "اضغط لاختيار العنوان"}
            </Text>
          </View>
          <Text style={h.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* Modal العناوين */}
      <Modal visible={showAddresses} transparent animationType="slide">
        <View style={h.modalOverlay}>
          <View style={h.modalBox}>
            <View style={h.modalHeader}>
              <Text style={h.modalTitle}>عنوان التوصيل</Text>
              <TouchableOpacity onPress={() => setShowAddresses(false)}>
                <Text style={h.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {loading
              ? <ActivityIndicator color="#F0A500" style={{ marginTop: 20 }} />
              : addresses.length === 0
              ? <View style={h.emptyWrap}>
                  <Text style={h.emptyText}>ما عندك عناوين محفوظة</Text>
                  <Text style={h.emptyHint}>أضف عنواناً من شاشة حسابي</Text>
                </View>
              : <FlatList
                  data={addresses}
                  keyExtractor={i => i.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[h.addrItem, currentAddr?.id === item.id && h.addrItemActive]}
                      onPress={() => selectAddress(item)}
                    >
                      <Text style={h.addrEmoji}>{LABELS[item.label] || "📍"}</Text>
                      <View style={h.addrInfo}>
                        <Text style={[h.addrLabel, currentAddr?.id === item.id && h.addrLabelActive]}>
                          {item.label}
                          {item.is_default && <Text style={h.defaultTag}> · افتراضي</Text>}
                        </Text>
                        <Text style={h.addrText} numberOfLines={1}>{item.address}</Text>
                      </View>
                      {currentAddr?.id === item.id && <Text style={h.checkMark}>✓</Text>}
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
  container:      { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)", backgroundColor: "#0E0700" },
  logoWrap:       { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  logoName:       { fontSize: 24, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  addressBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(240,165,0,0.08)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", maxWidth: 180 },
  addressIcon:    { fontSize: 14 },
  addressTextWrap:{ flex: 1 },
  addressLabel:   { fontSize: 11, color: "#F0A500", fontFamily: "Almarai_700Bold", fontWeight: "700" },
  addressValue:   { fontSize: 10, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  chevron:        { fontSize: 10, color: "#F0A500" },
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:       { backgroundColor: "#1C1000", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "60%", borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  modalHeader:    { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)", paddingBottom: 12 },
  modalTitle:     { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  modalClose:     { fontSize: 18, color: "#8A6030", padding: 4 },
  addrItem:       { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.06)" },
  addrItemActive: { backgroundColor: "rgba(240,165,0,0.06)", borderRadius: 12 },
  addrEmoji:      { fontSize: 24 },
  addrInfo:       { flex: 1 },
  addrLabel:      { fontSize: 15, color: "#FDF0DC", fontFamily: "Almarai_700Bold", textAlign: "right" },
  addrLabelActive:{ color: "#F0A500" },
  defaultTag:     { fontSize: 11, color: "#8A6030" },
  addrText:       { fontSize: 11, color: "#8A6030", fontFamily: "Almarai_400Regular", textAlign: "right", marginTop: 2 },
  checkMark:      { fontSize: 18, color: "#F0A500", fontWeight: "900" },
  emptyWrap:      { alignItems: "center", padding: 30 },
  emptyText:      { fontSize: 15, color: "#FDF0DC", fontFamily: "Almarai_700Bold", marginBottom: 8 },
  emptyHint:      { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_400Regular" },
});
