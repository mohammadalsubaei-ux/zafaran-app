import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView
} from "react-native";
import Svg, { Path, Ellipse } from "react-native-svg";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

function BowlSVG() {
  return (
    <Svg width={60} height={66} viewBox="0 0 100 110">
      <Path d="M30,22 C27,14 33,8 30,22 C27,32 33,38 30,48" stroke="#1C0F00" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.6}/>
      <Path d="M50,18 C47,8 53,12 50,24 C47,36 53,42 50,52" stroke="#1C0F00" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity={0.8}/>
      <Path d="M70,22 C67,14 73,8 70,22 C67,32 73,38 70,48" stroke="#1C0F00" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.6}/>
      <Ellipse cx="50" cy="58" rx="44" ry="10" fill="#1C0F00" opacity={0.9}/>
      <Path d="M6,58 Q6,95 50,99 Q94,95 94,58 Z" fill="#F0A500" opacity={0.3}/>
      <Path d="M6,58 Q6,50 50,47 Q94,50 94,58" fill="#1C0F00" opacity={0.2}/>
      <Ellipse cx="50" cy="102" rx="42" ry="7" fill="none" stroke="#1C0F00" strokeWidth="2" opacity={0.4}/>
    </Svg>
  );
}

export default function LoginScreen() {
  const [step, setStep]       = useState<"login" | "register" | "chef_register">("login");
  const [phone, setPhone]     = useState("");
  const [name, setName]       = useState("");
  const [city, setCity]       = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });
  if (!fontsLoaded) return null;

  // ━━━ دخول ━━━
  const handleLogin = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) { Alert.alert("تنبيه", "أدخل رقم جوال صحيح"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const json = await res.json();
      if (json.success) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        router.replace("/(tabs)");
      } else {
        Alert.alert("رقم غير مسجل", "ما عندك حساب؟ سجّل الآن");
      }
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالسيرفر"); }
    finally { setLoading(false); }
  };

  // ━━━ تسجيل عميل ━━━
  const handleRegister = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) { Alert.alert("تنبيه", "أدخل رقم جوال صحيح"); return; }
    if (!name.trim()) { Alert.alert("تنبيه", "أدخل اسمك"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, full_name: name.trim(), role: "customer" }),
      });
      const json = await res.json();
      if (json.success) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        router.replace("/(tabs)");
      } else { Alert.alert("خطأ", json.message || "حدث خطأ"); }
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالسيرفر"); }
    finally { setLoading(false); }
  };

  // ━━━ تسجيل شيفة ━━━
  const handleChefRegister = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) { Alert.alert("تنبيه", "أدخل رقم جوال صحيح"); return; }
    if (!name.trim()) { Alert.alert("تنبيه", "أدخل اسمك"); return; }
    if (!city.trim()) { Alert.alert("تنبيه", "أدخل مدينتك"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, full_name: name.trim(), role: "chef", city: city.trim(), neighborhood: neighborhood.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        router.replace("/(tabs)");
      } else { Alert.alert("خطأ", json.message || "حدث خطأ"); }
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالسيرفر"); }
    finally { setLoading(false); }
  };

  // ━━━ شاشة الدخول ━━━
  if (step === "login") {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll}>

            {/* اللوقو */}
            <View style={s.logoWrap}>
              <View style={s.logoBox}>
                <BowlSVG />
              </View>
              <Text style={s.logoName}>زعفران</Text>
            </View>

            {/* الفورم */}
            <View style={s.form}>
              <Text style={s.formTitle}>أهلاً بك</Text>
              <Text style={s.formHint}>أدخل رقم جوالك للدخول</Text>

              <Text style={s.label}>رقم الجوال</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="05X XXX XXXX"
                  placeholderTextColor="#5A3A18"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  textAlign="right"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#1C0F00" /> : <Text style={s.btnText}>دخول 🚀</Text>}
              </TouchableOpacity>

              {/* تسجيل جديد */}
              <TouchableOpacity style={s.switchBtn} onPress={() => setStep("register")}>
                <Text style={s.switchText}>ما عندك حساب؟ سجّل الآن</Text>
              </TouchableOpacity>

              {/* انضم كشيفة */}
              <View style={s.divider}><View style={s.dividerLine}/><Text style={s.dividerText}>أو</Text><View style={s.dividerLine}/></View>

              <TouchableOpacity style={s.chefBtn} onPress={() => setStep("chef_register")}>
                <Text style={s.chefBtnText}>👩‍🍳 انضم كشيف / شيفة</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ━━━ شاشة تسجيل عميل ━━━
  if (step === "register") {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll}>
            <View style={s.logoWrap}>
              <View style={s.logoBox}><BowlSVG /></View>
              <Text style={s.logoName}>زعفران</Text>
            </View>
            <View style={s.form}>
              <Text style={s.formTitle}>حساب جديد</Text>
              <Text style={s.formHint}>سجّل حسابك مجاناً</Text>

              <Text style={s.label}>الاسم</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="اسمك الكامل" placeholderTextColor="#5A3A18" value={name} onChangeText={setName} textAlign="right"/>
              </View>

              <Text style={s.label}>رقم الجوال</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="05X XXX XXXX" placeholderTextColor="#5A3A18" keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" maxLength={10}/>
              </View>

              <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#1C0F00" /> : <Text style={s.btnText}>تسجيل ✨</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.switchBtn} onPress={() => setStep("login")}>
                <Text style={s.switchText}>عندك حساب؟ سجّل دخول</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ━━━ شاشة تسجيل شيفة ━━━
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.logoWrap}>
            <View style={s.logoBox}><BowlSVG /></View>
            <Text style={s.logoName}>زعفران</Text>
            <Text style={s.chefTag}>👩‍🍳 انضم كشيف / شيفة</Text>
          </View>
          <View style={s.form}>
            <Text style={s.formTitle}>سجّل مطبخك</Text>
            <Text style={s.formHint}>ابدأ بيع وجباتك البيتية</Text>

            <Text style={s.label}>الاسم</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="اسمك الكامل" placeholderTextColor="#5A3A18" value={name} onChangeText={setName} textAlign="right"/>
            </View>

            <Text style={s.label}>رقم الجوال</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="05X XXX XXXX" placeholderTextColor="#5A3A18" keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" maxLength={10}/>
            </View>

            <Text style={s.label}>المدينة</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="بريدة، عنيزة، ..." placeholderTextColor="#5A3A18" value={city} onChangeText={setCity} textAlign="right"/>
            </View>

            <Text style={s.label}>الحي</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="حي النرجس، ..." placeholderTextColor="#5A3A18" value={neighborhood} onChangeText={setNeighborhood} textAlign="right"/>
            </View>

            <TouchableOpacity style={s.btn} onPress={handleChefRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#1C0F00" /> : <Text style={s.btnText}>سجّل مطبخي ✨</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.switchBtn} onPress={() => setStep("login")}>
              <Text style={s.switchText}>← رجوع</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: "#0E0700" },
  scroll:       { flexGrow: 1, padding: 24, justifyContent: "center" },
  logoWrap:     { alignItems: "center", marginBottom: 32 },
  logoBox:      { width: 100, height: 100, borderRadius: 30, backgroundColor: "#F0A500", alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#F0A500", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
  logoName:     { fontSize: 38, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  chefTag:      { fontSize: 14, color: "#F0A500", fontFamily: "Almarai_700Bold", marginTop: 6 },
  form:         { backgroundColor: "#1C1000", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  formTitle:    { fontSize: 24, fontWeight: "900", color: "#FDF0DC", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_800ExtraBold" },
  formHint:     { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 20, fontFamily: "Almarai_400Regular" },
  label:        { fontSize: 11, fontWeight: "700", color: "#C97D20", letterSpacing: 2, textAlign: "right", marginBottom: 6, fontFamily: "Almarai_700Bold" },
  inputWrap:    { backgroundColor: "#251400", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 14, marginBottom: 14 },
  input:        { height: 50, color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_400Regular" },
  btn:          { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 4 },
  btnText:      { fontSize: 17, fontWeight: "900", color: "#1C0F00", fontFamily: "Almarai_800ExtraBold" },
  switchBtn:    { marginTop: 16, alignItems: "center" },
  switchText:   { color: "#F0A500", fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  divider:      { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: "rgba(240,165,0,0.15)" },
  dividerText:  { color: "#5A3A18", fontSize: 12, fontFamily: "Almarai_400Regular" },
  chefBtn:      { backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.25)" },
  chefBtnText:  { fontSize: 15, fontWeight: "700", color: "#F0A500", fontFamily: "Almarai_700Bold" },
});
