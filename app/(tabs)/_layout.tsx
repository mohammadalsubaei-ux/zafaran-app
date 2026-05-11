import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, SafeAreaView } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '@/context/LanguageContext';
import { useFonts, Almarai_800ExtraBold, Almarai_400Regular, Almarai_700Bold } from '@expo-google-fonts/almarai';
import Svg, { Path, Ellipse } from 'react-native-svg';
import i18n from '@/i18n';

// ━━━ صحن SVG صغير ━━━
function BowlSVG() {
  return (
    <Svg width={38} height={42} viewBox="0 0 100 110">
      <Path d="M30,22 C27,14 33,8 30,22 C27,32 33,38 30,48"
        stroke="#F0A500" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.5}/>
      <Path d="M50,18 C47,8 53,12 50,24 C47,36 53,42 50,52"
        stroke="#F0A500" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity={0.85}/>
      <Path d="M70,22 C67,14 73,8 70,22 C67,32 73,38 70,48"
        stroke="#F0A500" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.5}/>
      <Ellipse cx="50" cy="58" rx="44" ry="10" fill="#F0A500" opacity={0.9}/>
      <Path d="M6,58 Q6,95 50,99 Q94,95 94,58 Z"
        fill="#1C1000" stroke="#F0A500" strokeWidth="2.5"/>
      <Path d="M6,58 Q6,50 50,47 Q94,50 94,58" fill="#F0A500" opacity={0.2}/>
      <Ellipse cx="50" cy="102" rx="42" ry="7"
        fill="none" stroke="#F0A500" strokeWidth="2" opacity={0.45}/>
    </Svg>
  );
}

// ━━━ الهيدر الثابت ━━━
function ZafaranHeader() {
  const [user, setUser]       = useState<any>(null);
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => { if (u) setUser(JSON.parse(u)); });
    AsyncStorage.getItem("last_address").then(a => { if (a) setAddress(a); });
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "";

  return (
    <View style={h.container}>
      {/* يمين — اللوقو */}
      <View style={h.logoWrap}>
        <BowlSVG />
        <View style={h.logoText}>
          <Text style={h.logoName}>زعفران</Text>
          <Text style={h.logoSlogan}>أكل بيتي · طعم أصيل</Text>
        </View>
      </View>

      {/* يسار — الترحيب والعنوان */}
      <View style={h.greetWrap}>
        <Text style={h.greetText}>
          {firstName ? `أهلاً ${firstName} 👋` : "أهلاً بك 👋"}
        </Text>
        {address ? (
          <View style={h.addressRow}>
            <Text style={h.addressText} numberOfLines={1}>{address}</Text>
            <Text style={h.addressIcon}>📍</Text>
          </View>
        ) : (
          <View style={h.addressRow}>
            <Text style={h.addressText}>حدد موقعك</Text>
            <Text style={h.addressIcon}>📍</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { lang } = useLang();

  const [fontsLoaded] = useFonts({ Almarai_800ExtraBold, Almarai_400Regular, Almarai_700Bold });

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#0E0700" }}>
      {/* الهيدر الثابت */}
      <SafeAreaView style={{ backgroundColor: "#0E0700" }}>
        <ZafaranHeader />
      </SafeAreaView>

      {/* التابات */}
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
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            fontFamily: "Almarai_700Bold",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: i18n.t("cooking"), tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍲</Text> }}
        />
        <Tabs.Screen
          name="sweets"
          options={{ title: i18n.t("sweets"), tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍰</Text> }}
        />
        <Tabs.Screen
          name="pastries"
          options={{ title: i18n.t("pastries"), tabBarIcon: () => <Text style={{ fontSize: 22 }}>🥐</Text> }}
        />
        <Tabs.Screen
          name="orders"
          options={{ title: i18n.t("orders"), tabBarIcon: () => <Text style={{ fontSize: 22 }}>📦</Text> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: i18n.t("account"), tabBarIcon: () => <Text style={{ fontSize: 22 }}>👤</Text> }}
        />

        {/* مخفية */}
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="chef"    options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const h = StyleSheet.create({
  container:   {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240,165,0,0.1)",
    backgroundColor: "#0E0700",
  },

  // اللوقو
  logoWrap:    { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  logoText:    { flexDirection: "column", alignItems: "flex-end" },
  logoName:    {
    fontSize: 24,
    fontWeight: "900",
    color: "#F0A500",
    fontFamily: "Almarai_800ExtraBold",
    lineHeight: 26,
  },
  logoSlogan:  {
    fontSize: 8,
    color: "#8A6030",
    fontFamily: "Almarai_400Regular",
    letterSpacing: 2,
  },

  // الترحيب
  greetWrap:   { alignItems: "flex-start" },
  greetText:   {
    fontSize: 14,
    fontWeight: "700",
    color: "#FDF0DC",
    fontFamily: "Almarai_700Bold",
  },
  addressRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  addressIcon: { fontSize: 11 },
  addressText: {
    fontSize: 11,
    color: "#8A6030",
    fontFamily: "Almarai_400Regular",
    maxWidth: 130,
  },
});
