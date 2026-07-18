import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowRight, Wallet } from "lucide-react-native";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const W_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: "قيد المراجعة", color: "#F0A500" },
  approved: { label: "تم التحويل",   color: "#4CAF50" },
  rejected: { label: "مرفوض",        color: "#E53935" },
};

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

export default function ChefEarnings() {
  const router = useRouter();
  const [userId, setUserId]             = useState<string | null>(null);
  const [wallet, setWallet]             = useState<any>(null);
  const [withdrawals, setWithdrawals]   = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [amount, setAmount]             = useState("");
  const [inputKey, setInputKey]         = useState(0);

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const loadAll = useCallback(async (uid: string) => {
    try {
      const [wRes, wdRes, txRes] = await Promise.all([
        fetch(`${API}/api/wallet/${uid}`).then((r) => r.json()),
        fetch(`${API}/api/wallet/${uid}/withdrawals`).then((r) => r.json()),
        fetch(`${API}/api/wallet/${uid}/transactions?limit=20`).then((r) => r.json()),
      ]);
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
          <ArrowRight size={20} color="#F0A500" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color="#F0A500" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F0A500" />}
        >
          <View style={s.balanceCard}>
            <View style={s.balanceIconRow}>
              <Wallet size={20} color="#F0A500" />
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
                    ? <ActivityIndicator color="#1C0F00" size="small" />
                    : <Text style={s.requestBtnText}>طلب سحب</Text>}
                </TouchableOpacity>
                <View style={s.amountWrap}>
                  <TextInput
                    key={inputKey}
                    style={s.amountInput}
                    placeholder="المبلغ"
                    placeholderTextColor="#5A3A18"
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
            const meta = W_STATUS[w.status] || { label: w.status, color: "#A98961" };
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
                <Text style={[s.txAmount, { color: isOut ? "#E53935" : "#4CAF50" }]}>
                  {isOut ? "-" : "+"}{Number(t.amount).toFixed(2)} ر.س
                </Text>
              </View>
            );
          })}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: "#0E0700" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: "rgba(242,178,51,0.25)", alignItems: "center", justifyContent: "center" },
  title:       { color: "#FDF0DC", fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll:      { paddingHorizontal: 16, paddingBottom: 20 },

  balanceCard: { backgroundColor: "#1C1208", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", marginBottom: 14 },
  balanceIconRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  balanceLabel: { color: "#A98961", fontSize: 13, fontFamily: "Almarai_400Regular" },
  balanceValue: { color: "#FDF0DC", fontSize: 34, fontFamily: "Almarai_800ExtraBold", textAlign: "right", marginTop: 6 },
  currency:    { fontSize: 16, color: "#F0A500" },
  balanceSub:  { color: "#A98961", fontSize: 12, textAlign: "right", marginTop: 2, fontFamily: "Almarai_400Regular" },
  minNote:     { color: "#5A3A18", fontSize: 11, textAlign: "right", marginTop: 8, fontFamily: "Almarai_400Regular" },

  pendingBanner:     { backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.3)", marginBottom: 14 },
  pendingBannerText: { color: "#F0A500", fontSize: 13, textAlign: "right", fontFamily: "Almarai_700Bold" },

  requestCard:    { backgroundColor: "#1C1208", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", marginBottom: 6 },
  requestRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  amountWrap:     { flex: 1, backgroundColor: "#251400", borderRadius: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)" },
  amountInput:    { height: 48, color: "#FDF0DC", fontSize: 16, fontFamily: "Almarai_700Bold" },
  requestBtn:     { backgroundColor: "#F0A500", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22 },
  requestBtnText: { color: "#1C0F00", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  hintText:       { color: "#A98961", fontSize: 11, textAlign: "right", marginTop: 10, fontFamily: "Almarai_400Regular" },

  sectionTitle: { color: "#F0A500", fontSize: 14, fontFamily: "Almarai_800ExtraBold", textAlign: "right", marginTop: 16, marginBottom: 8 },
  emptyText:    { color: "#5A3A18", fontSize: 12, textAlign: "right", fontFamily: "Almarai_400Regular" },

  rowCard:   { flexDirection: "row", alignItems: "center", backgroundColor: "#17100B", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(240,165,0,0.08)", gap: 10 },
  rowAmount: { color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_700Bold", textAlign: "right" },
  rowDate:   { color: "#5A3A18", fontSize: 11, textAlign: "right", marginTop: 2, fontFamily: "Almarai_400Regular" },
  rejectReason: { color: "#E57373", fontSize: 11, textAlign: "right", marginTop: 4, fontFamily: "Almarai_400Regular" },
  statusChip: { fontSize: 11, fontFamily: "Almarai_700Bold", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  txDesc:     { color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_400Regular", textAlign: "right" },
  txAmount:   { fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
});