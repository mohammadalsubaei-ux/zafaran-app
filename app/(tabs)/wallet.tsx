import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";
const AMOUNTS = [10, 25, 50, 100, 200, 500];

export default function WalletScreen() {
  const [user, setUser]               = useState<any>(null);
  const [balance, setBalance]         = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) {
        const userData = JSON.parse(u);
        setUser(userData);
        loadWallet(userData.id);
      }
    });
  }, []);

  const loadWallet = async (userId: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/wallet/${userId}`);
      const json = await res.json();
      if (json.success) {
        setBalance(json.data.balance);
        setTransactions(json.data.transactions);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCharge = (amount: number) => {
    Alert.alert(
      "شحن المحفظة",
      `تبي تشحن ${amount} ريال؟`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "شحن", onPress: () => Alert.alert("قريباً", "نظام الدفع قيد التطوير 🚧") }
      ]
    );
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>محفظتي 💰</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Balance Card */}
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>الرصيد المتاح</Text>
        <Text style={s.balanceAmount}>{balance.toFixed(2)}</Text>
        <Text style={s.balanceCurrency}>ريال سعودي</Text>
      </View>

      {/* Charge Amounts */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>شحن المحفظة ⚡</Text>
        <View style={s.amountsGrid}>
          {AMOUNTS.map(amount => (
            <TouchableOpacity key={amount} style={s.amountBtn} onPress={() => handleCharge(amount)}>
              <Text style={s.amountText}>{amount} ر</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>سجل المعاملات 📋</Text>
      </View>

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 20 }} />
        : <FlatList
            data={transactions}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <View style={s.txCard}>
                <View style={s.txRight}>
                  <Text style={s.txDesc}>{item.description}</Text>
                  <Text style={s.txDate}>{new Date(item.created_at).toLocaleDateString("ar-SA")}</Text>
                </View>
                <Text style={[s.txAmount, { color: item.type === "credit" ? "#4CAF50" : "#E53935" }]}>
                  {item.type === "credit" ? "+" : "-"}{item.amount} ر
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>💳</Text>
                <Text style={s.empty}>ما في معاملات بعد</Text>
                <Text style={s.emptySub}>اشحن محفظتك وابدأ الطلب!</Text>
              </View>
            }
          />
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: "#0E0700" },
  header:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.1)" },
  title:           { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:            { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  balanceCard:     { margin: 16, backgroundColor: "#1C1000", borderRadius: 24, padding: 28, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", shadowColor: "#F0A500", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  balanceLabel:    { fontSize: 13, color: "#8A6030", marginBottom: 8, fontFamily: "Almarai_400Regular" },
  balanceAmount:   { fontSize: 52, fontWeight: "900", color: "#F0A500", lineHeight: 60, fontFamily: "Almarai_800ExtraBold" },
  balanceCurrency: { fontSize: 14, color: "#C97D20", marginTop: 4, fontFamily: "Almarai_400Regular" },
  section:         { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle:    { fontSize: 14, fontWeight: "800", color: "#FDF0DC", marginBottom: 12, textAlign: "right", fontFamily: "Almarai_700Bold" },
  amountsGrid:     { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  amountBtn:       { backgroundColor: "#1C1000", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", minWidth: 90, alignItems: "center" },
  amountText:      { fontSize: 16, fontWeight: "800", color: "#F0A500", fontFamily: "Almarai_700Bold" },
  txCard:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1C1000", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(240,165,0,0.08)" },
  txRight:         { flex: 1 },
  txDesc:          { fontSize: 13, fontWeight: "700", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold" },
  txDate:          { fontSize: 11, color: "#5A3A18", textAlign: "right", marginTop: 3, fontFamily: "Almarai_400Regular" },
  txAmount:        { fontSize: 16, fontWeight: "900", marginLeft: 12, fontFamily: "Almarai_800ExtraBold" },
  emptyWrap:       { alignItems: "center", marginTop: 30 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  empty:           { fontSize: 16, fontWeight: "800", color: "#8A6030", textAlign: "center", fontFamily: "Almarai_700Bold" },
  emptySub:        { fontSize: 13, color: "#5A3A18", textAlign: "center", marginTop: 6, fontFamily: "Almarai_400Regular" },
});
