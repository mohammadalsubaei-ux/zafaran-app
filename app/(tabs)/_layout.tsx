import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0E0700",
          borderTopColor: "rgba(240,165,0,0.15)",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#F0A500",
        tabBarInactiveTintColor: "#5A3A18",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}>

      <Tabs.Screen name="index" options={{ title: "طباخين", tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍲</Text> }} />
      <Tabs.Screen name="pastries" options={{ title: "فطائر", tabBarIcon: () => <Text style={{ fontSize: 22 }}>🥐</Text> }} />
      <Tabs.Screen name="sweets" options={{ title: "حلويات", tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍰</Text> }} />
      <Tabs.Screen name="orders" options={{ title: "طلباتي", tabBarIcon: () => <Text style={{ fontSize: 22 }}>📦</Text> }} />
      <Tabs.Screen name="profile" options={{ title: "حسابي", tabBarIcon: () => <Text style={{ fontSize: 22 }}>👤</Text> }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}