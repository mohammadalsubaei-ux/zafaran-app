import { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowRight, KeyRound } from "lucide-react-native";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

export default function ChangePassword() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const [current, setCurrent]     = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading]     = useState(false);

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });
  if (!fontsLoaded) return null;

  const submit = async () => {
    if (newPw.length < 6) { Alert.alert("تنبيه", "كلمة المرور الجديدة 6 احرف على الاقل"); return; }
    if (newPw !== confirmPw) { Alert.alert("تنبيه", "كلمتا المرور غير متطابقتين"); return; }

    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user");
      const userId = stored ? JSON.parse(stored)?.id : null;
      if (!userId) { router.replace("/login"); return; }

      const res = await fetch(`${API}/api/users/${userId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: newPw }),
      });
      const json = await res.json();

      if (json.success) {
        Alert.alert("تم", "تم تغيير كلمة المرور بنجاح", [
          { text: "حسناً", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("تنبيه", json.message || "تعذر تغيير كلمة المرور");
      }
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={{ width: 38 }} />
        <Text style={s.title}>تغيير كلمة المرور</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowRight size={20} color={c.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.heroIcon}>
          <KeyRound size={26} color={c.gold} strokeWidth={1.7} />
        </View>
        <Text style={s.hint}>اختر كلمة مرور قوية لا تشاركها مع أحد — 6 أحرف على الأقل</Text>

        <Text style={s.label}>كلمة المرور الحالية</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="••••••"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            onChangeText={setCurrent}
            textAlign="right"
          />
        </View>

        <Text style={s.label}>كلمة المرور الجديدة</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="6 احرف على الاقل"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            onChangeText={setNewPw}
            textAlign="right"
          />
        </View>

        <Text style={s.label}>تأكيد كلمة المرور الجديدة</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="اعد كتابتها"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            onChangeText={setConfirmPw}
            textAlign="right"
          />
        </View>

        <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          {loading
            ? <ActivityIndicator color={c.onGold} size="small" />
            : <Text style={s.btnText}>حفظ كلمة المرور</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: c.bg },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  title:   { color: c.text, fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  scroll:  { paddingHorizontal: 20, paddingBottom: 24 },

  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 8 },
  hint:     { color: c.textSoft, fontSize: 12, fontFamily: "Almarai_400Regular", textAlign: "center", marginTop: 10, marginBottom: 18, lineHeight: 19 },

  label:     { color: c.textSoft, fontSize: 12, fontFamily: "Almarai_700Bold", textAlign: "right", marginBottom: 7 },
  inputWrap: { backgroundColor: c.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.goldBorder, paddingHorizontal: 14, marginBottom: 14 },
  input:     { height: 50, color: c.text, fontSize: 15, fontFamily: "Almarai_400Regular" },

  btn:     { backgroundColor: c.gold, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  btnText: { color: c.bg, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
});