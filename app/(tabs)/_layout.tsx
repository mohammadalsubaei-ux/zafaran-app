import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearToken } from "@/utils/authFetch";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import { BlurView } from "expo-blur";
import { useLang } from "@/context/LanguageContext";
import { useTheme, type Colors } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  Briefcase,
  Check,
  ChevronDown,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  ShoppingBag,
  User,
  X,
} from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";
const LOGO = require("../../assets/images/icon.png");

type Address = {
  id?: string | number;
  label?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  is_default?: boolean | null;
};

type TabIconProps = {
  focused: boolean;
  color: string;
  Icon: any;
};

function cleanText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function shortAddress(value: unknown) {
  const address = cleanText(value, "");
  if (!address) return "اضغط لاختيار العنوان";
  return address.length > 26 ? `${address.slice(0, 26)}...` : address;
}

function AddrIcon({ label }: { label?: string | null }) {
  const { c } = useTheme();

  if (label === "منزل") {
    return <Home size={18} color={c.gold} strokeWidth={1.8} />;
  }

  if (label === "عمل") {
    return <Briefcase size={18} color={c.gold} strokeWidth={1.8} />;
  }

  return <MapPin size={18} color={c.gold} strokeWidth={1.8} />;
}

// النقطة السفلية أُزيلت — كانت تدفع الاسم خارج حدود الشريط فيُقصّ
function TabIcon({ focused, color, Icon }: TabIconProps) {
  const { c } = useTheme();
  const t = useMemo(() => makeTabStyles(c), [c]);

  return (
    <View style={[t.tabIconWrap, focused && t.tabIconWrapActive]}>
      <Icon
        size={20}
        color={focused ? c.gold : color}
        strokeWidth={focused ? 2.1 : 1.75}
      />
    </View>
  );
}

function ZafaranHeader() {
  const { c } = useTheme();
  const h = useMemo(() => makeHeaderStyles(c), [c]);
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [currentAddr, setCurrentAddr] = useState<Address | null>(null);
  const [showAddresses, setShowAddresses] = useState(false);
  const [loading, setLoading] = useState(false);

  const addressLabel = useMemo(() => {
    return cleanText(currentAddr?.label, "حدد موقعك");
  }, [currentAddr?.label]);

  const addressSub = useMemo(() => {
    return shortAddress(currentAddr?.address);
  }, [currentAddr?.address]);

  const loadAddresses = useCallback(async () => {
    const storedUser = await AsyncStorage.getItem("user");

    if (!storedUser) {
      const savedAddr = await AsyncStorage.getItem("last_address");
      if (savedAddr) setCurrentAddr({ label: "موقعي", address: savedAddr });
      return;
    }

    let user: any = null;

    try {
      user = JSON.parse(storedUser);
    } catch {
      await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
      clearToken();
      return;
    }

    if (!user?.id) return;

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/addresses/${user.id}`);
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && Array.isArray(json.data) && json.data.length > 0) {
        const list: Address[] = json.data;
        setAddresses(list);

        // احترام اختيار المستخدم السابق: لا نرجع للافتراضي إلا إذا ما فيه اختيار محفوظ
        const savedAddr = await AsyncStorage.getItem("last_address");
        const picked =
          (savedAddr && list.find((a) => cleanText(a.address, "") === savedAddr)) ||
          list.find((a) => a.is_default) ||
          list[0];

        setCurrentAddr(picked);

        await AsyncStorage.multiSet([
          ["last_address", cleanText(picked.address, "")],
          ["last_address_lat", String(picked.lat ?? "")],
          ["last_address_lng", String(picked.lng ?? "")],
        ]);
        return;
      }

      setAddresses([]);

      const savedAddr = await AsyncStorage.getItem("last_address");
      if (savedAddr) {
        setCurrentAddr({ label: "موقعي", address: savedAddr });
      }
    } catch {
      const savedAddr = await AsyncStorage.getItem("last_address");
      if (savedAddr) {
        setCurrentAddr({ label: "موقعي", address: savedAddr });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openAddresses = useCallback(() => {
    setShowAddresses(true);
    loadAddresses();
  }, [loadAddresses]);

  const closeAddresses = useCallback(() => {
    setShowAddresses(false);
  }, []);

  const selectAddress = useCallback(async (addr: Address) => {
    setCurrentAddr(addr);
    setShowAddresses(false);

    await AsyncStorage.multiSet([
      ["last_address", cleanText(addr.address, "")],
      ["last_address_lat", String(addr.lat ?? "")],
      ["last_address_lng", String(addr.lng ?? "")],
    ]);
  }, []);

  const goAddAddress = useCallback(() => {
    setShowAddresses(false);
    router.push("/addresses" as any);
  }, [router]);

  const goProfile = useCallback(() => {
    router.push("/(tabs)/profile" as any);
  }, [router]);

  const goHome = useCallback(() => {
    router.push("/(tabs)" as any);
  }, [router]);

  return (
    <>
      <View style={h.container}>
        <View style={h.leftWrap}>
          <TouchableOpacity activeOpacity={0.86} style={h.notifBtn} onPress={() => router.push("/notifications" as any)}>
            <Bell size={19} color={c.gold} strokeWidth={1.85} />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.86} style={h.avatarWrap} onPress={goProfile}>
            <User size={16} color={c.gold} strokeWidth={1.85} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.9} style={h.locationWrap} onPress={openAddresses}>
          <View style={h.locationPill}>
            <ChevronDown size={14} color={c.gold} strokeWidth={2.1} />

            <View style={h.locationTextWrap}>
              <Text style={h.locationLabel} numberOfLines={1}>
                {addressLabel}
              </Text>

              <Text style={h.locationSub} numberOfLines={1}>
                {addressSub}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.86} style={h.brandMark} onPress={goHome}>
          <Image source={LOGO} style={h.brandLogo} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <Modal visible={showAddresses} transparent animationType="slide" onRequestClose={closeAddresses}>
        <View style={h.modalOverlay}>
          <View style={h.modalBox}>
            <View style={h.modalHandle} />

            <View style={h.modalHeader}>
              <TouchableOpacity activeOpacity={0.86} style={h.closeBtn} onPress={closeAddresses}>
                <X size={18} color={c.gold} strokeWidth={2.1} />
              </TouchableOpacity>

              <View style={h.modalTitleWrap}>
                <Text style={h.modalTitle}>عنوان التوصيل</Text>
                <Text style={h.modalSub}>اختر العنوان المستخدم في الطلب</Text>
              </View>

              <View style={h.closeBtnGhost} />
            </View>

            {loading ? (
              <View style={h.loadingBox}>
                <ActivityIndicator color={c.gold} />
                <Text style={h.loadingText}>جاري تحميل العناوين...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={h.emptyWrap}>
                <View style={h.emptyIcon}>
                  <MapPin size={34} color={c.gold} strokeWidth={1.6} />
                </View>

                <Text style={h.emptyText}>ما عندك عناوين محفوظة</Text>
                <Text style={h.emptyHint}>أضف عنوانًا حتى يظهر هنا عند الطلب</Text>

                <TouchableOpacity activeOpacity={0.9} style={h.addAddressBtn} onPress={goAddAddress}>
                  <Text style={h.addAddressText}>إضافة عنوان</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={(item, index) => String(item.id || index)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={h.addressList}
                renderItem={({ item }) => {
                  const active = String(currentAddr?.id || "") === String(item.id || "");

                  return (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={[h.addrItem, active && h.addrItemActive]}
                      onPress={() => selectAddress(item)}
                    >
                      <View style={h.addrIconWrap}>
                        <AddrIcon label={item.label} />
                      </View>

                      <View style={h.addrInfo}>
                        <Text style={[h.addrLabel, active && h.addrLabelActive]} numberOfLines={1}>
                          {cleanText(item.label, "عنوان")}
                          {item.is_default ? <Text style={h.defaultTag}> · افتراضي</Text> : null}
                        </Text>

                        <Text style={h.addrText} numberOfLines={1}>
                          {cleanText(item.address, "العنوان غير محدد")}
                        </Text>
                      </View>

                      {active ? (
                        <View style={h.checkCircle}>
                          <Check size={15} color={c.onGold} strokeWidth={2.4} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// تسميات التبويبات — الأساسيات المترجمة
const TAB_LABELS: Record<string, Record<string, string>> = {
  ar: { index: "الرئيسية", categories: "التصنيفات", orders: "طلباتي", favorites: "المفضلة", profile: "حسابي" },
  en: { index: "Home", categories: "Categories", orders: "Orders", favorites: "Favorites", profile: "Account" },
};

export default function TabLayout() {
  const { lang } = useLang();
  const { c, isDark } = useTheme();
  const t = useMemo(() => makeTabStyles(c), [c]);
  // SafeAreaView من react-native مهجور ولا يحسب المساحة الآمنة بثبات على iOS
  // بعد router.replace — فينزلق الهيدر تحت شريط الحالة. insets يحسبها دائماً.
  const insets = useSafeAreaInsets();
  const L = TAB_LABELS[lang] || TAB_LABELS.ar;

  const [fontsLoaded] = useFonts({
    Almarai_800ExtraBold,
    Almarai_400Regular,
    Almarai_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={t.root}>
      <View style={[t.safeHeader, { paddingTop: insets.top }]}>
        <ZafaranHeader />
      </View>

      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: t.tabBar,
          tabBarBackground: () => (
            <BlurView
              intensity={72}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarActiveTintColor: c.gold,
          tabBarInactiveTintColor: c.textSoft,
          // إظهار الاسم صراحةً — الاعتماد على السلوك الافتراضي كان يخفيه
          tabBarShowLabel: true,
          tabBarLabelPosition: "below-icon",
          tabBarLabelStyle: t.tabLabel,
          tabBarItemStyle: t.tabItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: L.index,
            tabBarLabel: L.index,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} Icon={Home} />
            ),
          }}
        />

        <Tabs.Screen
          name="categories"
          options={{
            title: L.categories,
            tabBarLabel: L.categories,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} Icon={LayoutGrid} />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: L.orders,
            tabBarLabel: L.orders,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} Icon={ShoppingBag} />
            ),
          }}
        />

        <Tabs.Screen
          name="favorites"
          options={{
            title: L.favorites,
            tabBarLabel: L.favorites,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} Icon={Heart} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: L.profile,
            tabBarLabel: L.profile,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} Icon={User} />
            ),
          }}
        />

        <Tabs.Screen name="wallet" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const makeTabStyles = (c: Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.bg,
  },

  safeHeader: {
    backgroundColor: c.bg,
  },

  // الارتفاع وُسّع ليتسع للأيقونة والاسم معاً بدل قصّ الاسم
  tabBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
    height: 84,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 7,
    borderRadius: 28,
    backgroundColor: c.surface,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 24,
  },

  tabLabel: {
    fontSize: 10,
    lineHeight: 15,
    fontFamily: "Almarai_700Bold",
    marginTop: 3,
    includeFontPadding: false,
  },

  tabItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },

  tabIconWrap: {
    minWidth: 38,
    height: 30,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  tabIconWrapActive: {
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },
});

const makeHeaderStyles = (c: Colors) => StyleSheet.create({
  container: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: c.goldSoft,
    backgroundColor: c.bg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },

  leftWrap: {
    width: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notifDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.danger,
    borderWidth: 1,
    borderColor: c.bg,
  },

  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  locationWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },

  locationPill: {
    minHeight: 48,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldSoft,
  },

  locationTextWrap: {
    alignItems: "center",
    maxWidth: 140,
  },

  locationLabel: {
    fontSize: 14,
    color: c.gold,
    fontFamily: "Almarai_800ExtraBold",
    textAlign: "center",
  },

  locationSub: {
    maxWidth: "100%",
    fontSize: 10,
    color: c.textSoft,
    fontFamily: "Almarai_400Regular",
    marginTop: 2,
    textAlign: "center",
  },

  brandWrap: {
    width: 130,
    height: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 7,
  },

  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  brandLogo: {
    width: 42,
    height: 42,
  },

  brandTextWrap: {
    flex: 1,
    alignItems: "flex-end",
  },

  brandName: {
    color: c.gold,
    fontSize: 21,
    lineHeight: 27,
    fontFamily: "Almarai_800ExtraBold",
  },

  brandSub: {
    color: c.textSoft,
    fontSize: 10,
    marginTop: -1,
    fontFamily: "Almarai_400Regular",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "flex-end",
  },

  modalBox: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  modalHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: c.goldBorder,
    marginBottom: 12,
  },

  modalHeader: {
    minHeight: 58,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: c.goldSoft,
    paddingBottom: 12,
    marginBottom: 12,
  },

  modalTitleWrap: {
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 19,
    color: c.text,
    fontFamily: "Almarai_800ExtraBold",
  },

  modalSub: {
    color: c.textSoft,
    fontSize: 11,
    marginTop: 3,
    fontFamily: "Almarai_400Regular",
  },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },

  closeBtnGhost: {
    width: 38,
    height: 38,
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 10,
  },

  loadingText: {
    color: c.textSoft,
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  addressList: {
    paddingBottom: 10,
  },

  addrItem: {
    minHeight: 72,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: c.goldSoft,
    marginBottom: 8,
    backgroundColor: c.surface,
  },

  addrItemActive: {
    backgroundColor: c.goldSoft,
    borderColor: c.goldBorder,
  },

  addrIconWrap: {
    width: 43,
    height: 43,
    borderRadius: 16,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  addrInfo: {
    flex: 1,
  },

  addrLabel: {
    fontSize: 14,
    color: c.text,
    fontFamily: "Almarai_800ExtraBold",
    textAlign: "right",
  },

  addrLabelActive: {
    color: c.gold,
  },

  defaultTag: {
    fontSize: 11,
    color: c.textSoft,
    fontFamily: "Almarai_400Regular",
  },

  addrText: {
    fontSize: 11,
    color: c.textSoft,
    fontFamily: "Almarai_400Regular",
    textAlign: "right",
    marginTop: 4,
  },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 11,
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 38,
    paddingHorizontal: 22,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 29,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyText: {
    fontSize: 16,
    color: c.text,
    fontFamily: "Almarai_800ExtraBold",
    marginBottom: 6,
  },

  emptyHint: {
    fontSize: 12,
    color: c.textSoft,
    fontFamily: "Almarai_400Regular",
    textAlign: "center",
    marginBottom: 16,
  },

  addAddressBtn: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: c.gold,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  addAddressText: {
    color: c.bg,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },
});