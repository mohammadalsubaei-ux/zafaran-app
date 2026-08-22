import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import { ArrowRight, CheckCircle2, Send, Star } from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

export default function ReviewScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const { id } = useLocalSearchParams();
  const orderId = Array.isArray(id) ? id[0] : id;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const submitReview = async () => {
    Keyboard.dismiss();

    if (!orderId) {
      Alert.alert("خطأ", "رقم الطلب غير موجود");
      return;
    }

    if (rating === 0) {
      Alert.alert("تنبيه", "اختر عدد النجوم أولًا");
      return;
    }

    const stored = await AsyncStorage.getItem("user");

    if (!stored) {
      Alert.alert("تنبيه", "سجل دخولك أولًا");
      router.replace("/login" as any);
      return;
    }

    let user: any = null;

    try {
      user = JSON.parse(stored);
    } catch {
      Alert.alert("خطأ", "بيانات المستخدم غير صحيحة، سجل دخولك من جديد");
      router.replace("/login" as any);
      return;
    }

    if (!user?.id) {
      Alert.alert("خطأ", "معرف المستخدم غير موجود");
      router.replace("/login" as any);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API}/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: user.id,
          rating,
          comment: comment.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
  Alert.alert(
    "خطأ",
    json?.message || `تعذر إرسال التقييم - HTTP ${res.status}`
  );
  return;
}

      setDone(true);
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) return null;

  if (done) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.doneWrap}>
          <View style={s.doneIcon}>
            <CheckCircle2 size={64} color={c.success} strokeWidth={1.6} />
          </View>

          <Text style={s.doneTitle}>شكرًا لتقييمك</Text>
          <Text style={s.doneSub}>رأيك يساعدنا نرفع جودة تجربة زعفران.</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={s.primaryBtn}
            onPress={() => router.replace(`/orders/${orderId}` as any)}
          >
            <Text style={s.primaryBtnText}>العودة لتفاصيل الطلب</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <ArrowRight size={20} color={c.gold} />
        </TouchableOpacity>

        <Text style={s.title}>تقييم الطلب</Text>

        <View style={s.headerBtnGhost} />
      </View>

      <KeyboardAvoidingView
        style={s.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
          >
            <View style={s.card}>
              <Text style={s.kicker}>تجربتك تهمنا</Text>
              <Text style={s.cardTitle}>كيف كان الطلب؟</Text>
              <Text style={s.cardSub}>قيّم جودة الطلب والتجربة بشكل عام.</Text>

              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= rating;

                  return (
                    <TouchableOpacity
                      key={n}
                      activeOpacity={0.75}
                      style={[s.starBtn, active && s.starBtnActive]}
                      onPress={() => setRating(n)}
                    >
                      <Star
                        size={34}
                        color={c.gold}
                        fill={active ? c.gold : "transparent"}
                        strokeWidth={1.7}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.ratingText}>
                {rating === 0
                  ? "اختر تقييمك"
                  : rating === 5
                  ? "ممتاز جدًا"
                  : rating === 4
                  ? "جيد جدًا"
                  : rating === 3
                  ? "جيد"
                  : rating === 2
                  ? "أقل من المتوقع"
                  : "تجربة غير مرضية"}
              </Text>
            </View>

            <View style={s.card}>
              <Text style={s.inputLabel}>تعليقك</Text>

              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="اكتب ملاحظتك عن الطلب..."
                placeholderTextColor={c.textMuted}
                style={s.input}
                textAlign="right"
                multiline
                maxLength={300}
                returnKeyType="done"
                blurOnSubmit
              />

              <Text style={s.counter}>{comment.length}/300</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[s.submitBtn, saving && s.submitBtnDisabled]}
              onPress={submitReview}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={c.onGold} />
              ) : (
                <>
                  <Send size={18} color={c.onGold} strokeWidth={2} />
                  <Text style={s.submitText}>إرسال التقييم</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
  },

  keyboardWrap: {
    flex: 1,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.goldSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
  },

  headerBtnGhost: {
    width: 42,
    height: 42,
  },

  title: {
    color: c.text,
    fontSize: 18,
    fontFamily: "Almarai_800ExtraBold",
  },

  content: {
    padding: 16,
    paddingBottom: 36,
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },

  kicker: {
    color: c.gold,
    textAlign: "right",
    fontSize: 11,
    marginBottom: 6,
    fontFamily: "Almarai_800ExtraBold",
  },

  cardTitle: {
    color: c.text,
    textAlign: "right",
    fontSize: 23,
    fontFamily: "Almarai_800ExtraBold",
  },

  cardSub: {
    color: c.textSoft,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 22,
    marginTop: 7,
    fontFamily: "Almarai_400Regular",
  },

  starsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 9,
    marginTop: 24,
  },

  starBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: c.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },

  starBtnActive: {
    backgroundColor: c.goldSoft,
    borderColor: c.goldBorder,
  },

  ratingText: {
    color: c.gold,
    textAlign: "center",
    fontSize: 15,
    marginTop: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  inputLabel: {
    color: c.text,
    textAlign: "right",
    fontSize: 15,
    marginBottom: 10,
    fontFamily: "Almarai_800ExtraBold",
  },

  input: {
    minHeight: 130,
    borderRadius: 18,
    backgroundColor: c.bg,
    color: c.text,
    textAlignVertical: "top",
    padding: 14,
    fontSize: 14,
    lineHeight: 23,
    borderWidth: 1,
    borderColor: c.goldSoft,
    fontFamily: "Almarai_400Regular",
  },

  counter: {
    color: c.textMuted,
    textAlign: "left",
    marginTop: 8,
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  submitBtn: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: c.gold,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  submitBtnDisabled: {
    opacity: 0.75,
  },

  submitText: {
    color: c.bg,
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  doneIcon: {
    width: 120,
    height: 120,
    borderRadius: 42,
    backgroundColor: c.successSoft,
    borderWidth: 1,
    borderColor: c.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  doneTitle: {
    color: c.text,
    textAlign: "center",
    fontSize: 24,
    fontFamily: "Almarai_800ExtraBold",
  },

  doneSub: {
    color: c.textSoft,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 22,
    fontFamily: "Almarai_400Regular",
  },

  primaryBtn: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: c.gold,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtnText: {
    color: c.bg,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },
});