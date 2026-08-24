import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";
import { savePushToken } from "@/utils/notifications";

const API = "https://zafaran-backend-production.up.railway.app";

const ROLE_ROUTES: Record<string, string> = {
  chef:     "/dashboard/chef",
  driver:   "/dashboard/driver",
  customer: "/(tabs)",
};

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
//  نافذة اختيار المدينة — مكوّن مشترك يُستخدم بشاشتي المتجر والمندوب
//  القائمة تغطي مناطق المملكة كاملة، لذلك أُضيف بحث بدل التمرير الطويل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CityPickerModal({ visible, onClose, cities, city, setCity }: {
  visible: boolean;
  onClose: () => void;
  cities: { id: number; name_ar: string; region?: string | null }[];
  city: string;
  setCity: (c: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return cities;
    return cities.filter(
      (c) => c.name_ar.includes(q) || String(c.region || "").includes(q)
    );
  }, [cities, query]);

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={close}>
        <TouchableOpacity style={s.modalBox} activeOpacity={1}>
          <Text style={s.modalTitle}>اختر مدينتك</Text>

          <View style={s.citySearchWrap}>
            <TextInput
              style={s.citySearchInput}
              placeholder="ابحث عن مدينتك أو منطقتك..."
              placeholderTextColor={c.textMuted}
              value={query}
              onChangeText={setQuery}
              textAlign="right"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 340 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.cityRow}
                onPress={() => { setCity(item.name_ar); close(); }}
              >
                <Text style={[s.cityRowText, city === item.name_ar && { color: c.gold }]}>
                  {item.name_ar}
                </Text>
                {item.region ? (
                  <Text style={s.cityRegionText}>{item.region}</Text>
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              cities.length === 0
                ? <ActivityIndicator color={c.gold} style={{ marginVertical: 20 }} />
                : <Text style={s.cityEmpty}>ما لقينا مدينة بهذا الاسم</Text>
            }
          />
        </TouchableOpacity>
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
  const [cities, setCities]             = useState<{ id: number; name_ar: string; region?: string | null }[]>([]);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/cities`)
      .then((res) => res.json())
      .then((json) => { if (json?.success) setCities(json.data || []); })
      .catch(() => {});
  }, []);
  const [neighborhood, setNeighborhood] = useState("");
  const [password, setPassword]         = useState("");
  const [password2, setPassword2]       = useState("");
  const [loading, setLoading]           = useState(false);
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const params = useLocalSearchParams<{ step?: string }>();

  // القدوم من شاشة "حسابي" للضيف بخطوة محددة (تسجيل عميل/متجر/مندوب)
  useEffect(() => {
    const target = String(params?.step || "");
    if (["register", "chef_register", "driver_register"].includes(target)) {
      setStep(target as "register" | "chef_register" | "driver_register");
    }
  }, [params?.step]);

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });
  if (!fontsLoaded) return null;

  const handleLogin = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) { Alert.alert("تنبيه", "ادخل رقم جوال صحيح"); return; }
    if (password.length < 6) { Alert.alert("تنبيه", "ادخل كلمة المرور (6 احرف على الاقل)"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, password }),
      });
      const json = await res.json();
      if (json.success) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        savePushToken().catch(() => {});
        const route = ROLE_ROUTES[json.data.role] || "/(tabs)";
        router.replace(route as any);
      } else {
        // عرض رسالة الخادم الحقيقية (موقوف / غير مسجل) بدل نص ثابت يخفيها
        Alert.alert("تنبيه", json.message || "رقم الجوال غير مسجل — ما عندك حساب؟ سجّل الآن");
      }
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالسيرفر"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (role: string) => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) { Alert.alert("تنبيه", "ادخل رقم جوال صحيح"); return; }
    if (!name.trim()) { Alert.alert("تنبيه", "ادخل اسمك"); return; }
    if (password.length < 6) { Alert.alert("تنبيه", "ادخل كلمة مرور (6 احرف على الاقل)"); return; }
    if (password !== password2) { Alert.alert("تنبيه", "كلمتا المرور غير متطابقتين"); return; }
    if ((role === "chef" || role === "driver") && !city.trim()) { Alert.alert("تنبيه", "اختر مدينتك"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone, full_name: name.trim(), password,
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
      <SafeAreaView key="step-login" style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.logoWrap}>
              <Image source={require("../assets/images/logo-mark.png")} style={s.logoMark} />
            </View>
            <View style={s.form}>
              <Text style={s.formTitle}>اهلاً بك</Text>
              <Text style={s.formHint}>ادخل رقم جوالك وكلمة المرور</Text>
              <Text style={s.label}>رقم الجوال</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="05X XXX XXXX"
                  placeholderTextColor={c.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  textAlign="right"
                  maxLength={10}
                />
              </View>
              <Text style={s.label}>كلمة المرور</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="••••••"
                  placeholderTextColor={c.textMuted}
                  secureTextEntry
                  onChangeText={setPassword}
                  textAlign="right"
                />
              </View>
              <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={c.onGold} /> : <Text style={s.btnText}>دخول</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.switchBtn} onPress={() => setStep("register")}>
                <Text style={s.switchText}>ما عندك حساب؟ سجّل الآن</Text>
              </TouchableOpacity>
                            <TouchableOpacity style={s.switchBtn} onPress={() => router.push("/forgot-password" as any)}>
                <Text style={s.switchText}>نسيت كلمة المرور؟</Text>
              </TouchableOpacity>
              <View style={s.divider}>
                <View style={s.dividerLine}/>
                <Text style={s.dividerText}>او</Text>
                <View style={s.dividerLine}/>
              </View>
              <TouchableOpacity style={s.chefBtn} onPress={() => setStep("chef_register")}>
                <Text style={s.chefBtnText}>سجّل متجرك المنزلي</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chefBtn, { marginTop: 10, borderColor: c.goldBorder, backgroundColor: c.goldSoft }]}
                onPress={() => setStep("driver_register")}
              >
                <Text style={[s.chefBtnText, { color: c.info }]}>انضم كمندوب توصيل</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.switchBtn} onPress={() => router.replace("/(tabs)" as any)}>
                <Text style={s.switchText}>تصفح كضيف بدون تسجيل</Text>
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
      <SafeAreaView key="step-register" style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.logoWrap}>
              <Image source={require("../assets/images/logo-mark.png")} style={s.logoMark} />
            </View>
            <View style={s.form}>
              <Text style={s.formTitle}>حساب جديد</Text>
              <Text style={s.formHint}>سجّل حسابك مجاناً</Text>
              <Text style={s.label}>الاسم</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="اسمك الكامل" placeholderTextColor={c.textMuted} onChangeText={setName} textAlign="right"/>
              </View>
              <Text style={s.label}>كلمة المرور</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="6 احرف على الاقل" placeholderTextColor={c.textMuted} secureTextEntry onChangeText={setPassword} textAlign="right"/>
              </View>
              <Text style={s.label}>تاكيد كلمة المرور</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="اعد كتابتها" placeholderTextColor={c.textMuted} secureTextEntry onChangeText={setPassword2} textAlign="right"/>
              </View>
              <Text style={s.label}>رقم الجوال</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="05X XXX XXXX" placeholderTextColor={c.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" maxLength={10}/>
              </View>
              <GenderPicker gender={gender} setGender={setGender} />
              <TouchableOpacity style={s.btn} onPress={() => handleRegister("customer")} disabled={loading}>
                {loading ? <ActivityIndicator color={c.onGold} /> : <Text style={s.btnText}>تسجيل</Text>}
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

  // شاشة تسجيل متجر منزلي
  if (step === "chef_register") {
    return (
      <SafeAreaView key="step-chef" style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.logoWrap}>
              <Image source={require("../assets/images/logo-mark.png")} style={s.logoMark} />
            </View>
            <View style={s.form}>
              <Text style={s.formTitle}>سجّل متجرك</Text>
              <Text style={s.formHint}>طبخ، حلا، قهوة، مخبوزات — كل التخصصات المنزلية</Text>
              <Text style={s.label}>الاسم</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="اسمك الكامل" placeholderTextColor={c.textMuted} onChangeText={setName} textAlign="right"/>
              </View>
              <Text style={s.label}>كلمة المرور</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="6 احرف على الاقل" placeholderTextColor={c.textMuted} secureTextEntry onChangeText={setPassword} textAlign="right"/>
              </View>
              <Text style={s.label}>تاكيد كلمة المرور</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="اعد كتابتها" placeholderTextColor={c.textMuted} secureTextEntry onChangeText={setPassword2} textAlign="right"/>
              </View>
              <Text style={s.label}>رقم الجوال</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="05X XXX XXXX" placeholderTextColor={c.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" maxLength={10}/>
              </View>
              <GenderPicker gender={gender} setGender={setGender} />
              <Text style={s.label}>المدينة</Text>
              <TouchableOpacity style={s.inputWrap} onPress={() => setShowCityPicker(true)} activeOpacity={0.8}>
                <Text style={[s.input, { color: city ? c.text : c.textMuted, paddingVertical: 14 }]}>
                  {city || "اختر مدينتك"}
                </Text>
              </TouchableOpacity>
              <Text style={s.label}>الحي</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="حي النرجس، ..." placeholderTextColor={c.textMuted} onChangeText={setNeighborhood} textAlign="right"/>
              </View>
              <Text style={s.certHint}>شهادة العمل الحر غير إلزامية للتسجيل — يمكنك رفعها لاحقًا من لوحتك خلال المهلة المحددة</Text>
              <TouchableOpacity style={s.btn} onPress={() => handleRegister("chef")} disabled={loading}>
                {loading ? <ActivityIndicator color={c.onGold} /> : <Text style={s.btnText}>سجّل متجري</Text>}
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
    <SafeAreaView key="step-driver" style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Image source={require("../assets/images/logo-mark.png")} style={s.logoMark} />
            <Text style={[s.roleTag, { color: c.info }]}>تسجيل مندوب توصيل</Text>
          </View>
          <View style={s.form}>
            <Text style={s.formTitle}>انضم كمندوب</Text>
            <Text style={s.formHint}>وصّل الطلبات واكسب اكثر</Text>
            <Text style={s.label}>الاسم</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="اسمك الكامل" placeholderTextColor={c.textMuted} onChangeText={setName} textAlign="right"/>
            </View>
            <Text style={s.label}>كلمة المرور</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="6 احرف على الاقل" placeholderTextColor={c.textMuted} secureTextEntry onChangeText={setPassword} textAlign="right"/>
            </View>
            <Text style={s.label}>تاكيد كلمة المرور</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="اعد كتابتها" placeholderTextColor={c.textMuted} secureTextEntry onChangeText={setPassword2} textAlign="right"/>
            </View>
            <Text style={s.label}>رقم الجوال</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="05X XXX XXXX" placeholderTextColor={c.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" maxLength={10}/>
            </View>
            <GenderPicker gender={gender} setGender={setGender} />
            <Text style={s.label}>المدينة</Text>
            <TouchableOpacity style={s.inputWrap} onPress={() => setShowCityPicker(true)} activeOpacity={0.8}>
              <Text style={[s.input, { color: city ? c.text : c.textMuted, paddingVertical: 14 }]}>
                {city || "اختر مدينتك"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: c.info }]} onPress={() => handleRegister("driver")} disabled={loading}>
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

const make_s = (c: Colors) => StyleSheet.create({
  safe:              { flex: 1, backgroundColor: c.bg },
  scroll:            { flexGrow: 1, padding: 24, justifyContent: "center" },
  logoWrap:          { alignItems: "center", marginBottom: 28 },
  logoMark:          { width: 230, height: 166, resizeMode: "contain", marginBottom: 6 },
  roleTag:           { fontSize: 14, color: c.gold, fontFamily: "Almarai_700Bold", marginTop: 6 },
  form:              { backgroundColor: c.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: c.goldBorder },
  formTitle:         { fontSize: 24, fontWeight: "900", color: c.text, textAlign: "right", marginBottom: 4, fontFamily: "Almarai_800ExtraBold" },
  formHint:          { fontSize: 12, color: c.textSoft, textAlign: "right", marginBottom: 20, fontFamily: "Almarai_400Regular" },
  label:             { fontSize: 11, fontWeight: "700", color: c.gold, textAlign: "right", marginBottom: 6, fontFamily: "Almarai_700Bold" },
  inputWrap:         { backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.goldBorder, paddingHorizontal: 14, marginBottom: 14 },
  input:             { height: 50, color: c.text, fontSize: 15, fontFamily: "Almarai_400Regular" },
  btn:               { backgroundColor: c.gold, borderRadius: 16, padding: 16, alignItems: "center", marginTop: 4 },
  btnText:           { fontSize: 17, fontWeight: "900", color: c.surface, fontFamily: "Almarai_800ExtraBold" },
  switchBtn:         { marginTop: 16, alignItems: "center" },
  switchText:        { color: c.gold, fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  certHint:          { color: c.textSoft, fontSize: 11.5, lineHeight: 19, textAlign: "right", marginBottom: 12, fontFamily: "Almarai_400Regular" },
  divider:           { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: c.goldBorder },
  dividerText:       { color: c.textMuted, fontSize: 12, fontFamily: "Almarai_400Regular" },
  chefBtn:           { backgroundColor: c.goldSoft, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.goldBorder },
  chefBtnText:       { fontSize: 15, fontWeight: "700", color: c.gold, fontFamily: "Almarai_700Bold" },
  genderRow:         { flexDirection: "row-reverse", gap: 10, marginBottom: 14 },
  genderBtn:         { flex: 1, alignItems: "center", backgroundColor: c.surfaceAlt, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.goldSoft },
  genderBtnActive:   { backgroundColor: c.border, borderColor: c.goldBorder },
  genderLabel:       { fontSize: 12, color: c.textSoft, fontFamily: "Almarai_700Bold" },
  genderLabelActive: { color: c.gold },

  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, borderTopWidth: 1, borderColor: c.goldBorder,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: c.text, textAlign: "right", marginBottom: 14, fontFamily: "Almarai_800ExtraBold" },
  citySearchWrap: {
    backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1,
    borderColor: c.goldBorder, paddingHorizontal: 14, marginBottom: 12,
  },
  citySearchInput: { height: 46, color: c.text, fontSize: 14, fontFamily: "Almarai_400Regular" },
  cityRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.goldSoft },
  cityRowText: { fontSize: 15, color: c.text, textAlign: "right", fontFamily: "Almarai_400Regular" },
  cityRegionText: { fontSize: 11, color: c.textSoft, textAlign: "right", marginTop: 3, fontFamily: "Almarai_400Regular" },
  cityEmpty: { fontSize: 13, color: c.textSoft, textAlign: "center", marginVertical: 24, fontFamily: "Almarai_400Regular" },
});