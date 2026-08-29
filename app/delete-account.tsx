import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearToken } from "@/utils/authFetch";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import { AlertTriangle, ArrowRight, Info, Trash2 } from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

type Blocker = { code: string; message: string };

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);

  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [confirmPhone, setConfirmPhone] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  // فحص الموانع أولاً — نعرض الأسباب بدل مفاجأة المستخدم برفض عند الضغط
  const runCheck = useCallback(async () => {
    setChecking(true);

    try {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) {
        router.replace("/login" as any);
        return;
      }

      const user = JSON.parse(stored);
      if (!user?.id) {
        router.replace("/login" as any);
        return;
      }

      setUserId(String(user.id));

      const res = await fetch(`${API}/api/users/${user.id}/deletion-check`);
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json.data) {
        setBlockers(Array.isArray(json.data.blockers) ? json.data.blockers : []);
        setCanDelete(Boolean(json.data.can_delete));
      } else {
        setBlockers([
          { code: "network", message: json?.message || "تعذر التحقق من حالة حسابك — حاول لاحقاً" },
        ]);
        setCanDelete(false);
      }
    } catch {
      setBlockers([{ code: "network", message: "تعذر الاتصال بالخادم — تأكد من الإنترنت" }]);
      setCanDelete(false);
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const doDelete = useCallback(async () => {
    if (!userId || deleting) return;

    if (!confirmPhone.trim()) {
      Alert.alert("تنبيه", "اكتب رقم جوالك لتأكيد الحذف");
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`${API}/api/users/${userId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_phone: confirmPhone.trim() }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role", "push_token", "cart_state"]);
      clearToken();
        Alert.alert("تم حذف حسابك", "نشكرك على استخدامك زعفران", [
          { text: "حسناً", onPress: () => router.replace("/login" as any) },
        ]);
        return;
      }

      Alert.alert("تعذر الحذف", json?.message || "حاول مرة ثانية");
      // الرفض قد يكون بسبب مانع جديد ظهر — نعيد الفحص لعرضه
      runCheck();
    } catch {
      Alert.alert("مشكلة اتصال", "تأكد من الإنترنت وحاول مرة ثانية");
    } finally {
      setDeleting(false);
    }
  }, [deleting, confirmPhone, router, runCheck, userId]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      "حذف الحساب نهائياً",
      "بعد الحذف لن تتمكن من الدخول لحسابك، وستفقد عناوينك المحفوظة ومفضلاتك.\n\nهل أنت متأكد؟",
      [
        { text: "تراجع", style: "cancel" },
        { text: "نعم، احذف حسابي", style: "destructive", onPress: doDelete },
      ]
    );
  }, [doDelete]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.85} style={s.backBtn} onPress={() => router.back()}>
          <ArrowRight size={20} color={c.gold} strokeWidth={1.9} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>حذف الحساب</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.iconWrap}>
            <Trash2 size={40} color={c.danger} strokeWidth={1.5} />
          </View>

          <Text style={s.title}>حذف حسابك من زعفران</Text>

          {checking ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={c.gold} size="large" />
              <Text style={s.loadingText}>جاري التحقق من حالة حسابك...</Text>
            </View>
          ) : (
            <>
              {/* الموانع — تُعرض بوضوح مع سبب كل واحد */}
              {blockers.length > 0 ? (
                <View style={s.blockersCard}>
                  <View style={s.blockersHead}>
                    <AlertTriangle size={18} color={c.gold} strokeWidth={1.9} />
                    <Text style={s.blockersTitle}>ما نقدر نحذف حسابك حالياً</Text>
                  </View>

                  {blockers.map((b, i) => (
                    <View key={b.code + i} style={s.blockerRow}>
                      <View style={s.blockerDot} />
                      <Text style={s.blockerText}>{b.message}</Text>
                    </View>
                  ))}

                  <TouchableOpacity activeOpacity={0.86} style={s.recheckBtn} onPress={runCheck}>
                    <Text style={s.recheckText}>إعادة التحقق</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* ما سيحدث بعد الحذف — شفافية مطلوبة قبل قرار لا رجعة فيه */}
              <View style={s.infoCard}>
                <View style={s.infoHead}>
                  <Info size={17} color={c.textSoft} strokeWidth={1.8} />
                  <Text style={s.infoTitle}>وش يصير بعد الحذف</Text>
                </View>

                <Text style={s.infoLine}>• ما تقدر تدخل حسابك مرة ثانية</Text>
                <Text style={s.infoLine}>• تُحذف عناوينك المحفوظة ومفضلاتك</Text>
                <Text style={s.infoLine}>• يختفي اسمك وصورتك ورقمك من التطبيق</Text>
                <Text style={s.infoLine}>• تبقى سجلات طلباتك السابقة للأغراض المحاسبية فقط</Text>
                <Text style={s.infoLine}>• تقدر تسجل حساب جديد بنفس رقمك متى شئت</Text>
              </View>

              {canDelete ? (
                <View style={s.confirmCard}>
                  <Text style={s.label}>اكتب رقم جوالك للتأكيد</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={s.input}
                      placeholder="05xxxxxxxx"
                      placeholderTextColor={c.textMuted}
                      keyboardType="phone-pad"
                      value={confirmPhone}
                      onChangeText={setConfirmPhone}
                      textAlign="right"
                      maxLength={12}
                    />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[s.deleteBtn, deleting && s.deleteBtnDisabled]}
                    onPress={confirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={s.deleteBtnText}>حذف حسابي نهائياً</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.85}
                style={s.cancelBtn}
                onPress={() => router.back()}
              >
                <Text style={s.cancelText}>تراجع والاحتفاظ بحسابي</Text>
              </TouchableOpacity>
            </>
          )}
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

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.goldSoft,
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

  scroll: {
    padding: 22,
    paddingBottom: 44,
  },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 32,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
    marginBottom: 18,
  },

  title: {
    color: c.text,
    fontSize: 20,
    textAlign: "center",
    marginBottom: 22,
    fontFamily: "Almarai_800ExtraBold",
  },

  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 14,
  },

  loadingText: {
    color: c.textSoft,
    fontSize: 13,
    fontFamily: "Almarai_400Regular",
  },

  blockersCard: {
    backgroundColor: c.goldSoft,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: c.goldBorder,
    marginBottom: 16,
  },

  blockersHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  blockersTitle: {
    color: c.gold,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  blockerRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 9,
  },

  blockerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.gold,
    marginTop: 7,
  },

  blockerText: {
    flex: 1,
    color: c.gold,
    fontSize: 12.5,
    lineHeight: 21,
    textAlign: "right",
    fontFamily: "Almarai_400Regular",
  },

  recheckBtn: {
    marginTop: 6,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  recheckText: {
    color: c.gold,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  infoCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 16,
  },

  infoHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  infoTitle: {
    color: c.text,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  infoLine: {
    color: c.textSoft,
    fontSize: 12.5,
    lineHeight: 24,
    textAlign: "right",
    fontFamily: "Almarai_400Regular",
  },

  confirmCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: c.dangerSoft,
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
    marginBottom: 16,
  },

  input: {
    height: 50,
    color: c.text,
    fontSize: 15,
    fontFamily: "Almarai_400Regular",
  },

  deleteBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: c.danger,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteBtnDisabled: {
    opacity: 0.7,
  },

  deleteBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  cancelBtn: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 12,
  },

  cancelText: {
    color: c.gold,
    fontSize: 14,
    fontFamily: "Almarai_700Bold",
  },
});