import { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowRight, Wallet, X, Landmark } from "lucide-react-native";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const makeWStatus = (c: Colors): Record<string, { label: string; color: string }> => ({
  pending:  { label: "قيد المراجعة", color: c.gold },
  approved: { label: "تم التحويل",   color: c.success },
  rejected: { label: "مرفوض",        color: c.danger },
});

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

export default function ChefEarnings() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const wStatus = useMemo(() => makeWStatus(c), [c]);

  const saveBank = async () => {
    if (!chefId || savingBank) return;

    const clean = iban.replace(/\s+/g, "").toUpperCase();
    if (!/^SA\d{22}$/.test(clean)) {
      Alert.alert("آيبان غير صحيح", "الآيبان السعودي يبدأ بـ SA ويتكوّن من 24 خانة.");
      return;
    }
    if (accName.trim().length < 3) {
      Alert.alert("الاسم مطلوب", "اكتب اسم صاحب الحساب كما هو في البنك.");
      return;
    }

    setSavingBank(true);
    try {
      const res = await fetch(`${API}/api/chefs/${chefId}/bank`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban: clean, bank_account_name: accName.trim() }),
      });
      const json = await res.json().catch(() => null);

      if (json?.success) {
        setIban(clean);
        setShowBank(false);
        Alert.alert("تم الحفظ", "بيانات التحويل محفوظة — أعد إرسال طلب السحب.");
      } else {
        Alert.alert("تنبيه", json?.message || "تعذر الحفظ");
      }
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالسيرفر");
    } finally {
      setSavingBank(false);
    }
  };
  const [userId, setUserId]             = useState<string | null>(null);
  const [wallet, setWallet]             = useState<any>(null);
  const [withdrawals, setWithdrawals]   = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [amount, setAmount]             = useState("");
  const [inputKey, setInputKey]         = useState(0);

  // بيانات التحويل — تُطلب عند أول سحب لا عند التسجيل
  const [chefId, setChefId]             = useState<string | null>(null);
  const [showBank, setShowBank]         = useState(false);
  const [iban, setIban]                 = useState("");
  const [accName, setAccName]           = useState("");
  const [savingBank, setSavingBank]     = useState(false);

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const loadAll = useCallback(async (uid: string) => {
    try {
      const [wRes, wdRes, txRes, chefRes] = await Promise.all([
        fetch(`${API}/api/wallet/${uid}`).then((r) => r.json()),
        fetch(`${API}/api/wallet/${uid}/withdrawals`).then((r) => r.json()),
        fetch(`${API}/api/wallet/${uid}/transactions?limit=20`).then((r) => r.json()),
        fetch(`${API}/api/chefs?user_id=${uid}`).then((r) => r.json()).catch(() => null),
      ]);

      if (chefRes?.success && Array.isArray(chefRes.data) && chefRes.data.length > 0) {
        const ch = chefRes.data[0];
        setChefId(ch.id);
        setIban(ch.iban || "");
        setAccName(ch.bank_account_name || "");
      }
      if (wRes?.success) setWallet(wRes.data);
      if (wdRes?.success) setWithdrawals(wdRes.data || []);
      if (txRes?.success) setTransactions(txRes.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("user");
      const uid = stored ? JSON.parse(stored)?.id : null;
      if (!uid) { router.replace("/login"); return; }
      setUserId(uid);
      await loadAll(uid);
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadAll(userId);
    setRefreshing(false);
  };

  const requestWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) { Alert.alert("تنبيه", "ادخل مبلغا صحيحا"); return; }
    if (!userId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/wallet/${userId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("تم", "تم إرسال طلب السحب وسنعلمك فور معالجته");
        setAmount("");
        setInputKey((k) => k + 1);
        await loadAll(userId);
      } else if (json?.code === "BANK_REQUIRED") {
        setShowBank(true);
      } else {
        Alert.alert("تنبيه", json.message || "تعذر إرسال الطلب");
      }
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالسيرفر");
    } finally {
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  const available = Number(wallet?.available_balance || 0);
  const pendingBal = Number(wallet?.pending_balance || 0);
  const minAmount = Number(wallet?.min_withdrawal_amount || 200);
  const pendingReq = wallet?.pending_withdrawal;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={{ width: 38 }} />
        <Text style={s.title}>الأرباح والمحفظة</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowRight size={20} color={c.gold} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={c.gold} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
        >
          <View style={s.balanceCard}>
            <View style={s.balanceIconRow}>
              <Wallet size={20} color={c.gold} />
              <Text style={s.balanceLabel}>الرصيد المتاح للسحب</Text>
            </View>
            <Text style={s.balanceValue}>{available.toFixed(2)} <Text style={s.currency}>ر.س</Text></Text>
            {pendingBal > 0 ? (
              <Text style={s.balanceSub}>قيد التسوية: {pendingBal.toFixed(2)} ر.س</Text>
            ) : null}
            <Text style={s.minNote}>الحد الأدنى للسحب {minAmount} ريال</Text>
          </View>

          {pendingReq ? (
            <View style={s.pendingBanner}>
              <Text style={s.pendingBannerText}>
                لديك طلب سحب بمبلغ {Number(pendingReq.amount).toFixed(2)} ر.س قيد المراجعة
              </Text>
            </View>
          ) : (
            <View style={s.requestCard}>
              <Text style={s.sectionTitle}>طلب سحب</Text>
              <View style={s.requestRow}>
                <TouchableOpacity
                  style={[s.requestBtn, (submitting || available < minAmount) && { opacity: 0.5 }]}
                  onPress={requestWithdraw}
                  disabled={submitting || available < minAmount}
                >
                  {submitting
                    ? <ActivityIndicator color={c.surface} size="small" />
                    : <Text style={s.requestBtnText}>طلب سحب</Text>}
                </TouchableOpacity>
                <View style={s.amountWrap}>
                  <TextInput
                    key={inputKey}
                    style={s.amountInput}
                    placeholder="المبلغ"
                    placeholderTextColor={c.textMuted}
                    keyboardType="decimal-pad"
                    onChangeText={setAmount}
                    textAlign="center"
                  />
                </View>
              </View>
              {available < minAmount ? (
                <Text style={s.hintText}>رصيدك الحالي أقل من الحد الأدنى — استمر بالإنتاج وستصل قريباً</Text>
              ) : null}
            </View>
          )}

          <Text style={s.sectionTitle}>طلبات السحب</Text>
          {withdrawals.length === 0 ? (
            <Text style={s.emptyText}>ما فيه طلبات سحب بعد</Text>
          ) : withdrawals.map((w) => {
            const meta = wStatus[w.status] || { label: w.status, color: c.textSoft };
            return (
              <View key={w.id} style={s.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowAmount}>{Number(w.amount).toFixed(2)} ر.س</Text>
                  <Text style={s.rowDate}>{fmtDate(w.requested_at)}</Text>
                  {w.reject_reason ? <Text style={s.rejectReason}>السبب: {w.reject_reason}</Text> : null}
                </View>
                <Text style={[s.statusChip, { color: meta.color, borderColor: meta.color }]}>{meta.label}</Text>
              </View>
            );
          })}

          <Text style={s.sectionTitle}>آخر الحركات</Text>
          {transactions.length === 0 ? (
            <Text style={s.emptyText}>ما فيه حركات بعد — أرباحك من الطلبات المسلّمة بتظهر هنا</Text>
          ) : transactions.map((t) => {
            const isOut = t.type === "withdrawal";
            return (
              <View key={t.id} style={s.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.txDesc}>{t.description || t.type}</Text>
                  <Text style={s.rowDate}>{fmtDate(t.created_at)}</Text>
                </View>
                <Text style={[s.txAmount, { color: isOut ? c.danger : c.success }]}>
                  {isOut ? "-" : "+"}{Number(t.amount).toFixed(2)} ر.س
                </Text>
              </View>
            );
          })}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
      <Modal visible={showBank} animationType="slide" transparent onRequestClose={() => setShowBank(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
        <TouchableOpacity activeOpacity={1} style={s.bankOverlay} onPress={() => setShowBank(false)}>
          <TouchableOpacity activeOpacity={1} style={s.bankSheet} onPress={() => {}}>
            <TouchableOpacity style={s.bankClose} onPress={() => setShowBank(false)}>
              <X size={20} color={c.textSoft} />
            </TouchableOpacity>

            <View style={s.bankIcon}>
              <Landmark size={26} color={c.gold} strokeWidth={1.7} />
            </View>

            <Text style={s.bankTitle}>بيانات التحويل</Text>
            <Text style={s.bankSub}>
              نحتاجها لتحويل أرباحك. تُحفظ مرة واحدة، ولا تظهر لأحد غير إدارة زعفران.
            </Text>

            <Text style={s.bankLabel}>رقم الآيبان</Text>
            <TextInput
              style={s.bankInput}
              placeholder="SA0000000000000000000000"
              placeholderTextColor={c.textMuted}
              autoCapitalize="characters"
              value={iban}
              onChangeText={setIban}
            />

            <Text style={s.bankLabel}>اسم صاحب الحساب</Text>
            <TextInput
              style={[s.bankInput, { textAlign: "right" }]}
              placeholder="الاسم كما هو في البنك"
              placeholderTextColor={c.textMuted}
              value={accName}
              onChangeText={setAccName}
            />

            <Text style={s.bankNote}>
              يجب أن يطابق الاسم صاحب الحساب البنكي، وإلا رفض البنك التحويل.
            </Text>

            <TouchableOpacity style={s.bankSave} onPress={saveBank} disabled={savingBank}>
              {savingBank
                ? <ActivityIndicator color={c.onGold} />
                : <Text style={s.bankSaveText}>حفظ</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  bankOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  bankSheet: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingTop: 44, paddingBottom: 34, borderWidth: 1, borderColor: c.border },
  bankClose: { position: "absolute", top: 10, left: 10, padding: 10, zIndex: 5 },
  bankIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  bankTitle: { color: c.text, fontSize: 19, textAlign: "center", marginTop: 14, fontFamily: "Almarai_800ExtraBold" },
  bankSub: { color: c.textSoft, fontSize: 12.5, lineHeight: 22, textAlign: "center", marginTop: 8, marginBottom: 8, fontFamily: "Almarai_400Regular" },
  bankLabel: { color: c.textSoft, fontSize: 12, textAlign: "right", marginTop: 14, marginBottom: 7, fontFamily: "Almarai_700Bold" },
  bankInput: { minHeight: 50, borderRadius: 14, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, color: c.text, fontSize: 14, textAlign: "left", fontFamily: "Almarai_400Regular" },
  bankNote: { color: c.textMuted, fontSize: 11, lineHeight: 19, textAlign: "right", marginTop: 10, fontFamily: "Almarai_400Regular" },
  bankSave: { marginTop: 18, minHeight: 52, borderRadius: 16, backgroundColor: c.goldSolid, alignItems: "center", justifyContent: "center" },
  bankSaveText: { color: c.onGold, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  safe:        { flex: 1, backgroundColor: c.bg },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  title:       { color: c.text, fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll:      { paddingHorizontal: 16, paddingBottom: 20 },

  balanceCard: { backgroundColor: c.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: c.goldBorder, marginBottom: 14 },
  balanceIconRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  balanceLabel: { color: c.textSoft, fontSize: 13, fontFamily: "Almarai_400Regular" },
  balanceValue: { color: c.text, fontSize: 34, fontFamily: "Almarai_800ExtraBold", textAlign: "right", marginTop: 6 },
  currency:    { fontSize: 16, color: c.gold },
  balanceSub:  { color: c.textSoft, fontSize: 12, textAlign: "right", marginTop: 2, fontFamily: "Almarai_400Regular" },
  minNote:     { color: c.textMuted, fontSize: 11, textAlign: "right", marginTop: 8, fontFamily: "Almarai_400Regular" },

  pendingBanner:     { backgroundColor: c.goldSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.goldBorder, marginBottom: 14 },
  pendingBannerText: { color: c.gold, fontSize: 13, textAlign: "right", fontFamily: "Almarai_700Bold" },

  requestCard:    { backgroundColor: c.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.goldBorder, marginBottom: 6 },
  requestRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  amountWrap:     { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: c.goldBorder },
  amountInput:    { height: 48, color: c.text, fontSize: 16, fontFamily: "Almarai_700Bold" },
  requestBtn:     { backgroundColor: c.gold, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22 },
  requestBtnText: { color: c.surface, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  hintText:       { color: c.textSoft, fontSize: 11, textAlign: "right", marginTop: 10, fontFamily: "Almarai_400Regular" },

  sectionTitle: { color: c.gold, fontSize: 14, fontFamily: "Almarai_800ExtraBold", textAlign: "right", marginTop: 16, marginBottom: 8 },
  emptyText:    { color: c.textMuted, fontSize: 12, textAlign: "right", fontFamily: "Almarai_400Regular" },

  rowCard:   { flexDirection: "row", alignItems: "center", backgroundColor: c.bg, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.goldSoft, gap: 10 },
  rowAmount: { color: c.text, fontSize: 15, fontFamily: "Almarai_700Bold", textAlign: "right" },
  rowDate:   { color: c.textMuted, fontSize: 11, textAlign: "right", marginTop: 2, fontFamily: "Almarai_400Regular" },
  rejectReason: { color: c.danger, fontSize: 11, textAlign: "right", marginTop: 4, fontFamily: "Almarai_400Regular" },
  statusChip: { fontSize: 11, fontFamily: "Almarai_700Bold", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  txDesc:     { color: c.text, fontSize: 13, fontFamily: "Almarai_400Regular", textAlign: "right" },
  txAmount:   { fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
});