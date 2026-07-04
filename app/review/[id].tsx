import { useState } from "react";
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
            <CheckCircle2 size={64} color="#4CAF50" strokeWidth={1.6} />
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
          <ArrowRight size={20} color="#F2B233" />
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
                        color="#F2B233"
                        fill={active ? "#F2B233" : "transparent"}
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
                placeholderTextColor="#6D4E2D"
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
                <ActivityIndicator color="#17100B" />
              ) : (
                <>
                  <Send size={18} color="#17100B" strokeWidth={2} />
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

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17100B",
  },

  keyboardWrap: {
    flex: 1,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,178,51,0.1)",
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
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
  },

  headerBtnGhost: {
    width: 42,
    height: 42,
  },

  title: {
    color: "#FDF0DC",
    fontSize: 18,
    fontFamily: "Almarai_800ExtraBold",
  },

  content: {
    padding: 16,
    paddingBottom: 36,
  },

  card: {
    backgroundColor: "#21160D",
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
  },

  kicker: {
    color: "#F2B233",
    textAlign: "right",
    fontSize: 11,
    marginBottom: 6,
    fontFamily: "Almarai_800ExtraBold",
  },

  cardTitle: {
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 23,
    fontFamily: "Almarai_800ExtraBold",
  },

  cardSub: {
    color: "#A98961",
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
    backgroundColor: "#17100B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
  },

  starBtnActive: {
    backgroundColor: "rgba(242,178,51,0.1)",
    borderColor: "rgba(242,178,51,0.35)",
  },

  ratingText: {
    color: "#F2B233",
    textAlign: "center",
    fontSize: 15,
    marginTop: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  inputLabel: {
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 15,
    marginBottom: 10,
    fontFamily: "Almarai_800ExtraBold",
  },

  input: {
    minHeight: 130,
    borderRadius: 18,
    backgroundColor: "#17100B",
    color: "#FDF0DC",
    textAlignVertical: "top",
    padding: 14,
    fontSize: 14,
    lineHeight: 23,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    fontFamily: "Almarai_400Regular",
  },

  counter: {
    color: "#6D4E2D",
    textAlign: "left",
    marginTop: 8,
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  submitBtn: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: "#F2B233",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  submitBtnDisabled: {
    opacity: 0.75,
  },

  submitText: {
    color: "#17100B",
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
    backgroundColor: "rgba(76,175,80,0.1)",
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  doneTitle: {
    color: "#FDF0DC",
    textAlign: "center",
    fontSize: 24,
    fontFamily: "Almarai_800ExtraBold",
  },

  doneSub: {
    color: "#A98961",
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
    backgroundColor: "#F2B233",
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtnText: {
    color: "#17100B",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },
});