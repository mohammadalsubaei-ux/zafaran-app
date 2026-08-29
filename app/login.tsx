import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken } from "@/utils/authFetch";
import Constants from "expo-constants";
// Firebase مكتبة أصلية لا وجود لها في Expo Go.
// try/catch حول require لا يكفي: المكتبة تنهار أثناء تحميلها فتصل
// لمعالج الأخطاء العام قبل أن نلتقطها. لذلك نفحص البيئة أولاً
// ولا نستدعيها إطلاقاً أثناء التطوير.
const IS_EXPO_GO = Constants.appOwnership === "expo";

function getAuth() {
  if (IS_EXPO_GO) return null;

  try {
    return require("@react-native-firebase/auth").default;
  } catch {
    return null;
  }
}
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
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
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
  // مكوّن مستقل — يحتاج الوصول للثيم بنفسه، لا يرثه من الشاشة
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
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
  // خطوات الدخول: الرقم ← الرمز ← الاسم (للجديد فقط)
  const [stage, setStage] = useState<"phone" | "code" | "profile">("phone");
  const [role, setRole]   = useState<"customer" | "chef" | "driver">("customer");

  const [phone, setPhone]   = useState("");
  const [code, setCode]     = useState("");
  const [name, setName]     = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [city, setCity]     = useState("");
  const [cities, setCities] = useState<{ id: number; name_ar: string; region?: string | null }[]>([]);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const [confirmation, setConfirmation] = useState<any>(null);
  const [loading, setLoading]           = useState(false);
  const [seconds, setSeconds]           = useState(0);

  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const params = useLocalSearchParams<{ step?: string }>();

  useEffect(() => {
    fetch(`${API}/api/cities`)
      .then((res) => res.json())
      .then((json) => { if (json?.success) setCities(json.data || []); })
      .catch(() => {});
  }, []);

  // القدوم من "حسابي" بدور محدد
  useEffect(() => {
    const target = String(params?.step || "");
    if (target === "chef_register")   setRole("chef");
    if (target === "driver_register") setRole("driver");
  }, [params?.step]);

  // عدّاد إعادة الإرسال
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });
  if (!fontsLoaded) return null;

  // 05xxxxxxxx → +9665xxxxxxxx (الصيغة التي تفهمها Firebase)
  const toE164 = (raw: string) => {
    let n = raw.replace(/[^0-9]/g, "");
    if (n.startsWith("966")) return "+" + n;
    if (n.startsWith("0"))   n = n.slice(1);
    return "+966" + n;
  };

  const sendCode = async () => {
    const clean = phone.replace(/[^0-9]/g, "");

    if (!/^(05\d{8}|9665\d{8})$/.test(clean)) {
      Alert.alert("رقم غير صحيح", "اكتب رقم جوالك هكذا: 05xxxxxxxx");
      return;
    }

    const auth = getAuth();
    if (!auth) {
      Alert.alert(
        "غير متاح في وضع التطوير",
        "التحقق بالرمز يحتاج نسخة مبنية — جرّبه بعد البناء."
      );
      return;
    }

    setLoading(true);
    try {
      const conf = await auth().signInWithPhoneNumber(toE164(clean));
      setConfirmation(conf);
      setStage("code");
      setSeconds(45);
    } catch (e: any) {
      const code = String(e?.code || "");
      const msg =
        code.includes("too-many-requests") ? "محاولات كثيرة — انتظر قليلاً وحاول مرة ثانية." :
        code.includes("invalid-phone")     ? "رقم الجوال غير صحيح." :
        "تعذر إرسال الرمز — تأكد من الرقم والاتصال.";
      Alert.alert("تنبيه", msg);
    } finally {
      setLoading(false);
    }
  };

  // يرسل رمز Firebase لخادمنا فيصدر جلسة زعفران
  const finish = async (idToken: string, withName?: string) => {
    const res = await fetch(`${API}/api/users/phone-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        full_name: withName,
        role,
        city: city.trim() || undefined,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!json?.success) {
      Alert.alert("تنبيه", json?.message || "تعذر إتمام الدخول");
      return;
    }

    // حساب جديد بلا اسم — ننتقل لخطوة الاسم
    if (json.needs_profile) {
      setStage("profile");
      return;
    }

    await AsyncStorage.setItem("user", JSON.stringify(json.data));
    setToken(json.data?.token || null);
    savePushToken().catch(() => {});

    router.replace((ROLE_ROUTES[json.data.role] || "/(tabs)") as any);
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) {
      Alert.alert("تنبيه", "اكتب الرمز المكوّن من 6 أرقام");
      return;
    }

    setLoading(true);
    try {
      const cred = await confirmation.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      await finish(idToken);
    } catch (e: any) {
      const code2 = String(e?.code || "");
      Alert.alert(
        "تنبيه",
        code2.includes("invalid-verification-code")
          ? "الرمز غير صحيح — تأكد منه أو أعد الإرسال."
          : "تعذر التحقق — حاول مرة ثانية."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (name.trim().length < 3) {
      Alert.alert("تنبيه", "اكتب اسمك الكامل");
      return;
    }
    if ((role === "chef" || role === "driver") && !city.trim()) {
      Alert.alert("تنبيه", "اختر مدينتك");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const current = auth ? auth().currentUser : null;
      if (!current) {
        Alert.alert("انتهت الجلسة", "أعد إدخال رقمك من جديد.");
        setStage("phone");
        return;
      }

      const idToken = await current.getIdToken(true);
      await finish(idToken, name.trim());
    } catch {
      Alert.alert("خطأ", "تعذر إكمال التسجيل");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel =
    role === "chef" ? "تسجيل متجر" : role === "driver" ? "تسجيل مندوب" : "";

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Image source={require("@/assets/images/logo.png")} style={s.logoMark} />
            {roleLabel ? <Text style={s.roleTag}>{roleLabel}</Text> : null}
          </View>

          {stage === "phone" ? (
            <View style={s.form}>
              <Text style={s.formTitle}>أهلاً بك</Text>
              <Text style={s.formHint}>اكتب رقم جوالك ونرسل لك رمز تحقق</Text>

              <Text style={s.label}>رقم الجوال</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="05xxxxxxxx"
                  placeholderTextColor={c.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={12}
                />
              </View>

              <TouchableOpacity style={s.btn} onPress={sendCode} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={c.onGold} />
                  : <Text style={s.btnText}>أرسل الرمز</Text>}
              </TouchableOpacity>

              {role === "customer" ? (
                <>
                  <View style={s.divider}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerText}>أو</Text>
                    <View style={s.dividerLine} />
                  </View>

                  <TouchableOpacity style={s.chefBtn} onPress={() => setRole("chef")}>
                    <Text style={s.chefBtnText}>سجّل متجرك</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.switchBtn} onPress={() => setRole("driver")}>
                    <Text style={s.switchText}>أو انضم كمندوب توصيل</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={s.switchBtn} onPress={() => setRole("customer")}>
                  <Text style={s.switchText}>رجوع لتسجيل عميل</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {stage === "code" ? (
            <View style={s.form}>
              <Text style={s.formTitle}>رمز التحقق</Text>
              <Text style={s.formHint}>أرسلنا رمزاً من 6 أرقام إلى {phone}</Text>

              <View style={s.inputWrap}>
                <TextInput
                  style={[s.input, { textAlign: "center", letterSpacing: 8, fontSize: 22 }]}
                  placeholder="------"
                  placeholderTextColor={c.textMuted}
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity style={s.btn} onPress={verifyCode} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={c.onGold} />
                  : <Text style={s.btnText}>تحقق ودخول</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.switchBtn}
                disabled={seconds > 0}
                onPress={sendCode}
              >
                <Text style={[s.switchText, seconds > 0 && { color: c.textMuted }]}>
                  {seconds > 0 ? `إعادة الإرسال بعد ${seconds} ثانية` : "إعادة إرسال الرمز"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.switchBtn} onPress={() => { setStage("phone"); setCode(""); }}>
                <Text style={s.switchText}>تغيير الرقم</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {stage === "profile" ? (
            <View style={s.form}>
              <Text style={s.formTitle}>أكمل بياناتك</Text>
              <Text style={s.formHint}>تحققنا من رقمك — بقي اسمك فقط</Text>

              <Text style={s.label}>الاسم الكامل</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="الاسم"
                  placeholderTextColor={c.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {role === "customer" ? (
                <GenderPicker gender={gender} setGender={setGender} />
              ) : null}

              {role === "chef" || role === "driver" ? (
                <>
                  <Text style={s.label}>المدينة</Text>
                  <TouchableOpacity style={s.inputWrap} onPress={() => setShowCityPicker(true)}>
                    <Text style={[s.input, { paddingVertical: 15, color: city ? c.text : c.textMuted }]}>
                      {city || "اختر مدينتك"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity style={s.btn} onPress={saveProfile} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={c.onGold} />
                  : <Text style={s.btnText}>إنشاء الحساب</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
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
  formTitle:         { fontSize: 24, color: c.text, textAlign: "right", marginBottom: 4, fontFamily: "Almarai_800ExtraBold" },
  formHint:          { fontSize: 12, color: c.textSoft, textAlign: "right", marginBottom: 20, fontFamily: "Almarai_400Regular" },
  label:             { fontSize: 11, color: c.gold, textAlign: "right", marginBottom: 6, fontFamily: "Almarai_700Bold" },
  inputWrap:         { backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.goldBorder, paddingHorizontal: 14, marginBottom: 14 },
  input:             { height: 50, color: c.text, fontSize: 15, fontFamily: "Almarai_400Regular" },
  btn:               { backgroundColor: c.gold, borderRadius: 16, padding: 16, alignItems: "center", marginTop: 4 },
  btnText:           { fontSize: 17, color: c.surface, fontFamily: "Almarai_800ExtraBold" },
  switchBtn:         { marginTop: 16, alignItems: "center" },
  switchText:        { color: c.gold, fontSize: 13, fontFamily: "Almarai_700Bold" },
  certHint:          { color: c.textSoft, fontSize: 11.5, lineHeight: 19, textAlign: "right", marginBottom: 12, fontFamily: "Almarai_400Regular" },
  divider:           { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: c.goldBorder },
  dividerText:       { color: c.textMuted, fontSize: 12, fontFamily: "Almarai_400Regular" },
  chefBtn:           { backgroundColor: c.goldSoft, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.goldBorder },
  chefBtnText:       { fontSize: 15, color: c.gold, fontFamily: "Almarai_700Bold" },
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
  modalTitle: { fontSize: 16, color: c.text, textAlign: "right", marginBottom: 14, fontFamily: "Almarai_800ExtraBold" },
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