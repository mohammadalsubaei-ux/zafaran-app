import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView, Modal, FlatList
} from "react-native";
import Svg, { Path, Ellipse } from "react-native-svg";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";
import { savePushToken } from "@/utils/notifications";

const API = "https://zafaran-backend-production.up.railway.app";

const ROLE_ROUTES: Record<string, string> = {
  chef:     "/dashboard/chef",
  driver:   "/dashboard/driver",
  customer: "/(tabs)",
};

function LogoSVG() {
  return (
    <Svg width={60} height={66} viewBox="0 0 100 110">
      <Path d="M30,22 C27,14 33,8 30,22 C27,32 33,38 30,48" stroke="#1C0F00" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.7}/>
      <Path d="M50,18 C47,8 53,12 50,24 C47,36 53,42 50,52" stroke="#1C0F00" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity={0.9}/>
      <Path d="M70,22 C67,14 73,8 70,22 C67,32 73,38 70,48" stroke="#1C0F00" strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.7}/>
      <Ellipse cx="50" cy="60" rx="44" ry="10" fill="#1C0F00" opacity={0.9}/>
      <Path d="M6,60 Q6,95 50,99 Q94,95 94,60 Z" fill="#1C0F00" opacity={0.5}/>
      <Path d="M6,60 Q6,52 50,49 Q94,52 94,60" fill="#1C0F00" opacity={0.3}/>
      <Ellipse cx="50" cy="102" rx="42" ry="7" fill="none" stroke="#1C0F00" strokeWidth="2" opacity={0.5}/>
    </Svg>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  مكوّن مستقل خارج الشاشة — تعريفه داخل LoginScreen كان يسبب
//  هدمه وإعادة بنائه مع كل حرف يُكتب، مما يلغي تركيب الحروف
//  بالكيبورد النصي ويمنع الكتابة في خانة الاسم نهائياً
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GenderPicker({ gender, setGender }: {
  gender: "male" | "female";
  setGender: (g: "male" | "female") => void;
}) {
  return (
    <View>
      <Text style={s.label}>الجنس</Text>
      <View style={s.genderRow}>
        <TouchableOpacity
          style={[s.genderBtn, gender === "male" && s.genderBtnActive]}
          onPress={() => setGender("male")}
        >
          <Text style={[s.genderLabel, gender === "male" && s.genderLabelActive]}>ذكر</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.genderBtn, gender === "female" && s.genderBtnActive]}
          onPress={() => setGender("female")}
        >
          <Text style={[s.genderLabel, gender === "female" && s.genderLabelActive]}>انثى</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  نافذة اختيار المدينة — مكوّن مشترك يُستخدم بشاشتي الشيف والمندوب
//  (كانت النافذة موجودة بشاشة المندوب فقط، وزر المدينة بشاشة الشيف معطّل)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CityPickerModal({ visible, onClose, cities, city, setCity }: {
  visible: boolean;
  onClose: () => void;
  cities: { id: number; name_ar: string }[];
  city: string;
  setCity: (c: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>اختر مدينتك</Text>
          <FlatList
            data={cities}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.cityRow}
                onPress={() => { setCity(item.name_ar); onClose(); }}
              >
                <Text style={[s.cityRowText, city === item.name_ar && { color: "#F0A500" }]}>
                  {item.name_ar}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<ActivityIndicator color="#F0A500" style={{ marginVertical: 20 }} />}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function LoginScreen() {
  const [step, setStep]                 = useState<"login" | "register" | "chef_register" | "driver_register">("login");
  const [phone, setPhone]               = useState("");
  const [name, setName]                 = useState("");
  const [gender, setGender]             = useState<"male" | "female">("male");
  const [city, setCity]                 = useState("");
  const [cities, setCities]             = useState<{ id: number; name_ar: string }[]>([]);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/cities`)
      .then((res) => res.json())
      .then((json) => { if (json?.success) setCities(json.data || []); })
      .catch(() => {});
  }, []);
  const [neighborhood, setNeighborhood] = useState("");
  const [loading, setLoading]           = useState(false);
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });
  if (!fontsLoaded) return null;

  const handleLogin = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) { Alert.alert("تنبيه", "ادخل رقم جوال صحيح"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const json = await res.json();
      if (json.success) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        savePushToken().catch(() => {});
        const route = ROLE_ROUTES[json.data.role] || "/(tabs)";
        router.replace(route as any);
      } else {
        Alert.alert("رقم غير مسجل", "ما عندك حساب؟ سجّل الآن");
      }
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالسيرفر"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (role: string) => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) { Alert.alert("تنبيه", "ادخل رقم جوال صحيح"); return; }
    if (!name.trim()) { Alert.alert("تنبيه", "ادخل اسمك"); return; }
    if ((role === "chef" || role === "driver") && !city.trim()) { Alert.alert("تنبيه", "ادخل مدينتك"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone, full_name: name.trim(),
          role, gender,
          city: city.trim(), neighborhood: neighborhood.trim()
        }),
      });
      const json = await res.json();
      if (json.success) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        savePushToken().catch(() => {});
        const route = ROLE_ROUTES[role] || "/(tabs)";
        router.replace(route as any);
      } else { Alert.alert("خطأ", json.message || "حدث خطأ"); }
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالسيرفر"); }
    finally { setLoading(false); }
  };

  // شاشة الدخول
  if (step === "login") {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll}>
            <View style={s.logoWrap}>
              <View style={s.logoBox}><LogoSVG /></View>
              <Text style={s.logoName}>زعفران</Text>
            </View>
            <View style={s.form}>
              <Text style={s.formTitle}>اهلاً بك</Text>
              <Text style={s.formHint}>ادخل رقم جوالك للدخول</Text>
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
                {loading ? <ActivityIndicator color="#1C0F00" /> : <Text style={s.btnText}>دخول</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.switchBtn} onPress={() => setStep("register")}>
                <Text style={s.switchText}>ما عندك حساب؟ سجّل الآن</Text>
              </TouchableOpacity>
              <View style={s.divider}>
                <View style={s.dividerLine}/>
                <Text style={s.dividerText}>او</Text>
                <View style={s.dividerLine}/>
              </View>
              <TouchableOpacity style={s.chefBtn} onPress={() => setStep("chef_register")}>
                <Text style={s.chefBtnText}>انضم كشيف / شيفة</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chefBtn, { marginTop: 10, borderColor: "rgba(33,150,243,0.3)", backgroundColor: "rgba(33,150,243,0.08)" }]}
                onPress={() => setStep("driver_register")}
              >
                <Text style={[s.chefBtnText, { color: "#2196F3" }]}>انضم كمندوب توصيل</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // شاشة تسجيل عميل
  if (step === "register") {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll}>
            <View style={s.logoWrap}>
              <View style={s.logoBox}><LogoSVG /></View>
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
              <GenderPicker gender={gender} setGender={setGender} />
              <TouchableOpacity style={s.btn} onPress={() => handleRegister("customer")} disabled={loading}>
                {loading ? <ActivityIndicator color="#1C0F00" /> : <Text style={s.btnText}>تسجيل</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.switchBtn} onPress={() => setStep("login")}>
                <Text style={s.switchText}>رجوع</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // شاشة تسجيل شيف
  if (step === "chef_register") {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll}>
            <View style={s.logoWrap}>
              <View style={s.logoBox}><LogoSVG /></View>
              <Text style={s.logoName}>زعفران</Text>
              <Text style={s.roleTag}>تسجيل شيف / شيفة</Text>
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
              <GenderPicker gender={gender} setGender={setGender} />
              <Text style={s.label}>المدينة</Text>
              <TouchableOpacity style={s.inputWrap} onPress={() => setShowCityPicker(true)} activeOpacity={0.8}>
                <Text style={[s.input, { color: city ? "#FDF0DC" : "#5A3A18", paddingVertical: 14 }]}>
                  {city || "اختر مدينتك"}
                </Text>
              </TouchableOpacity>
              <Text style={s.label}>الحي</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="حي النرجس، ..." placeholderTextColor="#5A3A18" value={neighborhood} onChangeText={setNeighborhood} textAlign="right"/>
              </View>
              <TouchableOpacity style={s.btn} onPress={() => handleRegister("chef")} disabled={loading}>
                {loading ? <ActivityIndicator color="#1C0F00" /> : <Text style={s.btnText}>سجّل مطبخي</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.switchBtn} onPress={() => setStep("login")}>
                <Text style={s.switchText}>رجوع</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <CityPickerModal
          visible={showCityPicker}
          onClose={() => setShowCityPicker(false)}
          cities={cities}
          city={city}
          setCity={setCity}
        />
      </SafeAreaView>
    );
  }

  // شاشة تسجيل مندوب
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.logoWrap}>
            <View style={s.logoBox}><LogoSVG /></View>
            <Text style={s.logoName}>زعفران</Text>
            <Text style={[s.roleTag, { color: "#2196F3" }]}>تسجيل مندوب توصيل</Text>
          </View>
          <View style={s.form}>
            <Text style={s.formTitle}>انضم كمندوب</Text>
            <Text style={s.formHint}>وصّل الطلبات واكسب اكثر</Text>
            <Text style={s.label}>الاسم</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="اسمك الكامل" placeholderTextColor="#5A3A18" value={name} onChangeText={setName} textAlign="right"/>
            </View>
            <Text style={s.label}>رقم الجوال</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="05X XXX XXXX" placeholderTextColor="#5A3A18" keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" maxLength={10}/>
            </View>
            <GenderPicker gender={gender} setGender={setGender} />
            <Text style={s.label}>المدينة</Text>
            <TouchableOpacity style={s.inputWrap} onPress={() => setShowCityPicker(true)} activeOpacity={0.8}>
              <Text style={[s.input, { color: city ? "#FDF0DC" : "#5A3A18", paddingVertical: 14 }]}>
                {city || "اختر مدينتك"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: "#2196F3" }]} onPress={() => handleRegister("driver")} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>تسجيل كمندوب</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.switchBtn} onPress={() => setStep("login")}>
              <Text style={s.switchText}>رجوع</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CityPickerModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        cities={cities}
        city={city}
        setCity={setCity}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#0E0700" },
  scroll:            { flexGrow: 1, padding: 24, justifyContent: "center" },
  logoWrap:          { alignItems: "center", marginBottom: 28 },
  logoBox:           { width: 100, height: 100, borderRadius: 30, backgroundColor: "#F0A500", alignItems: "center", justifyContent: "center", marginBottom: 14, shadowColor: "#F0A500", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
  logoName:          { fontSize: 38, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  roleTag:           { fontSize: 14, color: "#F0A500", fontFamily: "Almarai_700Bold", marginTop: 6 },
  form:              { backgroundColor: "#1C1000", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  formTitle:         { fontSize: 24, fontWeight: "900", color: "#FDF0DC", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_800ExtraBold" },
  formHint:          { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 20, fontFamily: "Almarai_400Regular" },
  label:             { fontSize: 11, fontWeight: "700", color: "#C97D20", letterSpacing: 2, textAlign: "right", marginBottom: 6, fontFamily: "Almarai_700Bold" },
  inputWrap:         { backgroundColor: "#251400", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 14, marginBottom: 14 },
  input:             { height: 50, color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_400Regular" },
  btn:               { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 4 },
  btnText:           { fontSize: 17, fontWeight: "900", color: "#1C0F00", fontFamily: "Almarai_800ExtraBold" },
  switchBtn:         { marginTop: 16, alignItems: "center" },
  switchText:        { color: "#F0A500", fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  divider:           { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: "rgba(240,165,0,0.15)" },
  dividerText:       { color: "#5A3A18", fontSize: 12, fontFamily: "Almarai_400Regular" },
  chefBtn:           { backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.25)" },
  chefBtnText:       { fontSize: 15, fontWeight: "700", color: "#F0A500", fontFamily: "Almarai_700Bold" },
  genderRow:         { flexDirection: "row-reverse", gap: 10, marginBottom: 14 },
  genderBtn:         { flex: 1, alignItems: "center", backgroundColor: "#251400", borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  genderBtnActive:   { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  genderLabel:       { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_700Bold" },
  genderLabelActive: { color: "#F0A500" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#1C0F00", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: "rgba(240,165,0,0.15)",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#FDF0DC", textAlign: "right", marginBottom: 14, fontFamily: "Almarai_800ExtraBold" },
  cityRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.08)" },
  cityRowText: { fontSize: 15, color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_400Regular" },
});