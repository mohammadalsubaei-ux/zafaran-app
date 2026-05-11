import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView
} from "react-native";

const API = "https://zafaran-backend-production.up.railway.app";

export default function LoginScreen() {
  const [step, setStep]     = useState<"role" | "login" | "register">("role");
  const [role, setRole]     = useState("");
  const [phone, setPhone]   = useState("");
  const [name, setName]     = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    const cleanPhone = String(phone || "").trim();
    if (cleanPhone.length < 10) {
      Alert.alert("تنبيه", "أدخل رقم جوال صحيح");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: cleanPhone }),
      });
      const json = await res.json();
      if (json.success) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        router.replace("/(tabs)");
      } else {
        Alert.alert("خطأ", json.message || "رقم الجوال غير مسجل");
      }
    } catch (e) {
      Alert.alert("خطأ", "تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const cleanPhone = String(phone || "").trim();
    if (cleanPhone.length < 10) {
      Alert.alert("تنبيه", "أدخل رقم جوال صحيح");
      return;
    }
    if (!name.trim()) {
      Alert.alert("تنبيه", "أدخل اسمك");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: cleanPhone, full_name: name.trim(), role }),
      });
      const json = await res.json();
      if (json.success) {
        if (role === "customer") {
          await AsyncStorage.setItem("user", JSON.stringify(json.data));
          router.replace("/(tabs)");
        } else {
          Alert.alert(
            "✅ تم التسجيل!",
            role === "chef"
              ? "طلبك قيد المراجعة — سيتم التواصل معك خلال 24 ساعة"
              : "طلبك قيد المراجعة — سيتم التواصل معك للتوثيق",
            [{ text: "حسناً", onPress: () => setStep("role") }]
          );
        }
      } else {
        Alert.alert("خطأ", json.message || "حدث خطأ");
      }
    } catch (e) {
      Alert.alert("خطأ", "تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  // شاشة اختيار الدور
  if (step === "role") {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.logoWrap}>
            <View style={s.logoBox}>
              <Text style={s.logoEmoji}>🍲</Text>
            </View>
            <Text style={s.logoName}>زعفران</Text>
            <Text style={s.logoTag}>أكل بيتي · طعم أصيل</Text>
          </View>

          <Text style={s.roleTitle}>أنت...؟</Text>
          <Text style={s.roleHint}>اختر دورك للمتابعة</Text>

          <TouchableOpacity style={s.roleCard} onPress={() => { setRole("customer"); setStep("login"); }}>
            <Text style={s.roleEmoji}>👤</Text>
            <View style={s.roleInfo}>
              <Text style={s.roleLabel}>عميل</Text>
              <Text style={s.roleDesc}>أبي أطلب أكل بيتي</Text>
            </View>
            <Text style={s.roleArrow}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.roleCard} onPress={() => { setRole("chef"); setStep("login"); }}>
            <Text style={s.roleEmoji}>👩‍🍳</Text>
            <View style={s.roleInfo}>
              <Text style={s.roleLabel}>طباخة / بائع</Text>
              <Text style={s.roleDesc}>أبي أبيع وجباتي البيتية</Text>
            </View>
            <Text style={s.roleArrow}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.roleCard} onPress={() => { setRole("driver"); setStep("login"); }}>
            <Text style={s.roleEmoji}>🚗</Text>
            <View style={s.roleInfo}>
              <Text style={s.roleLabel}>مندوب توصيل</Text>
              <Text style={s.roleDesc}>أبي أوصل الطلبات</Text>
            </View>
            <Text style={s.roleArrow}>←</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // شاشة الدخول والتسجيل
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.kav}>
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>🍲</Text>
          </View>
          <Text style={s.logoName}>زعفران</Text>
          <Text style={s.roleTag}>
            {role === "customer" ? "👤 عميل" : role === "chef" ? "👩‍🍳 طباخة" : "🚗 مندوب"}
          </Text>
        </View>

        <View style={s.form}>
          <Text style={s.welcome}>{step === "login" ? "مرحباً بك 👋" : "حساب جديد 🎉"}</Text>
          <Text style={s.hint}>{step === "login" ? "سجّل دخولك للمتابعة" : "سجّل حسابك مجاناً"}</Text>

          {step === "register" && (
            <View>
              <Text style={s.label}>الاسم</Text>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>👤</Text>
                <TextInput
                  style={s.input}
                  placeholder="اسمك الكامل"
                  placeholderTextColor="#8A6030"
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>
            </View>
          )}

          <Text style={s.label}>رقم الجوال</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>📱</Text>
            <TextInput
              style={s.input}
              placeholder="05X XXX XXXX"
              placeholderTextColor="#8A6030"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              textAlign="right"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={s.btn}
            onPress={step === "login" ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#1C0F00" />
              : <Text style={s.btnText}>{step === "login" ? "دخول 🚀" : "تسجيل ✨"}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.switchBtn} onPress={() => setStep(step === "login" ? "register" : "login")}>
            <Text style={s.switchText}>
              {step === "login" ? "ما عندك حساب؟ سجّل الآن" : "عندك حساب؟ سجّل دخول"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.backBtn} onPress={() => setStep("role")}>
            <Text style={s.backText}>← تغيير الدور</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: "#0E0700" },
  scroll:     { flexGrow: 1, padding: 24, justifyContent: "center" },
  kav:        { flex: 1, justifyContent: "center", padding: 24 },
  logoWrap:   { alignItems: "center", marginBottom: 32 },
  logoBox:    { width: 88, height: 88, borderRadius: 26, backgroundColor: "#F0A500", alignItems: "center", justifyContent: "center", marginBottom: 14, shadowColor: "#F0A500", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
  logoEmoji:  { fontSize: 42 },
  logoName:   { fontSize: 36, fontWeight: "900", color: "#FDF0DC", marginBottom: 4 },
  logoTag:    { fontSize: 12, color: "#C97D20", letterSpacing: 3 },
  roleTag:    { fontSize: 14, color: "#F0A500", fontWeight: "700", marginTop: 4 },
  roleTitle:  { fontSize: 28, fontWeight: "900", color: "#FDF0DC", textAlign: "center", marginBottom: 8 },
  roleHint:   { fontSize: 13, color: "#8A6030", textAlign: "center", marginBottom: 28 },
  roleCard:   { backgroundColor: "#1C1000", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", flexDirection: "row-reverse", alignItems: "center", gap: 14 },
  roleEmoji:  { fontSize: 32 },
  roleInfo:   { flex: 1 },
  roleLabel:  { fontSize: 17, fontWeight: "900", color: "#FDF0DC", textAlign: "right" },
  roleDesc:   { fontSize: 12, color: "#8A6030", textAlign: "right", marginTop: 3 },
  roleArrow:  { fontSize: 18, color: "#5A3A18" },
  form:       { backgroundColor: "#1C1000", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  welcome:    { fontSize: 22, fontWeight: "900", color: "#FDF0DC", textAlign: "right", marginBottom: 4 },
  hint:       { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 20 },
  label:      { fontSize: 11, fontWeight: "700", color: "#C97D20", letterSpacing: 2, textAlign: "right", marginBottom: 6 },
  inputWrap:  { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#251400", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 14, marginBottom: 14 },
  inputIcon:  { fontSize: 16, marginLeft: 8 },
  input:      { flex: 1, height: 50, color: "#FDF0DC", fontSize: 15 },
  btn:        { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 4 },
  btnText:    { fontSize: 17, fontWeight: "900", color: "#1C0F00" },
  switchBtn:  { marginTop: 16, alignItems: "center" },
  switchText: { color: "#F0A500", fontSize: 13, fontWeight: "700" },
  backBtn:    { marginTop: 10, alignItems: "center" },
  backText:   { color: "#8A6030", fontSize: 12 },
});
