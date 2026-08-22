import { useCallback, useState, useMemo } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import { ArrowRight, KeyRound, MessageCircle, ShieldCheck } from "lucide-react-native";

// رقم دعم زعفران بصيغة دولية بلا رموز — واتساب لا يقبل غير ذلك
const SUPPORT_WHATSAPP = "966544633113";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const [phone, setPhone] = useState("");

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const openWhatsApp = useCallback(async () => {
    const clean = phone.trim();

    if (clean.length < 10) {
      Alert.alert("تنبيه", "اكتب رقم جوالك كاملاً (10 أرقام)");
      return;
    }

    const message =
      `السلام عليكم\n` +
      `نسيت كلمة المرور لحسابي في زعفران.\n` +
      `رقم الجوال: ${clean}\n\n` +
      `أرجو إعادة تعيين كلمة المرور.`;

    const url = `whatsapp://send?phone=${SUPPORT_WHATSAPP}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      // wa.me يعمل حتى بلا تطبيق واتساب — احتياطي لمن لا يملكه
      await Linking.openURL(supported ? url : webUrl);
    } catch {
      Alert.alert(
        "تعذر فتح واتساب",
        `راسلنا مباشرة على الرقم:\n0${SUPPORT_WHATSAPP.slice(3)}`
      );
    }
  }, [phone]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={s.backBtn}
              onPress={() => router.back()}
            >
              <ArrowRight size={20} color={c.gold} strokeWidth={1.9} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>استرجاع كلمة المرور</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={s.iconWrap}>
            <KeyRound size={44} color={c.gold} strokeWidth={1.5} />
          </View>

          <Text style={s.title}>نسيت كلمة المرور؟</Text>
          <Text style={s.sub}>
            اكتب رقم جوالك المسجل، وبنراسلك على واتساب لإعادة تعيين كلمة مرور جديدة.
          </Text>

          <View style={s.form}>
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
                returnKeyType="done"
                onSubmitEditing={openWhatsApp}
              />
            </View>

            <TouchableOpacity activeOpacity={0.9} style={s.waBtn} onPress={openWhatsApp}>
              <MessageCircle size={19} color={c.onGold} strokeWidth={2} />
              <Text style={s.waBtnText}>راسلنا على واتساب</Text>
            </TouchableOpacity>

            <View style={s.noteBox}>
              <ShieldCheck size={16} color={c.success} strokeWidth={1.8} />
              <Text style={s.noteText}>
                نتحقق من هويتك قبل إعادة التعيين حمايةً لحسابك ومحفظتك.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={s.backLink}
              onPress={() => router.back()}
            >
              <Text style={s.backLinkText}>رجوع لتسجيل الدخول</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
  },

  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: c.text,
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 34,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldBorder,
    marginBottom: 20,
  },

  title: {
    color: c.text,
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  sub: {
    color: c.textSoft,
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 26,
    paddingHorizontal: 8,
    fontFamily: "Almarai_400Regular",
  },

  form: {
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  label: {
    color: c.gold,
    fontSize: 11,
    textAlign: "right",
    marginBottom: 7,
    fontFamily: "Almarai_700Bold",
  },

  inputWrap: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.goldBorder,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  input: {
    height: 50,
    color: c.text,
    fontSize: 15,
    fontFamily: "Almarai_400Regular",
  },

  waBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: c.success,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  waBtnText: {
    color: c.bg,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  noteBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.successSoft,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: c.successSoft,
  },

  noteText: {
    flex: 1,
    color: c.success,
    fontSize: 11.5,
    lineHeight: 19,
    textAlign: "right",
    fontFamily: "Almarai_400Regular",
  },

  backLink: {
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 8,
  },

  backLinkText: {
    color: c.gold,
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});