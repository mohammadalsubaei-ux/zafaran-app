import { useCallback, useMemo } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
    const chefName = paramText(params.chef_name, "الشيف");
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
        "عندك وجبات من شيف ثاني. هل تريد مسح السلة والبدء من هذه الوجبة؟",
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
            <ArrowRight size={20} color="#F2B233" strokeWidth={1.9} />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>تفاصيل الوجبة</Text>
            <Text style={s.headerSub}>Zafaran Menu</Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={goCart}>
            <ShoppingCart size={18} color="#F2B233" strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        <View style={s.imageCard}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={s.heroImage} />
          ) : (
            <View style={s.heroPlaceholder}>
              <ImageOff size={54} color="#6D4E2D" strokeWidth={1.4} />
              <Text style={s.placeholderText}>لا توجد صورة للوجبة</Text>
            </View>
          )}

          <View style={s.floatingBadge}>
            <Sparkles size={13} color="#F2B233" strokeWidth={1.8} />
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
                available: { bg: "rgba(76,175,80,0.12)",  color: "#4CAF50", label: "متاحة" },
                preorder:  { bg: "rgba(240,165,0,0.12)",  color: "#F0A500", label: "حجز مسبق" },
                unavailable: { bg: "rgba(229,57,53,0.12)", color: "#E53935", label: "غير متاحة" },
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
            <ChefHat size={15} color="#8A6030" strokeWidth={1.7} />
            <Text style={s.chefName} numberOfLines={1}>
              مقدمة من {item.chef_name}
            </Text>
          </View>

          {item.description ? (
            <Text style={s.desc}>{item.description}</Text>
          ) : (
            <View style={s.noDescBox}>
              <CircleAlert size={16} color="#8A6030" strokeWidth={1.7} />
              <Text style={s.noDescText}>لم يضف الشيف وصفًا لهذه الوجبة بعد.</Text>
            </View>
          )}

          <View style={s.priceBox}>
            <View style={s.priceIconBox}>
              <ReceiptText size={20} color="#F2B233" strokeWidth={1.8} />
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
              <ShoppingCart size={20} color="#4CAF50" strokeWidth={1.8} />
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
              <Minus size={17} color={qty <= 0 ? "#5A3A18" : "#F2B233"} strokeWidth={2.4} />
            </TouchableOpacity>

            <Text style={s.qtyNum}>{qty || 0}</Text>

            <TouchableOpacity activeOpacity={0.85} style={s.qtyBtn} onPress={handleAdd}>
              <Plus size={17} color="#F2B233" strokeWidth={2.4} />
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
            <ShoppingCart size={18} color="#17100B" strokeWidth={2.2} />
            <Text style={s.primaryText}>{qty > 0 ? "إضافة المزيد" : "إضافة للسلة"}</Text>
          </View>

          <Text style={s.primaryPrice}>{money(item.price)}</Text>
        </TouchableOpacity>

        {qty > 0 ? (
          <TouchableOpacity activeOpacity={0.9} style={s.secondaryBtn} onPress={goCart}>
            <Text style={s.secondaryText}>عرض السلة</Text>
            <ChevronLeft size={18} color="#F2B233" strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17100B",
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
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleWrap: {
    alignItems: "center",
  },

  headerTitle: {
    color: "#FDF0DC",
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  headerSub: {
    color: "#8A6030",
    fontSize: 11,
    marginTop: 3,
    fontFamily: "Almarai_400Regular",
  },

  imageCard: {
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
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
    backgroundColor: "#21160D",
  },

  placeholderText: {
    color: "#6D4E2D",
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
    backgroundColor: "rgba(23,16,11,0.88)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.2)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },

  floatingBadgeText: {
    color: "#F2B233",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  infoCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 26,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    padding: 16,
  },

  nameRow: {
    alignItems: "flex-end",
  },

  name: {
    color: "#FDF0DC",
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
    backgroundColor: "rgba(76,175,80,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    color: "#8AF0A5",
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
    color: "#8A6030",
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  desc: {
    marginTop: 14,
    color: "#A98961",
    textAlign: "right",
    fontSize: 13,
    lineHeight: 24,
    fontFamily: "Almarai_400Regular",
  },

  noDescBox: {
    marginTop: 14,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#17100B",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },

  noDescText: {
    flex: 1,
    color: "#8A6030",
    textAlign: "right",
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "Almarai_400Regular",
  },

  priceBox: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: "#17100B",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
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
    backgroundColor: "rgba(242,178,51,0.08)",
  },

  priceTextWrap: {
    flex: 1,
  },

  priceLabel: {
    color: "#8A6030",
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  price: {
    color: "#F2B233",
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
    backgroundColor: "rgba(76,175,80,0.08)",
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.17)",
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
    backgroundColor: "rgba(76,175,80,0.1)",
  },

  cartStateInfo: {
    flex: 1,
  },

  cartStateTitle: {
    color: "#A4F0B5",
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  cartStateSub: {
    color: "#7CCB8A",
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
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  quantityTitle: {
    color: "#FDF0DC",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  qtyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#17100B",
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,178,51,0.08)",
  },

  qtyBtnDisabled: {
    backgroundColor: "rgba(242,178,51,0.03)",
  },

  qtyNum: {
    minWidth: 24,
    color: "#FDF0DC",
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
    backgroundColor: "rgba(23,16,11,0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(242,178,51,0.12)",
    gap: 10,
  },

  primaryBtn: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: "#F2B233",
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
    color: "#17100B",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  primaryPrice: {
    color: "#17100B",
    fontSize: 13,
    opacity: 0.85,
    fontFamily: "Almarai_800ExtraBold",
  },

  secondaryBtn: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "rgba(242,178,51,0.06)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.18)",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  secondaryText: {
    color: "#F2B233",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },
});