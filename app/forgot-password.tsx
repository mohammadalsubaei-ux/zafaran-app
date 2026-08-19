import { useCallback, useState } from "react";
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
              <ArrowRight size={20} color="#F0A500" strokeWidth={1.9} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>استرجاع كلمة المرور</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={s.iconWrap}>
            <KeyRound size={44} color="#F0A500" strokeWidth={1.5} />
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
                placeholderTextColor="#5A3A18"
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
              <MessageCircle size={19} color="#0E0700" strokeWidth={2} />
              <Text style={s.waBtnText}>راسلنا على واتساب</Text>
            </TouchableOpacity>

            <View style={s.noteBox}>
              <ShieldCheck size={16} color="#8BC34A" strokeWidth={1.8} />
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

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0E0700",
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
    borderColor: "rgba(240,165,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: "#FDF0DC",
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
    backgroundColor: "#1C1000",
    borderWidth: 1,
    borderColor: "rgba(240,165,0,0.18)",
    marginBottom: 20,
  },

  title: {
    color: "#FDF0DC",
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  sub: {
    color: "#A98961",
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 26,
    paddingHorizontal: 8,
    fontFamily: "Almarai_400Regular",
  },

  form: {
    backgroundColor: "#1C1000",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(240,165,0,0.15)",
  },

  label: {
    color: "#C97D20",
    fontSize: 11,
    textAlign: "right",
    marginBottom: 7,
    fontFamily: "Almarai_700Bold",
  },

  inputWrap: {
    backgroundColor: "#251400",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(240,165,0,0.2)",
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  input: {
    height: 50,
    color: "#FDF0DC",
    fontSize: 15,
    fontFamily: "Almarai_400Regular",
  },

  waBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#25D366",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  waBtnText: {
    color: "#0E0700",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  noteBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(139,195,74,0.08)",
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(139,195,74,0.18)",
  },

  noteText: {
    flex: 1,
    color: "#A5D6A7",
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
    color: "#F0A500",
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});