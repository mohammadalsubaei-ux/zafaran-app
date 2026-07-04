import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
      await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
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
    router.back();
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
              <ShieldCheck size={14} color="#4CAF50" strokeWidth={1.8} />
              <Text style={s.balanceBadgeText}>محفظة آمنة</Text>
            </View>

            <View style={s.walletIcon}>
              <Wallet size={26} color="#F2B233" strokeWidth={1.8} />
            </View>
          </View>

          <Text style={s.balanceLabel}>الرصيد المتاح</Text>
          <Text style={s.balanceAmount}>{money(balance).replace(" ريال", "")}</Text>
          <Text style={s.balanceCurrency}>ريال سعودي</Text>

          <View style={s.balanceFooter}>
            <View style={s.balanceMini}>
              <TrendingUp size={16} color="#4CAF50" strokeWidth={1.8} />
              <Text style={s.balanceMiniLabel}>إجمالي الإيداع</Text>
              <Text style={s.balanceMiniValue}>{money(totalCredit)}</Text>
            </View>

            <View style={s.balanceMiniDivider} />

            <View style={s.balanceMini}>
              <TrendingDown size={16} color="#E53935" strokeWidth={1.8} />
              <Text style={s.balanceMiniLabel}>إجمالي الخصم</Text>
              <Text style={s.balanceMiniValue}>{money(totalDebit)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Zap size={17} color="#F2B233" strokeWidth={1.8} />
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
                    <ActivityIndicator size="small" color="#17100B" />
                  ) : (
                    <>
                      <Plus size={16} color="#F2B233" strokeWidth={2.2} />
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
            <ReceiptText size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.sectionTitle}>سجل المعاملات</Text>
          </View>

          {error ? (
            <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
              <RefreshCw size={17} color="#F2B233" strokeWidth={1.8} />
              <View style={s.errorTextWrap}>
                <Text style={s.errorTitle}>حدثت مشكلة</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }, [balance, chargingAmount, error, handleCharge, onRefresh, totalCredit, totalDebit]);

  const renderTransaction = useCallback(({ item }: { item: WalletTransaction }) => {
    const isCredit = item.type === "credit";
    const amountColor = isCredit ? "#4CAF50" : "#E53935";
    const Icon = isCredit ? TrendingUp : TrendingDown;

    return (
      <View style={s.txCard}>
        <View style={[s.txIcon, { backgroundColor: isCredit ? "rgba(76,175,80,0.1)" : "rgba(229,57,53,0.1)" }]}>
          <Icon size={20} color={amountColor} strokeWidth={1.9} />
        </View>

        <View style={s.txInfo}>
          <Text style={s.txDesc} numberOfLines={1}>
            {cleanText(item.description, txTypeLabel(item.type))}
          </Text>

          <View style={s.txMetaRow}>
            <Clock3 size={12} color="#6D4E2D" strokeWidth={1.7} />
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
  }, []);

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
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
            <ArrowRight size={20} color="#F2B233" />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.title}>محفظتي</Text>
            <Text style={s.headerSub}>Zafaran Wallet</Text>
          </View>

          <View style={s.headerBtnGhost} />
        </View>

        <View style={s.guestWrap}>
          <View style={s.guestIcon}>
            <Wallet size={58} color="#F2B233" strokeWidth={1.5} />
          </View>

          <Text style={s.guestTitle}>سجل دخولك أولًا</Text>
          <Text style={s.guestSub}>
            المحفظة مرتبطة بحسابك عشان نعرض الرصيد وسجل المعاملات بأمان.
          </Text>

          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={openLogin}>
            <LogIn size={18} color="#17100B" strokeWidth={2} />
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
          <ArrowRight size={20} color="#F2B233" />
        </TouchableOpacity>

        <View style={s.headerTitleWrap}>
          <Text style={s.title}>محفظتي</Text>
          <Text style={s.headerSub}>Zafaran Wallet</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={onRefresh}>
          <RefreshCw size={18} color="#F2B233" strokeWidth={1.8} />
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
            tintColor="#F2B233"
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <CreditCard size={54} color="#5A3A18" strokeWidth={1.5} />
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

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17100B",
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  loadingText: {
    color: "#FDF0DC",
    fontSize: 14,
    fontFamily: "Almarai_700Bold",
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
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
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
    color: "#FDF0DC",
    fontSize: 19,
    fontFamily: "Almarai_800ExtraBold",
  },

  headerSub: {
    marginTop: 3,
    color: "#8A6030",
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
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.16)",
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
    backgroundColor: "rgba(76,175,80,0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  balanceBadgeText: {
    color: "#8AF0A5",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  walletIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
  },

  balanceLabel: {
    color: "#A98961",
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_400Regular",
  },

  balanceAmount: {
    color: "#F2B233",
    textAlign: "right",
    fontSize: 56,
    lineHeight: 66,
    marginTop: 4,
    fontFamily: "Almarai_800ExtraBold",
  },

  balanceCurrency: {
    color: "#A98961",
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },

  balanceFooter: {
    marginTop: 20,
    borderRadius: 22,
    backgroundColor: "#17100B",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
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
    backgroundColor: "rgba(242,178,51,0.1)",
  },

  balanceMiniLabel: {
    color: "#6D4E2D",
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
  },

  balanceMiniValue: {
    color: "#FDF0DC",
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
    color: "#FDF0DC",
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
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 6,
  },

  amountBtnActive: {
    backgroundColor: "#F2B233",
  },

  amountText: {
    color: "#F2B233",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    padding: 13,
    backgroundColor: "#321717",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.22)",
  },

  errorTextWrap: {
    flex: 1,
  },

  errorTitle: {
    color: "#FFB0B0",
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorText: {
    color: "#FFCECE",
    textAlign: "right",
    marginTop: 3,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: "Almarai_400Regular",
  },

  txCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#21160D",
    borderRadius: 21,
    padding: 13,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
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
    color: "#FDF0DC",
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
    color: "#6D4E2D",
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
    color: "#6D4E2D",
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
    backgroundColor: "#21160D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    marginBottom: 18,
  },

  emptyTitle: {
    color: "#FDF0DC",
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    color: "#8A6030",
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
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  guestTitle: {
    color: "#FDF0DC",
    textAlign: "center",
    fontSize: 21,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestSub: {
    color: "#A98961",
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
    backgroundColor: "#F2B233",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },

  primaryBtnText: {
    color: "#17100B",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },
});