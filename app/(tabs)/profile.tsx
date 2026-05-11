import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
  }, []);

  const handleLogout = () => {
    Alert.alert("خروج", "تبي تخرج من حسابك؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم", style: "destructive", onPress: () => {
        AsyncStorage.removeItem("user").then(() => {
          router.replace("/login");
        });
      }},
    ], { cancelable: true });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>👤 حسابي</Text>
      </View>

      <View style={s.card}>
        <Text style={s.name}>{user?.full_name}</Text>
        <Text style={s.phone}>📱 {user?.phone}</Text>
        <Text style={s.role}>
          {user?.role === "chef" ? "👩‍🍳 طباخة" : user?.role === "driver" ? "🚗 مندوب" : "👤 عميل"}
        </Text>
      </View>

      {user?.role === "chef" && (
        <TouchableOpacity style={s.btn} onPress={() => router.push("/dashboard")}>
          <Text style={s.btnText}>👩‍🍳 لوحة الطباخة</Text>
        </TouchableOpacity>
      )}

      {user?.role === "driver" && (
        <TouchableOpacity style={s.btn} onPress={() => router.push("/driver")}>
          <Text style={s.btnText}>🚗 لوحة المندوب</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>خروج 🚪</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: "#0E0700" },
  header:     { padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:      { fontSize: 22, fontWeight: "900", color: "#F0A500", textAlign: "right" },
  card:       { margin: 16, backgroundColor: "#1C1000", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  name:       { fontSize: 22, fontWeight: "900", color: "#FDF0DC", textAlign: "right", marginBottom: 8 },
  phone:      { fontSize: 15, color: "#8A6030", textAlign: "right", marginBottom: 6 },
  role:       { fontSize: 14, color: "#F0A500", textAlign: "right", fontWeight: "700" },
  btn:        { margin: 16, marginTop: 0, backgroundColor: "rgba(240,165,0,0.12)", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)" },
  btnText:    { color: "#F0A500", fontSize: 15, fontWeight: "800" },
  logoutBtn:  { margin: 16, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  logoutText: { color: "#E53935", fontSize: 15, fontWeight: "800" },
});