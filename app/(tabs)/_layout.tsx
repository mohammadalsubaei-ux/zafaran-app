import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import React from 'react';
import { useLang } from '@/context/LanguageContext';
import i18n from '@/i18n';

export default function TabLayout() {
  const { lang } = useLang();

  return (
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
      <Tabs.Screen name="wallet"  options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="chef"    options={{ href: null }} />
    </Tabs>
  );
}
