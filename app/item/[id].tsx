import { useCallback, useMemo } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import {
  ArrowRight,
  BadgeCheck,
  ChefHat,
  ChevronLeft,
  CircleAlert,
  ImageOff,
  Minus,
  Plus,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react-native";

import { useCart } from "@/context/CartContext";
import { useTheme, type Colors } from "@/context/ThemeContext";

function paramText(value: unknown, fallback = "") {
  if (Array.isArray(value)) return decodeURIComponent(String(value[0] || fallback));
  if (value === null || value === undefined) return fallback;
  return decodeURIComponent(String(value || fallback));
}

function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return `${numberValue(value).toFixed(2).replace(".00", "")} ريال`;
}

export default function ItemScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);

  const { addItem, updateQty, items, chef_id: cartChefId, clearCart } = useCart();

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const item = useMemo(() => {
    const id = paramText(params.id);
    const name = paramText(params.name, "وجبة");
    const price = numberValue(paramText(params.price, "0"));
    const description = paramText(params.description, "");
    const chefId = paramText(params.chef_id);
    const chefName = paramText(params.chef_name, "المتجر");
    const imageUrl = paramText(params.image_url, "");
    const status = paramText(params.status, "available");

    return {
      id,
      name,
      price,
      description,
      chef_id: chefId,
      chef_name: chefName,
      image_url: imageUrl,
      status,
    };
  }, [params]);

  const qty = useMemo(() => {
    return items.find((cartItem) => String(cartItem.id) === String(item.id))?.quantity || 0;
  }, [items, item.id]);

  const lineTotal = useMemo(() => {
    return item.price * Math.max(qty, 1);
  }, [item.price, qty]);

  const canAdd = Boolean(item.id && item.chef_id && item.price >= 0 && item.status !== "unavailable");

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const goCart = useCallback(() => {
    router.push("/cart" as any);
  }, [router]);

  const addPayload = useCallback(() => {
    return {
      id: String(item.id),
      name: item.name,
      price: Number(item.price),
      quantity: 1,
      chef_id: String(item.chef_id),
      chef_name: String(item.chef_name || ""),
      image_url: String(item.image_url || ""),
      status: item.status,
    };
  }, [item]);

  const handleAdd = useCallback(() => {
    if (!canAdd) {
      Alert.alert("تعذر الإضافة", "بيانات الوجبة غير مكتملة.");
      return;
    }

    if (cartChefId && String(cartChefId) !== String(item.chef_id)) {
      Alert.alert(
        "سلة جديدة",
        "عندك طلبات من متجر ثاني. هل تريد مسح السلة والبدء من هذا المنتج؟",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "مسح وبدء جديد",
            style: "destructive",
            onPress: () => {
              clearCart();
              addItem(addPayload());
              router.back();
            },
          },
        ]
      );
      return;
    }

    addItem(addPayload());
  }, [addItem, addPayload, canAdd, cartChefId, clearCart, item.chef_id, router]);

  const decreaseQty = useCallback(() => {
    if (qty <= 0) return;
    updateQty(String(item.id), qty - 1);
  }, [item.id, qty, updateQty]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={goBack}>
            <ArrowRight size={20} color={c.gold} strokeWidth={1.9} />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>تفاصيل الوجبة</Text>
            <Text style={s.headerSub}>Zafaran Menu</Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={goCart}>
            <ShoppingCart size={18} color={c.gold} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        <View style={s.imageCard}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={s.heroImage} />
          ) : (
            <View style={s.heroPlaceholder}>
              <ImageOff size={54} color={c.textMuted} strokeWidth={1.4} />
              <Text style={s.placeholderText}>لا توجد صورة للوجبة</Text>
            </View>
          )}

          <View style={s.floatingBadge}>
            <Sparkles size={13} color={c.gold} strokeWidth={1.8} />
            <Text style={s.floatingBadgeText}>اختيار مميز</Text>
          </View>
        </View>

        <View style={s.infoCard}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={2}>
              {item.name}
            </Text>

            {(() => {
              const STATUS_UI: Record<string, { bg: string; color: string; label: string }> = {
                available: { bg: c.successSoft,  color: c.success, label: "متاحة" },
                preorder:  { bg: c.goldSoft,  color: c.gold, label: "حجز مسبق" },
                unavailable: { bg: c.dangerSoft, color: c.danger, label: "غير متاحة" },
              };
              const ui = STATUS_UI[item.status] ?? STATUS_UI.available;
              return (
                <View style={[s.statusBadge, { backgroundColor: ui.bg }]}>
                  <BadgeCheck size={13} color={ui.color} strokeWidth={1.8} />
                  <Text style={[s.statusText, { color: ui.color }]}>{ui.label}</Text>
                </View>
              );
            })()}
          </View>

          <View style={s.chefRow}>
            <ChefHat size={15} color={c.textSoft} strokeWidth={1.7} />
            <Text style={s.chefName} numberOfLines={1}>
              مقدمة من {item.chef_name}
            </Text>
          </View>

          {item.description ? (
            <Text style={s.desc}>{item.description}</Text>
          ) : (
            <View style={s.noDescBox}>
              <CircleAlert size={16} color={c.textSoft} strokeWidth={1.7} />
              <Text style={s.noDescText}>لم يضف المتجر وصفًا لهذا المنتج بعد.</Text>
            </View>
          )}

          <View style={s.priceBox}>
            <View style={s.priceIconBox}>
              <ReceiptText size={20} color={c.gold} strokeWidth={1.8} />
            </View>

            <View style={s.priceTextWrap}>
              <Text style={s.priceLabel}>سعر الوجبة</Text>
              <Text style={s.price}>{money(item.price)}</Text>
            </View>
          </View>
        </View>

        {qty > 0 ? (
          <View style={s.cartStateCard}>
            <View style={s.cartStateIcon}>
              <ShoppingCart size={20} color={c.success} strokeWidth={1.8} />
            </View>

            <View style={s.cartStateInfo}>
              <Text style={s.cartStateTitle}>الوجبة موجودة في السلة</Text>
              <Text style={s.cartStateSub}>
                الكمية الحالية: {qty} · الإجمالي: {money(item.price * qty)}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={s.quantityCard}>
          <Text style={s.quantityTitle}>الكمية</Text>

          <View style={s.qtyRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[s.qtyBtn, qty <= 0 && s.qtyBtnDisabled]}
              disabled={qty <= 0}
              onPress={decreaseQty}
            >
              <Minus size={17} color={qty <= 0 ? c.textMuted : c.gold} strokeWidth={2.4} />
            </TouchableOpacity>

            <Text style={s.qtyNum}>{qty || 0}</Text>

            <TouchableOpacity activeOpacity={0.85} style={s.qtyBtn} onPress={handleAdd}>
              <Plus size={17} color={c.gold} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[s.primaryBtn, !canAdd && s.primaryBtnDisabled]}
          disabled={!canAdd}
          onPress={handleAdd}
        >
          <View style={s.primaryLeft}>
            <ShoppingCart size={18} color={c.onGold} strokeWidth={2.2} />
            <Text style={s.primaryText}>{qty > 0 ? "إضافة المزيد" : "إضافة للسلة"}</Text>
          </View>

          <Text style={s.primaryPrice}>{money(item.price)}</Text>
        </TouchableOpacity>

        {qty > 0 ? (
          <TouchableOpacity activeOpacity={0.9} style={s.secondaryBtn} onPress={goCart}>
            <Text style={s.secondaryText}>عرض السلة</Text>
            <ChevronLeft size={18} color={c.gold} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
  },

  content: {
    paddingBottom: 170,
  },

  header: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 12,
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

  headerTitleWrap: {
    alignItems: "center",
  },

  headerTitle: {
    color: c.text,
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  headerSub: {
    color: c.textSoft,
    fontSize: 11,
    marginTop: 3,
    fontFamily: "Almarai_400Regular",
  },

  imageCard: {
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    position: "relative",
  },

  heroImage: {
    width: "100%",
    height: 270,
    resizeMode: "cover",
  },

  heroPlaceholder: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: c.surface,
  },

  placeholderText: {
    color: c.textMuted,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  floatingBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.goldBorder,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },

  floatingBadgeText: {
    color: c.gold,
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  infoCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 26,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    padding: 16,
  },

  nameRow: {
    alignItems: "flex-end",
  },

  name: {
    color: c.text,
    textAlign: "right",
    fontSize: 24,
    lineHeight: 34,
    fontFamily: "Almarai_800ExtraBold",
  },

  statusBadge: {
    marginTop: 10,
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: c.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    color: c.success,
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  chefRow: {
    marginTop: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },

  chefName: {
    flex: 1,
    color: c.textSoft,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  desc: {
    marginTop: 14,
    color: c.textSoft,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 24,
    fontFamily: "Almarai_400Regular",
  },

  noDescBox: {
    marginTop: 14,
    borderRadius: 16,
    padding: 12,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.goldSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },

  noDescText: {
    flex: 1,
    color: c.textSoft,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "Almarai_400Regular",
  },

  priceBox: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.goldSoft,
    padding: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
  },

  priceIconBox: {
    width: 45,
    height: 45,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
  },

  priceTextWrap: {
    flex: 1,
  },

  priceLabel: {
    color: c.textSoft,
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  price: {
    color: c.gold,
    textAlign: "right",
    marginTop: 3,
    fontSize: 22,
    fontFamily: "Almarai_800ExtraBold",
  },

  cartStateCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 13,
    backgroundColor: c.successSoft,
    borderWidth: 1,
    borderColor: c.successSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
  },

  cartStateIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.successSoft,
  },

  cartStateInfo: {
    flex: 1,
  },

  cartStateTitle: {
    color: c.success,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  cartStateSub: {
    color: c.success,
    textAlign: "right",
    marginTop: 3,
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  quantityCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 22,
    padding: 15,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  quantityTitle: {
    color: c.text,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  qtyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.bg,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.goldSoft,
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
  },

  qtyBtnDisabled: {
    backgroundColor: c.goldSoft,
  },

  qtyNum: {
    minWidth: 24,
    color: c.text,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 20,
    backgroundColor: c.bg,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 10,
  },

  primaryBtn: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: c.gold,
    paddingHorizontal: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  primaryBtnDisabled: {
    opacity: 0.6,
  },

  primaryLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },

  primaryText: {
    color: c.bg,
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  primaryPrice: {
    color: c.bg,
    fontSize: 13,
    opacity: 0.85,
    fontFamily: "Almarai_800ExtraBold",
  },

  secondaryBtn: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  secondaryText: {
    color: c.gold,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },
});