import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const [user, setUser] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      setUser(u);
      setChecked(true);
    });
  }, []);

  if (!checked) return <View style={{ flex: 1, backgroundColor: "#140B00" }}><ActivityIndicator color="#F0A500" style={{ marginTop: 100 }} /></View>;
  if (user) return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}