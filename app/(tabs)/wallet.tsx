import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
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
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  LogIn,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";
const AMOUNTS = [10, 25, 50, 100, 200, 500];

type UserSession = {
  id?: string | number | null;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
};

type WalletTransaction = {
  id: string;
  type?: "credit" | "debit" | string | null;
  amount?: number | string | null;
  description?: string | null;
  created_at?: string | null;
  status?: string | null;
};

function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return `${numberValue(value).toFixed(2).replace(".00", "")} ريال`;
}

function cleanText(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function formatDate(value: unknown) {
  const raw = cleanText(value, "");
  if (!raw) return "غير محدد";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function txTypeLabel(type?: string | null) {
  if (type === "credit") return "إيداع";
  if (type === "debit") return "خصم";
  return "معاملة";
}

export default function WalletScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);

  const [user, setUser] = useState<UserSession | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chargingAmount, setChargingAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const totalCredit = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "credit")
      .reduce((sum, tx) => sum + numberValue(tx.amount), 0);
  }, [transactions]);

  const totalDebit = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + numberValue(tx.amount), 0);
  }, [transactions]);

  const readUser = useCallback(async () => {
    const stored = await AsyncStorage.getItem("user");

    if (!stored) {
      setUser(null);
      return null;
    }

    try {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      return parsed as UserSession;
    } catch {
      await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role", "cart_state"]);
      clearToken();
      setUser(null);
      return null;
    }
  }, []);

  const loadWallet = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const currentUser = await readUser();

        if (!currentUser?.id) {
          setBalance(0);
          setTransactions([]);
          return;
        }

        const response = await fetch(`${API}/api/wallet/${currentUser.id}`);

        let json: any = null;
        try {
          json = await response.json();
        } catch {
          json = null;
        }

        if (!response.ok) {
          setError(json?.message || `تعذر تحميل المحفظة. رمز الخطأ: ${response.status}`);
          return;
        }

        if (!json?.success) {
          setError(json?.message || "الخادم لم يرجع بيانات المحفظة بشكل صحيح.");
          return;
        }

        setBalance(numberValue(json?.data?.balance));
        setTransactions(Array.isArray(json?.data?.transactions) ? json.data.transactions : []);
      } catch {
        setError("تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة ثانية.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [readUser]
  );

  useEffect(() => {
    loadWallet(false);
  }, [loadWallet]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWallet(true);
  }, [loadWallet]);

  const goBack = useCallback(() => {
    // المحفظة بابها صفحة "حسابي" — الرجوع إليها دائماً
    // (back العادي عبر التبويبات يضيع ويرمي للرئيسية)
    router.push("/(tabs)/profile" as any);
  }, [router]);

  const openLogin = useCallback(() => {
    router.replace("/login" as any);
  }, [router]);

  const handleCharge = useCallback((amount: number) => {
    setChargingAmount(amount);

    Alert.alert("شحن المحفظة", `هل تريد شحن المحفظة بمبلغ ${money(amount)}؟`, [
      {
        text: "إلغاء",
        style: "cancel",
        onPress: () => setChargingAmount(null),
      },
      {
        text: "متابعة",
        onPress: () => {
          setChargingAmount(null);
          Alert.alert(
            "قريبًا",
            "ربط بوابة الدفع لم يتم تفعيله بعد. سيتم دعم الشحن الإلكتروني لاحقًا."
          );
        },
      },
    ]);
  }, []);

  const Header = useCallback(() => {
    return (
      <View>
        <View style={s.balanceCard}>
          <View style={s.balanceTop}>
            <View style={s.balanceBadge}>
              <ShieldCheck size={14} color={c.success} strokeWidth={1.8} />
              <Text style={s.balanceBadgeText}>محفظة آمنة</Text>
            </View>

            <View style={s.walletIcon}>
              <Wallet size={26} color={c.gold} strokeWidth={1.8} />
            </View>
          </View>

          <Text style={s.balanceLabel}>الرصيد المتاح</Text>
          <Text style={s.balanceAmount}>{money(balance).replace(" ريال", "")}</Text>
          <Text style={s.balanceCurrency}>ريال سعودي</Text>

          <View style={s.balanceFooter}>
            <View style={s.balanceMini}>
              <TrendingUp size={16} color={c.success} strokeWidth={1.8} />
              <Text style={s.balanceMiniLabel}>إجمالي الإيداع</Text>
              <Text style={s.balanceMiniValue}>{money(totalCredit)}</Text>
            </View>

            <View style={s.balanceMiniDivider} />

            <View style={s.balanceMini}>
              <TrendingDown size={16} color={c.danger} strokeWidth={1.8} />
              <Text style={s.balanceMiniLabel}>إجمالي الخصم</Text>
              <Text style={s.balanceMiniValue}>{money(totalDebit)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Zap size={17} color={c.gold} strokeWidth={1.8} />
            <Text style={s.sectionTitle}>شحن سريع</Text>
          </View>

          <View style={s.amountsGrid}>
            {AMOUNTS.map((amount) => {
              const active = chargingAmount === amount;

              return (
                <TouchableOpacity
                  key={amount}
                  activeOpacity={0.88}
                  style={[s.amountBtn, active && s.amountBtnActive]}
                  onPress={() => handleCharge(amount)}
                >
                  {active ? (
                    <ActivityIndicator size="small" color={c.onGold} />
                  ) : (
                    <>
                      <Plus size={16} color={c.gold} strokeWidth={2.2} />
                      <Text style={s.amountText}>{amount} ر</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <ReceiptText size={17} color={c.gold} strokeWidth={1.8} />
            <Text style={s.sectionTitle}>سجل المعاملات</Text>
          </View>

          {error ? (
            <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
              <RefreshCw size={17} color={c.gold} strokeWidth={1.8} />
              <View style={s.errorTextWrap}>
                <Text style={s.errorTitle}>حدثت مشكلة</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }, [c, s, balance, chargingAmount, error, handleCharge, onRefresh, totalCredit, totalDebit]);

  const renderTransaction = useCallback(({ item }: { item: WalletTransaction }) => {
    const isCredit = item.type === "credit";
    const amountColor = isCredit ? c.success : c.danger;
    const Icon = isCredit ? TrendingUp : TrendingDown;

    return (
      <View style={s.txCard}>
        <View style={[s.txIcon, { backgroundColor: isCredit ? c.successSoft : c.dangerSoft }]}>
          <Icon size={20} color={amountColor} strokeWidth={1.9} />
        </View>

        <View style={s.txInfo}>
          <Text style={s.txDesc} numberOfLines={1}>
            {cleanText(item.description, txTypeLabel(item.type))}
          </Text>

          <View style={s.txMetaRow}>
            <Clock3 size={12} color={c.textMuted} strokeWidth={1.7} />
            <Text style={s.txDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={s.txAmountWrap}>
          <Text style={[s.txAmount, { color: amountColor }]}>
            {isCredit ? "+" : "-"}{money(item.amount)}
          </Text>
          <Text style={s.txType}>{txTypeLabel(item.type)}</Text>
        </View>
      </View>
    );
  }, [c, s]);

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
          <Text style={s.loadingText}>جاري تحميل المحفظة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={goBack}>
            <ArrowRight size={20} color={c.gold} />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.title}>محفظتي</Text>
            <Text style={s.headerSub}>Zafaran Wallet</Text>
          </View>

          <View style={s.headerBtnGhost} />
        </View>

        <View style={s.guestWrap}>
          <View style={s.guestIcon}>
            <Wallet size={58} color={c.gold} strokeWidth={1.5} />
          </View>

          <Text style={s.guestTitle}>سجل دخولك أولًا</Text>
          <Text style={s.guestSub}>
            المحفظة مرتبطة بحسابك عشان نعرض الرصيد وسجل المعاملات بأمان.
          </Text>

          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={openLogin}>
            <LogIn size={18} color={c.onGold} strokeWidth={2} />
            <Text style={s.primaryBtnText}>تسجيل الدخول</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={goBack}>
          <ArrowRight size={20} color={c.gold} />
        </TouchableOpacity>

        <View style={s.headerTitleWrap}>
          <Text style={s.title}>محفظتي</Text>
          <Text style={s.headerSub}>Zafaran Wallet</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={onRefresh}>
          <RefreshCw size={18} color={c.gold} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={renderTransaction}
        ListHeaderComponent={Header}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.gold}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <CreditCard size={54} color={c.textMuted} strokeWidth={1.5} />
            </View>

            <Text style={s.emptyTitle}>لا توجد معاملات بعد</Text>
            <Text style={s.emptySub}>
              عند الشحن أو الدفع من المحفظة ستظهر العمليات هنا.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  loadingText: {
    color: c.text,
    fontSize: 14,
    fontFamily: "Almarai_700Bold",
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
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerBtnGhost: {
    width: 42,
    height: 42,
  },

  headerTitleWrap: {
    alignItems: "center",
  },

  title: {
    color: c.text,
    fontSize: 19,
    fontFamily: "Almarai_800ExtraBold",
  },

  headerSub: {
    marginTop: 3,
    color: c.textSoft,
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  listContent: {
    paddingBottom: 34,
  },

  balanceCard: {
    margin: 16,
    borderRadius: 32,
    padding: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  balanceTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  balanceBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  balanceBadgeText: {
    color: c.success,
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  walletIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },

  balanceLabel: {
    color: c.textSoft,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_400Regular",
  },

  balanceAmount: {
    color: c.gold,
    textAlign: "right",
    fontSize: 56,
    lineHeight: 66,
    marginTop: 4,
    fontFamily: "Almarai_800ExtraBold",
  },

  balanceCurrency: {
    color: c.textSoft,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },

  balanceFooter: {
    marginTop: 20,
    borderRadius: 22,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.goldSoft,
    padding: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  balanceMini: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  balanceMiniDivider: {
    width: 1,
    height: 48,
    backgroundColor: c.goldSoft,
  },

  balanceMiniLabel: {
    color: c.textMuted,
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
  },

  balanceMiniValue: {
    color: c.text,
    fontSize: 12,
    fontFamily: "Almarai_800ExtraBold",
  },

  section: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },

  sectionTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    color: c.text,
    textAlign: "right",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  amountsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },

  amountBtn: {
    width: "31%",
    minHeight: 58,
    borderRadius: 19,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 6,
  },

  amountBtnActive: {
    backgroundColor: c.gold,
  },

  amountText: {
    color: c.gold,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    padding: 13,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
  },

  errorTextWrap: {
    flex: 1,
  },

  errorTitle: {
    color: c.danger,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorText: {
    color: c.danger,
    textAlign: "right",
    marginTop: 3,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: "Almarai_400Regular",
  },

  txCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: c.surface,
    borderRadius: 21,
    padding: 13,
    borderWidth: 1,
    borderColor: c.goldSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
  },

  txIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  txInfo: {
    flex: 1,
  },

  txDesc: {
    color: c.text,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  txMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },

  txDate: {
    color: c.textMuted,
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  txAmountWrap: {
    alignItems: "flex-start",
  },

  txAmount: {
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  txType: {
    marginTop: 3,
    color: c.textMuted,
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 38,
    paddingHorizontal: 26,
  },

  emptyIcon: {
    width: 104,
    height: 104,
    borderRadius: 36,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.goldSoft,
    marginBottom: 18,
  },

  emptyTitle: {
    color: c.text,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    color: c.textSoft,
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
    lineHeight: 21,
    fontFamily: "Almarai_400Regular",
  },

  guestWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  guestIcon: {
    width: 118,
    height: 118,
    borderRadius: 40,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  guestTitle: {
    color: c.text,
    textAlign: "center",
    fontSize: 21,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestSub: {
    color: c.textSoft,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 24,
    marginTop: 9,
    marginBottom: 22,
    fontFamily: "Almarai_400Regular",
  },

  primaryBtn: {
    minWidth: 190,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: c.gold,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },

  primaryBtnText: {
    color: c.bg,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },
});