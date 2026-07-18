import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronRight, KeyRound } from "lucide-react-native";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

export default function ChangePassword() {
  const router = useRouter();
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
        <View style={{ width: 26 }} />
        <Text style={s.title}>تغيير كلمة المرور</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronRight size={24} color="#F2B233" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.heroIcon}>
          <KeyRound size={26} color="#F2B233" strokeWidth={1.7} />
        </View>
        <Text style={s.hint}>اختر كلمة مرور قوية لا تشاركها مع أحد — 6 أحرف على الأقل</Text>

        <Text style={s.label}>كلمة المرور الحالية</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="••••••"
            placeholderTextColor="#5A3A18"
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
            placeholderTextColor="#5A3A18"
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
            placeholderTextColor="#5A3A18"
            secureTextEntry
            onChangeText={setConfirmPw}
            textAlign="right"
          />
        </View>

        <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0E0700" size="small" />
            : <Text style={s.btnText}>حفظ كلمة المرور</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: "#0E0700" },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  title:   { color: "#FDF0DC", fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  scroll:  { paddingHorizontal: 20, paddingBottom: 24 },

  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(242,178,51,0.1)", alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 8 },
  hint:     { color: "#A98961", fontSize: 12, fontFamily: "Almarai_400Regular", textAlign: "center", marginTop: 10, marginBottom: 18, lineHeight: 19 },

  label:     { color: "#C9A15E", fontSize: 12, fontFamily: "Almarai_700Bold", textAlign: "right", marginBottom: 7 },
  inputWrap: { backgroundColor: "#251400", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 14, marginBottom: 14 },
  input:     { height: 50, color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_400Regular" },

  btn:     { backgroundColor: "#F2B233", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  btnText: { color: "#0E0700", fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
});