import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";
import { useLang } from "@/context/LanguageContext";

const T: any = {
  ar: {
    myAccount:    "حسابي",
    services:     "الخدمات",
    chefDash:     "لوحة الشيف",
    chefDashSub:  "إدارة طلباتك ووجباتك",
    driverDash:   "لوحة المندوب",
    driverDashSub:"إدارة توصيلاتك",
    myWallet:     "محفظتي",
    myWalletSub:  "رصيدك وسجل معاملاتك",
    myAddresses:  "عناويني",
    myAddressesSub:"عناوين التوصيل المحفوظة",
    settings:     "الإعدادات",
    language:     "اللغة",
    languageVal:  "العربية 🇸🇦",
    langSwitch:   "EN",
    region:       "المنطقة",
    regionVal:    "القصيم، المملكة العربية السعودية",
    notifications:"الإشعارات",
    notifVal:     "مفعّلة",
    about:        "عن التطبيق",
    privacy:      "سياسة الخصوصية",
    terms:        "الشروط والأحكام",
    version:      "إصدار التطبيق",
    logout:       "تسجيل الخروج 🚪",
    logoutTitle:  "خروج",
    logoutMsg:    "تبي تطلع من حسابك؟",
    yes:          "نعم",
    no:           "لا",
    footer:       "زعفران · أكل بيتي · طعم أصيل",
    customer:     "عميل",
    chefRole:     "شيف",
    driver:       "مندوب توصيل",
  },
  en: {
    myAccount:    "My Account",
    services:     "Services",
    chefDash:     "Chef Dashboard",
    chefDashSub:  "Manage your orders and meals",
    driverDash:   "Driver Dashboard",
    driverDashSub:"Manage your deliveries",
    myWallet:     "My Wallet",
    myWalletSub:  "Balance and transaction history",
    myAddresses:  "My Addresses",
    myAddressesSub:"Saved delivery addresses",
    settings:     "Settings",
    language:     "Language",
    languageVal:  "English 🇺🇸",
    langSwitch:   "ع",
    region:       "Region",
    regionVal:    "Al-Qassim, Saudi Arabia",
    notifications:"Notifications",
    notifVal:     "Enabled",
    about:        "About",
    privacy:      "Privacy Policy",
    terms:        "Terms & Conditions",
    version:      "App Version",
    logout:       "Logout 🚪",
    logoutTitle:  "Logout",
    logoutMsg:    "Are you sure you want to logout?",
    yes:          "Yes",
    no:           "No",
    footer:       "Zafaran · Home Food · Authentic Taste",
    customer:     "Customer",
    chefRole:     "Chef",
    driver:       "Delivery Driver",
  },
};

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const { lang, toggleLang } = useLang();
  const t = T[lang] || T.ar;
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) setUser(JSON.parse(u));
    });
  }, []);

  const handleLogout = () => {
    Alert.alert(t.logoutTitle, t.logoutMsg, [
      { text: t.no, style: "cancel" },
      { text: t.yes, style: "destructive", onPress: () => {
        AsyncStorage.removeItem("user").then(() => router.replace("/login"));
      }},
    ], { cancelable: true });
  };

  const getRoleInfo = () => {
    if (user?.role === "chef")   return { label: user?.gender === "female" ? t.chefRole + "ة" : t.chefRole, emoji: "👨‍🍳", color: "#F0A500" };
    if (user?.role === "driver") return { label: t.driver,   emoji: "🚗",   color: "#2196F3" };
    return                               { label: t.customer, emoji: "👤",   color: "#4CAF50" };
  };

  const roleInfo = getRoleInfo();
  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.headerTitle}>{t.myAccount}</Text>
        </View>

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

        {/* الخدمات */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.services}</Text>

          {user?.role === "chef" && (
            <TouchableOpacity style={s.menuItem} onPress={() => router.push("/dashboard")}>
              <Text style={s.menuArrow}>←</Text>
              <View style={s.menuInfo}>
                <Text style={s.menuLabel}>{t.chefDash}</Text>
                <Text style={s.menuSub}>{t.chefDashSub}</Text>
              </View>
              <Text style={s.menuEmoji}>👩‍🍳</Text>
            </TouchableOpacity>
          )}

          {user?.role === "driver" && (
            <TouchableOpacity style={s.menuItem} onPress={() => router.push("/driver")}>
              <Text style={s.menuArrow}>←</Text>
              <View style={s.menuInfo}>
                <Text style={s.menuLabel}>{t.driverDash}</Text>
                <Text style={s.menuSub}>{t.driverDashSub}</Text>
              </View>
              <Text style={s.menuEmoji}>🚗</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/(tabs)/wallet")}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.myWallet}</Text>
              <Text style={s.menuSub}>{t.myWalletSub}</Text>
            </View>
            <Text style={s.menuEmoji}>💰</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/addresses")}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.myAddresses}</Text>
              <Text style={s.menuSub}>{t.myAddressesSub}</Text>
            </View>
            <Text style={s.menuEmoji}>📍</Text>
          </TouchableOpacity>
        </View>

        {/* الإعدادات */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.settings}</Text>

          <TouchableOpacity style={s.menuItem} onPress={toggleLang}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.language}</Text>
              <Text style={s.menuSub}>{t.languageVal}</Text>
            </View>
            <View style={s.langBadge}>
              <Text style={s.langBadgeText}>{t.langSwitch}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.region}</Text>
              <Text style={s.menuSub}>{t.regionVal}</Text>
            </View>
            <Text style={s.menuEmoji}>📍</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.notifications}</Text>
              <Text style={s.menuSub}>{t.notifVal}</Text>
            </View>
            <Text style={s.menuEmoji}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* عن التطبيق */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.about}</Text>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.privacy}</Text>
            </View>
            <Text style={s.menuEmoji}>🔒</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <Text style={s.menuArrow}>←</Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.terms}</Text>
            </View>
            <Text style={s.menuEmoji}>📄</Text>
          </TouchableOpacity>

          <View style={s.menuItem}>
            <Text style={s.menuArrow}></Text>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{t.version}</Text>
              <Text style={s.menuSub}>v1.0.0</Text>
            </View>
            <Text style={s.menuEmoji}>🍲</Text>
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>{t.logout}</Text>
        </TouchableOpacity>

        <Text style={s.footer}>{t.footer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#0E0700" },
  header:        { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  headerTitle:   { fontSize: 22, fontWeight: "900", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_800ExtraBold" },
  profileCard:   { alignItems: "center", padding: 24, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  avatarWrap:    { width: 90, height: 90, borderRadius: 28, backgroundColor: "rgba(240,165,0,0.1)", borderWidth: 2, borderColor: "rgba(240,165,0,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarEmoji:   { fontSize: 44 },
  name:          { fontSize: 22, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold", marginBottom: 6 },
  phone:         { fontSize: 14, color: "#8A6030", fontFamily: "Almarai_400Regular", marginBottom: 12 },
  roleBadge:     { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 50, borderWidth: 1 },
  roleText:      { fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  section:       { margin: 16, marginBottom: 0, backgroundColor: "#1C1000", borderRadius: 18, borderWidth: 1, borderColor: "rgba(240,165,0,0.08)", overflow: "hidden" },
  sectionTitle:  { fontSize: 11, fontWeight: "700", color: "#5A3A18", letterSpacing: 2, padding: 14, paddingBottom: 8, textAlign: "right", fontFamily: "Almarai_700Bold" },
  menuItem:      { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.06)" },
  menuEmoji:     { fontSize: 22, marginLeft: 12 },
  menuInfo:      { flex: 1 },
  menuLabel:     { fontSize: 15, fontWeight: "700", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold" },
  menuSub:       { fontSize: 12, color: "#8A6030", textAlign: "right", marginTop: 2, fontFamily: "Almarai_400Regular" },
  menuArrow:     { fontSize: 16, color: "#5A3A18", marginRight: 4 },
  langBadge:     { backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(240,165,0,0.3)", marginLeft: 12 },
  langBadgeText: { fontSize: 13, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_700Bold" },
  logoutBtn:     { margin: 16, marginTop: 20, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  logoutText:    { color: "#E53935", fontSize: 15, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  footer:        { textAlign: "center", color: "#2A1400", fontSize: 12, padding: 20, fontFamily: "Almarai_400Regular" },
});
