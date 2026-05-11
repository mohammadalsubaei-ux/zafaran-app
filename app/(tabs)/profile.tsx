import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useFonts, Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular } from "@expo-google-fonts/tajawal";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Tajawal_900Black, Tajawal_700Bold, Tajawal_400Regular });

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
  }, []);

  const handleLogout = () => {
    Alert.alert("خروج", "تبي تطلع من حسابك؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم", style: "destructive", onPress: () => {
        AsyncStorage.removeItem("user").then(() => {
          router.replace("/login");
        });
      }},
    ], { cancelable: true });
  };

  const getRoleInfo = () => {
    if (user?.role === "chef") return { label: "طباخة", emoji: "👩‍🍳", color: "#F0A500" };
    if (user?.role === "driver") return { label: "مندوب توصيل", emoji: "🚗", color: "#2196F3" };
    return { label: "عميل", emoji: "👤", color: "#4CAF50" };
  };

  const roleInfo = getRoleInfo();

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>حسابي</Text>
        </View>

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarEmoji}>{roleInfo.emoji}</Text>
          </View>
          <Text style={s.name}>{user?.full_name}</Text>
          <Text style={s.phone}>{user?.phone}</Text>
          <View style={[s.roleBadge, { backgroundColor: roleInfo.color + "22", borderColor: roleInfo.color + "44" }]}>
            <Text style={[s.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>الخدمات</Text>

          {user?.role === "chef" && (
            <TouchableOpacity style={s.menuItem} onPress={() => router.push("/dashboard")}>
              <Text style={s.menuArrow}>←</Text>
              <View style={s.menuInfo}>
                <Text style={s.menuLabel}>لوحة الطباخة</Text>
                <Text style={s.menuSub}>إدارة طلباتك ووجباتك</Text>
              </View>
              <Text style={s.menuEmoji}>👩‍🍳</Text>
            </TouchableOpacity>
          )}

          {user?.role === "driver" && (
            <TouchableOpacity style={s.menuItem} onPress={() => router.push("/driver")}>
              <Text style={s.menuArrow}>←</Text>
              <View style={s.menuInfo}>
                <Text style={s.menuLabel}>لوحة المندوب</Text>
                <Text style={s.menuSub}>إدارة توصيلاتك</Text>
              </View>
              <Text style={s.menuEmoji}>🚗</Text>
            </TouchableOpacity>
          )}

         <TouchableOpacity style={s.menuItem} onPress={() => router.push("/wallet")}>
  <Text style={s.menuArrow}>←</Text>
  <View style={s.menuInfo}>
    <Text style={s.menuLabel}>محفظتي</Text>
    <Text style={s.menuSub}>رصيدك وسجل معاملاتك</Text>
  </View>
  <Text style={s.menuEmoji}>💰</Text>
</TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>الإعدادات</Text>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>اللغة</Text>
              <Text style={s.menuSub}>العربية</Text>
            </View>
            <Text style={s.menuEmoji}>🌍</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>المنطقة</Text>
              <Text style={s.menuSub}>القصيم، المملكة العربية السعودية</Text>
            </View>
            <Text style={s.menuEmoji}>📍</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>الإشعارات</Text>
              <Text style={s.menuSub}>مفعّلة</Text>
            </View>
            <Text style={s.menuEmoji}>🔔</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>عن التطبيق</Text>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>سياسة الخصوصية</Text>
            </View>
            <Text style={s.menuEmoji}>🔒</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>الشروط والأحكام</Text>
            </View>
            <Text style={s.menuEmoji}>📄</Text>
          </TouchableOpacity>

          <View style={s.menuItem}>
            <Text style={s.menuArrow}></Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>إصدار التطبيق</Text>
              <Text style={s.menuSub}>v1.0.0</Text>
            </View>
            <Text style={s.menuEmoji}>🍲</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>تسجيل الخروج 🚪</Text>
        </TouchableOpacity>

        <Text style={s.footer}>زعفران · أكل بيتي · طعم أصيل</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: "#0E0700" },
  header:       { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  headerTitle:  { fontSize: 22, fontWeight: "900", color: "#FDF0DC", textAlign: "right", fontFamily: "Tajawal_900Black" },
  profileCard:  { alignItems: "center", padding: 24, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  avatarWrap:   { width: 90, height: 90, borderRadius: 28, backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 2, borderColor: "rgba(240,165,0,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarEmoji:  { fontSize: 44 },
  name:         { fontSize: 22, fontWeight: "900", color: "#FDF0DC", fontFamily: "Tajawal_900Black", marginBottom: 6 },
  phone:        { fontSize: 14, color: "#8A6030", fontFamily: "Tajawal_400Regular", marginBottom: 12 },
  roleBadge:    { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 50, borderWidth: 1 },
  roleText:     { fontSize: 13, fontWeight: "700", fontFamily: "Tajawal_700Bold" },
  section:      { margin: 16, marginBottom: 0, backgroundColor: "#1C1000", borderRadius: 18, borderWidth: 1, borderColor: "rgba(240,165,0,0.08)", overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#5A3A18", letterSpacing: 2, padding: 14, paddingBottom: 8, textAlign: "right", fontFamily: "Tajawal_700Bold" },
  menuItem:     { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.06)" },
  menuEmoji:    { fontSize: 22, marginLeft: 12 },
  menuInfo:     { flex: 1 },
  menuLabel:    { fontSize: 15, fontWeight: "700", color: "#FDF0DC", textAlign: "right", fontFamily: "Tajawal_700Bold" },
  menuSub:      { fontSize: 12, color: "#8A6030", textAlign: "right", marginTop: 2, fontFamily: "Tajawal_400Regular" },
  menuArrow:    { fontSize: 16, color: "#5A3A18", marginRight: 4 },
  logoutBtn:    { margin: 16, marginTop: 20, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  logoutText:   { color: "#E53935", fontSize: 15, fontWeight: "800", fontFamily: "Tajawal_700Bold" },
  footer:       { textAlign: "center", color: "#2A1400", fontSize: 12, padding: 20, fontFamily: "Tajawal_400Regular" },
});