import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert, Modal,
  ScrollView, RefreshControl, Switch, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold
} from "@expo-google-fonts/almarai";
import {
  ArrowRight, Plus, Trash2, Percent, X, Package, Store,
} from "lucide-react-native";
import { useTheme, type Colors } from "@/context/ThemeContext";

const API = "https://zafaran-backend-production.up.railway.app";

type Offer = {
  id: string;
  menu_item_id?: string | null;
  title?: string | null;
  discount_type?: "percent" | "fixed" | null;
  discount_value?: number | string | null;
  usage_limit?: number | null;
  usage_count?: number | null;
  ends_at?: string | null;
  is_active?: boolean | null;
};

type MenuItem = {
  id: string;
  name?: string | null;
  price?: number | string | null;
};

function money(v: unknown) {
  const n = Number(v || 0);
  return `${(Number.isFinite(n) ? n : 0).toFixed(2)} ر.س`;
}

export default function OffersScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
  });

  const [chefId, setChefId]     = useState<string | null>(null);
  const [offers, setOffers]     = useState<Offer[]>([]);
  const [menu, setMenu]         = useState<MenuItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // نموذج الإنشاء
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle]       = useState("");
  const [type, setType]         = useState<"percent" | "fixed">("percent");
  const [value, setValue]       = useState("");
  const [itemId, setItemId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const loadAll = useCallback(async (id: string) => {
    try {
      setError(null);

      const [offersRes, chefRes] = await Promise.all([
        fetch(`${API}/api/offers?chef_id=${id}&all=1`),
        fetch(`${API}/api/chefs/${id}`),
      ]);

      const offersJson = await offersRes.json().catch(() => null);
      const chefJson   = await chefRes.json().catch(() => null);

      if (offersJson?.success && Array.isArray(offersJson.data)) {
        setOffers(offersJson.data);
      } else {
        setError(offersJson?.message || "تعذر تحميل العروض");
      }

      if (chefJson?.success && Array.isArray(chefJson.data?.menu)) {
        setMenu(chefJson.data.menu);
      }
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // نفس آلية لوحة المتجر: مفتاح "user" ثم استعلام المتجر بـ user_id
  const bootstrap = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("user");
      if (!raw) {
        setError("سجّل الدخول للوصول إلى عروضك");
        setLoading(false);
        return;
      }

      let user: any = null;
      try { user = JSON.parse(raw); } catch { user = null; }

      if (!user?.id) {
        setError("تعذر قراءة بيانات الجلسة");
        setLoading(false);
        return;
      }

      const res  = await fetch(`${API}/api/chefs?user_id=${user.id}`);
      const json = await res.json().catch(() => null);

      const id = json?.success && Array.isArray(json.data) && json.data.length > 0
        ? json.data[0].id
        : null;

      if (!id) {
        setError("لم نتعرف على متجرك");
        setLoading(false);
        return;
      }

      setChefId(id);
      await loadAll(id);
    } catch {
      setError("تعذر الاتصال بالخادم");
      setLoading(false);
    }
  }, [loadAll]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  useFocusEffect(
    useCallback(() => {
      if (chefId) loadAll(chefId);
    }, [chefId, loadAll])
  );

  const onRefresh = useCallback(() => {
    if (!chefId) return;
    setRefreshing(true);
    loadAll(chefId);
  }, [chefId, loadAll]);

  const resetForm = useCallback(() => {
    setTitle("");
    setType("percent");
    setValue("");
    setItemId(null);
  }, []);

  const createOffer = useCallback(async () => {
    if (!chefId || saving) return;

    const name = title.trim();
    if (!name) {
      Alert.alert("عنوان مطلوب", "اكتب عنواناً للعرض — مثل: خصم افتتاحي.");
      return;
    }

    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      Alert.alert("قيمة غير صحيحة", "اكتب قيمة الخصم.");
      return;
    }
    if (type === "percent" && num >= 100) {
      Alert.alert("نسبة غير صحيحة", "نسبة الخصم يجب أن تكون أقل من 100.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chef_id: chefId,
          menu_item_id: itemId,
          title: name,
          discount_type: type,
          discount_value: num,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!json?.success) {
        Alert.alert("تعذر إنشاء العرض", json?.message || "حاول مرة ثانية.");
        return;
      }

      setShowForm(false);
      resetForm();
      loadAll(chefId);
    } catch {
      Alert.alert("مشكلة اتصال", "تأكد من الإنترنت وحاول مرة ثانية.");
    } finally {
      setSaving(false);
    }
  }, [chefId, itemId, loadAll, resetForm, saving, title, type, value]);

  const toggleOffer = useCallback(async (offer: Offer) => {
    if (!chefId) return;

    try {
      await fetch(`${API}/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !offer.is_active }),
      });
      loadAll(chefId);
    } catch {}
  }, [chefId, loadAll]);

  const removeOffer = useCallback((offer: Offer) => {
    Alert.alert(
      "حذف العرض",
      `سيُحذف "${offer.title || "العرض"}" نهائياً. الطلبات السابقة لا تتأثر.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            if (!chefId) return;
            try {
              await fetch(`${API}/api/offers/${offer.id}`, { method: "DELETE" });
              loadAll(chefId);
            } catch {}
          },
        },
      ]
    );
  }, [chefId, loadAll]);

  const renderOffer = useCallback(({ item }: { item: Offer }) => {
    const isPercent = item.discount_type === "percent";
    const target = item.menu_item_id
      ? menu.find((m) => m.id === item.menu_item_id)?.name || "منتج محدد"
      : "كل المتجر";

    return (
      <View style={[s.card, !item.is_active && s.cardOff]}>
        <View style={s.cardTop}>
          <Switch
            value={Boolean(item.is_active)}
            onValueChange={() => toggleOffer(item)}
            trackColor={{ false: c.surfaceAlt, true: c.goldBorder }}
            thumbColor={item.is_active ? c.gold : c.textSoft}
          />

          <View style={s.cardInfo}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title || "عرض"}</Text>
            <Text style={s.cardSub} numberOfLines={1}>{target}</Text>
          </View>

          <View style={s.valueBox}>
            <Text style={s.valueText}>
              {isPercent ? `${item.discount_value}%` : money(item.discount_value)}
            </Text>
          </View>
        </View>

        <View style={s.cardFoot}>
          <TouchableOpacity style={s.delBtn} onPress={() => removeOffer(item)}>
            <Trash2 size={15} color={c.danger} strokeWidth={1.8} />
          </TouchableOpacity>

          <Text style={s.usedText}>
            استُخدم {Number(item.usage_count || 0)} مرة
          </Text>
        </View>
      </View>
    );
  }, [c, s, menu, removeOffer, toggleOffer]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/dashboard/chef" as any))}
        >
          <ArrowRight size={20} color={c.gold} />
        </TouchableOpacity>

        <View>
          <Text style={s.headerTitle}>العروض والخصومات</Text>
          <Text style={s.headerSub}>الخصم يُطبّق تلقائياً عند الطلب</Text>
        </View>

        <View style={s.headerGhost} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
          <Text style={s.loadingText}>جارٍ التحميل…</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(o) => o.id}
          renderItem={renderOffer}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />
          }
          ListHeaderComponent={
            error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <Percent size={40} color={c.gold} strokeWidth={1.4} />
              </View>
              <Text style={s.emptyTitle}>ما عندك عروض بعد</Text>
              <Text style={s.emptyText}>
                العرض يجذب أول طلب. أنشئ خصماً على منتج أو على متجرك كله — والسعر ينزل تلقائياً عند العميل.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
        <Plus size={20} color={c.onGold} strokeWidth={2.4} />
        <Text style={s.fabText}>عرض جديد</Text>
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <TouchableOpacity style={s.sheetClose} onPress={() => setShowForm(false)}>
              <X size={20} color={c.textSoft} />
            </TouchableOpacity>

            <Text style={s.sheetTitle}>عرض جديد</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>عنوان العرض</Text>
              <TextInput
                style={s.input}
                placeholder="خصم افتتاحي"
                placeholderTextColor={c.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={s.label}>نوع الخصم</Text>
              <View style={s.typeRow}>
                <TouchableOpacity
                  style={[s.typeBtn, type === "percent" && s.typeBtnOn]}
                  onPress={() => setType("percent")}
                >
                  <Text style={[s.typeText, type === "percent" && s.typeTextOn]}>نسبة %</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.typeBtn, type === "fixed" && s.typeBtnOn]}
                  onPress={() => setType("fixed")}
                >
                  <Text style={[s.typeText, type === "fixed" && s.typeTextOn]}>مبلغ ثابت</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>
                {type === "percent" ? "نسبة الخصم (أقل من 100)" : "مبلغ الخصم بالريال"}
              </Text>
              <TextInput
                style={s.input}
                placeholder={type === "percent" ? "25" : "10"}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={value}
                onChangeText={setValue}
              />

              <Text style={s.label}>يشمل</Text>

              <TouchableOpacity
                style={[s.targetBtn, !itemId && s.targetBtnOn]}
                onPress={() => setItemId(null)}
              >
                <Store size={16} color={!itemId ? c.gold : c.textSoft} strokeWidth={1.8} />
                <Text style={[s.targetText, !itemId && s.targetTextOn]}>كل المتجر</Text>
              </TouchableOpacity>

              {menu.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.targetBtn, itemId === m.id && s.targetBtnOn]}
                  onPress={() => setItemId(m.id)}
                >
                  <Package size={16} color={itemId === m.id ? c.gold : c.textSoft} strokeWidth={1.8} />
                  <Text style={[s.targetText, itemId === m.id && s.targetTextOn]} numberOfLines={1}>
                    {m.name} · {money(m.price)}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={s.saveBtn} onPress={createOffer} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={c.onGold} />
                  : <Text style={s.saveText}>إنشاء العرض</Text>}
              </TouchableOpacity>

              <Text style={s.hint}>
                عمولة زعفران تُحسب على المبلغ بعد الخصم — فلا تدفع عمولة على ما لم تقبضه.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },

  header: {
    minHeight: 66, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: c.divider,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    borderColor: c.goldBorder, alignItems: "center", justifyContent: "center",
  },
  headerGhost: { width: 38, height: 38 },
  headerTitle: { color: c.text, fontSize: 16, textAlign: "center", fontFamily: "Almarai_800ExtraBold" },
  headerSub: { color: c.textSoft, fontSize: 11, textAlign: "center", marginTop: 3, fontFamily: "Almarai_400Regular" },

  listContent: { paddingTop: 14, paddingBottom: 120 },

  card: {
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: c.surface, borderRadius: 20,
    borderWidth: 1, borderColor: c.border,
  },
  cardOff: { opacity: 0.5 },
  cardTop: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { color: c.text, fontSize: 15, textAlign: "right", fontFamily: "Almarai_800ExtraBold" },
  cardSub: { color: c.textSoft, fontSize: 12, textAlign: "right", marginTop: 3, fontFamily: "Almarai_400Regular" },
  valueBox: {
    backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.goldBorder,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
  },
  valueText: { color: c.gold, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  cardFoot: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.divider,
  },
  usedText: { color: c.textMuted, fontSize: 11, fontFamily: "Almarai_400Regular" },
  delBtn: {
    width: 34, height: 34, borderRadius: 11, borderWidth: 1,
    borderColor: c.danger, alignItems: "center", justifyContent: "center",
  },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: c.textSoft, fontSize: 13, fontFamily: "Almarai_400Regular" },

  emptyWrap: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyIcon: {
    width: 92, height: 92, borderRadius: 30, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { color: c.text, fontSize: 18, textAlign: "center", marginTop: 16, fontFamily: "Almarai_800ExtraBold" },
  emptyText: { color: c.textSoft, fontSize: 13, lineHeight: 24, textAlign: "center", marginTop: 10, fontFamily: "Almarai_400Regular" },

  errorBox: {
    marginHorizontal: 16, marginBottom: 12, padding: 13, borderRadius: 14,
    backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.danger,
  },
  errorText: { color: c.danger, fontSize: 12, textAlign: "right", fontFamily: "Almarai_700Bold" },

  fab: {
    position: "absolute", left: 16, right: 16, bottom: 24,
    minHeight: 54, borderRadius: 18, backgroundColor: c.goldSolid,
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
  },
  fabText: { color: c.onGold, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },

  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%", backgroundColor: c.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: 34,
    borderWidth: 1, borderColor: c.border,
  },
  sheetClose: { position: "absolute", top: 14, left: 14, padding: 6, zIndex: 2 },
  sheetTitle: { color: c.text, fontSize: 19, textAlign: "right", marginBottom: 18, fontFamily: "Almarai_800ExtraBold" },

  label: { color: c.textSoft, fontSize: 12, textAlign: "right", marginBottom: 7, marginTop: 14, fontFamily: "Almarai_700Bold" },
  input: {
    minHeight: 50, borderRadius: 14, backgroundColor: c.bg,
    borderWidth: 1, borderColor: c.border, paddingHorizontal: 14,
    color: c.text, fontSize: 14, textAlign: "right", fontFamily: "Almarai_400Regular",
  },

  typeRow: { flexDirection: "row-reverse", gap: 9 },
  typeBtn: {
    flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.bg, alignItems: "center", justifyContent: "center",
  },
  typeBtnOn: { backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  typeText: { color: c.textSoft, fontSize: 13, fontFamily: "Almarai_700Bold" },
  typeTextOn: { color: c.gold },

  targetBtn: {
    minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.bg, flexDirection: "row-reverse", alignItems: "center",
    gap: 9, paddingHorizontal: 13, marginBottom: 8,
  },
  targetBtnOn: { backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  targetText: { flex: 1, color: c.textSoft, fontSize: 13, textAlign: "right", fontFamily: "Almarai_400Regular" },
  targetTextOn: { color: c.gold, fontFamily: "Almarai_700Bold" },

  saveBtn: {
    marginTop: 20, minHeight: 52, borderRadius: 16,
    backgroundColor: c.goldSolid, alignItems: "center", justifyContent: "center",
  },
  saveText: { color: c.onGold, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },

  hint: { color: c.textMuted, fontSize: 11.5, lineHeight: 20, textAlign: "center", marginTop: 14, fontFamily: "Almarai_400Regular" },
});