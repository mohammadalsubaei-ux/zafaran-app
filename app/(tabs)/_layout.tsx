import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Almarai_800ExtraBold, Almarai_400Regular, Almarai_700Bold } from '@expo-google-fonts/almarai';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { Home, LayoutGrid, ShoppingBag, Heart, User, Bell, ChevronDown, MapPin, Briefcase } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const API = "https://zafaran-backend-production.up.railway.app";

function BowlSVG() {
  return (
    <Svg width={32} height={36} viewBox="0 0 100 110">
      <Path d="M30,22 C27,14 33,8 30,22 C27,32 33,38 30,48" stroke="#F2B233" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.6}/>
      <Path d="M50,18 C47,8 53,12 50,24 C47,36 53,42 50,52" stroke="#F2B233" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity={0.9}/>
      <Path d="M70,22 C67,14 73,8 70,22 C67,32 73,38 70,48" stroke="#F2B233" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.6}/>
      <Ellipse cx="50" cy="60" rx="44" ry="10" fill="#F2B233" opacity={0.9}/>
      <Path d="M6,60 Q6,95 50,99 Q94,95 94,60 Z" fill="#1C140F" stroke="#F2B233" strokeWidth="2.5"/>
      <Ellipse cx="50" cy="102" rx="42" ry="7" fill="none" stroke="#F2B233" strokeWidth="2" opacity={0.4}/>
    </Svg>
  );
}

function AddrIcon({ label }: { label: string }) {
  if (label === "منزل") return <Home size={18} color="#F2B233" strokeWidth={1.8}/>;
  if (label === "عمل")  return <Briefcase size={18} color="#F2B233" strokeWidth={1.8}/>;
  return <MapPin size={18} color="#F2B233" strokeWidth={1.8}/>;
}

function ZafaranHeader() {
  const [addresses, setAddresses]         = useState<any[]>([]);
  const [currentAddr, setCurrentAddr]     = useState<any>(null);
  const [showAddresses, setShowAddresses] = useState(false);
  const [loading, setLoading]             = useState(false);

  useEffect(() => { loadAddresses(); }, []);

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
        const def = json.data.find((a: any) => a.is_default) || json.data[0];
        setCurrentAddr(def);
        await AsyncStorage.setItem("last_address", def.address);
        await AsyncStorage.setItem("last_address_lat", String(def.lat || ""));
        await AsyncStorage.setItem("last_address_lng", String(def.lng || ""));
      } else {
        const savedAddr = await AsyncStorage.getItem("last_address");
        if (savedAddr) setCurrentAddr({ label: "موقعي", address: savedAddr });
      }
    } finally { setLoading(false); }
  };

  const selectAddress = async (addr: any) => {
    setCurrentAddr(addr);
    setShowAddresses(false);
    await AsyncStorage.setItem("last_address", addr.address);
    await AsyncStorage.setItem("last_address_lat", String(addr.lat || ""));
    await AsyncStorage.setItem("last_address_lng", String(addr.lng || ""));
  };

  const addressLabel = currentAddr?.label || "حدد موقعك";
  const addressShort = currentAddr?.address
    ? currentAddr.address.slice(0, 22) + (currentAddr.address.length > 22 ? "..." : "")
    : "اضغط لاختيار العنوان";

  return (
    <>
      <View style={h.container}>
        {/* يسار — تنبيهات + صورة */}
        <View style={h.leftWrap}>
          <TouchableOpacity style={h.notifBtn}>
            <Bell size={20} color="#F2B233" strokeWidth={1.8}/>
          </TouchableOpacity>
          <View style={h.avatarWrap}>
            <User size={16} color="#F2B233" strokeWidth={1.8}/>
          </View>
        </View>

        {/* وسط — الموقع */}
        <TouchableOpacity style={h.locationWrap} onPress={() => { setShowAddresses(true); loadAddresses(); }}>
          <View style={h.locationRow}>
            <ChevronDown size={14} color="#F2B233" strokeWidth={2}/>
            <Text style={h.locationLabel} numberOfLines={1}>{addressLabel}</Text>
          </View>
          <Text style={h.locationSub} numberOfLines={1}>{addressShort}</Text>
        </TouchableOpacity>

        {/* يمين — اللوقو */}
        <View style={h.logoWrap}>
          <BowlSVG />
          <Text style={h.logoName}>زعفران</Text>
        </View>
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
              ? <ActivityIndicator color="#F2B233" style={{ marginTop: 20 }} />
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
                      <View style={h.addrIconWrap}>
                        <AddrIcon label={item.label}/>
                      </View>
                      <View style={h.addrInfo}>
                        <Text style={[h.addrLabel, currentAddr?.id === item.id && h.addrLabelActive]}>
                          {item.label}
                          {item.is_default ? <Text style={h.defaultTag}> · افتراضي</Text> : null}
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
  const [fontsLoaded] = useFonts({ Almarai_800ExtraBold, Almarai_400Regular, Almarai_700Bold });
  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#1C140F" }}>
      <SafeAreaView style={{ backgroundColor: "#1C140F" }}>
        <ZafaranHeader />
      </SafeAreaView>

      <Tabs
  initialRouteName="index"
        screenOptions={{
          headerShown: false,
       tabBarStyle: {
  backgroundColor: "transparent",
  borderTopWidth: 0,
  height: 78,
  paddingBottom: 10,
  paddingTop: 8,
  paddingHorizontal: 8,
  marginHorizontal: 12,
  marginBottom: 14,
  borderRadius: 30,
  position: "absolute",
  flexDirection: "row-reverse",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 20,
  borderWidth: 1,
  borderColor: "rgba(242,178,51,0.12)",
  overflow: "hidden",
},
          tabBarBackground: () => (
            <BlurView
              intensity={60}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarActiveTintColor:   "#F2B233",
          tabBarInactiveTintColor: "#5A3A18",
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            fontFamily: "Almarai_700Bold",
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "الرئيسية",
            tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={1.8}/>,
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: "التصنيفات",
            tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} strokeWidth={1.8}/>,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "طلباتي",
            tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} strokeWidth={1.8}/>,
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: "المفضلة",
            tabBarIcon: ({ color }) => <Heart size={22} color={color} strokeWidth={1.8}/>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "حسابي",
            tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={1.8}/>,
          }}
        />
        <Tabs.Screen name="wallet"   options={{ href: null }} />
        <Tabs.Screen name="sweets"   options={{ href: null }} />
        <Tabs.Screen name="pastries" options={{ href: null }} />
        <Tabs.Screen name="explore"  options={{ href: null }} />
        <Tabs.Screen name="chef"     options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const h = StyleSheet.create({
  container:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.08)", backgroundColor: "#1C140F" },
  logoWrap:       { flexDirection: "row", alignItems: "center", gap: 6 },
  logoName:       { fontSize: 22, fontWeight: "900", color: "#F2B233", fontFamily: "Almarai_800ExtraBold" },
  locationWrap:   { flex: 1, alignItems: "center" },
  locationRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
  locationLabel:  { fontSize: 13, color: "#F2B233", fontFamily: "Almarai_700Bold", fontWeight: "700" },
  locationSub:    { fontSize: 10, color: "#8A6030", fontFamily: "Almarai_400Regular", marginTop: 1 },
  leftWrap:       { flexDirection: "row", alignItems: "center", gap: 10 },
  notifBtn:       { padding: 4 },
  avatarWrap:     { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(242,178,51,0.1)", borderWidth: 1, borderColor: "rgba(242,178,51,0.25)", alignItems: "center", justifyContent: "center" },
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:       { backgroundColor: "#1C140F", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "60%", borderWidth: 1, borderColor: "rgba(242,178,51,0.15)" },
  modalHeader:    { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.1)", paddingBottom: 12 },
  modalTitle:     { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  modalClose:     { fontSize: 18, color: "#8A6030", padding: 4 },
  addrItem:       { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.06)" },
  addrItemActive: { backgroundColor: "rgba(242,178,51,0.06)", borderRadius: 12 },
  addrIconWrap:   { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(242,178,51,0.08)", alignItems: "center", justifyContent: "center" },
  addrInfo:       { flex: 1 },
  addrLabel:      { fontSize: 14, color: "#FDF0DC", fontFamily: "Almarai_700Bold", textAlign: "right" },
  addrLabelActive:{ color: "#F2B233" },
  defaultTag:     { fontSize: 11, color: "#8A6030" },
  addrText:       { fontSize: 11, color: "#8A6030", fontFamily: "Almarai_400Regular", textAlign: "right", marginTop: 2 },
  checkMark:      { fontSize: 18, color: "#F2B233", fontWeight: "900" },
  emptyWrap:      { alignItems: "center", padding: 30 },
  emptyText:      { fontSize: 15, color: "#FDF0DC", fontFamily: "Almarai_700Bold", marginBottom: 8 },
  emptyHint:      { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_400Regular" },
});
