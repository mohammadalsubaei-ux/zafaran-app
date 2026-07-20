import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
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
  Bell,
  ChevronLeft,
  ChefHat,
  CircleDollarSign,
  FileText,
  Globe2,
  Headphones,
  Home,
  Languages,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  User,
  UserRound,
  Wallet,
  KeyRound,
} from "lucide-react-native";

import { useLang } from "@/context/LanguageContext";

type Role = "customer" | "chef" | "driver" | string;

type UserSession = {
  id?: string | number | null;
  full_name?: string | null;
  phone?: string | null;
  role?: Role | null;
  gender?: string | null;
};

const T: any = {
  ar: {
    account: "حسابي",
    guestTitle: "أهلًا بك في زعفران",
    guestSub: "سجل دخولك للوصول إلى الطلبات، المحفظة، العناوين، ولوحات التحكم.",
    login: "تسجيل الدخول",
    guestRegister: "إنشاء حساب جديد",
    guestChef: "سجّل مشروعك البيتي",
    guestDriver: "انضم كمندوب توصيل",
    profile: "الملف الشخصي",
    verified: "حساب موثق",
    customer: "عميل",
    chef: "شيف",
    chefFemale: "شيفة",
    driver: "مندوب توصيل",
    services: "الخدمات",
    chefDashboard: "لوحة الشيف",
    chefDashboardSub: "إدارة الطلبات والوجبات",
    driverDashboard: "لوحة المندوب",
    driverDashboardSub: "إدارة التوصيلات",
    orders: "طلباتي",
    ordersSub: "متابعة الطلبات السابقة والحالية",
    wallet: "محفظتي",
    walletSub: "الرصيد وسجل المعاملات",
    addresses: "عناويني",
    addressesSub: "عناوين التوصيل المحفوظة",
    settings: "الإعدادات",
    language: "اللغة",
    languageSub: "التبديل بين العربية والإنجليزية",
    changePw: "تغيير كلمة المرور",
    changePwSub: "حدّث كلمة مرور حسابك",
    region: "المنطقة",
    regionSub: "القصيم، المملكة العربية السعودية",
    notifications: "الإشعارات",
    notificationsSub: "إشعارات الطلبات والتحديثات",
    support: "الدعم والمساعدة",
    supportSub: "تواصل معنا عند وجود مشكلة",
    legal: "المعلومات القانونية",
    privacy: "سياسة الخصوصية",
    terms: "الشروط والأحكام",
    version: "إصدار التطبيق",
    logout: "تسجيل الخروج",
    logoutTitle: "تسجيل الخروج",
    logoutMsg: "هل تريد الخروج من حسابك؟",
    yes: "نعم",
    no: "لا",
    appFooter: "زعفران · أكل بيتي · طعم أصيل",
  },
  en: {
    account: "My Account",
    guestTitle: "Welcome to Zafaran",
    guestSub: "Sign in to access orders, wallet, addresses, and dashboards.",
    login: "Login",
    guestRegister: "Create a new account",
    guestChef: "Register your home business",
    guestDriver: "Join as a delivery driver",
    profile: "Profile",
    verified: "Verified Account",
    customer: "Customer",
    chef: "Chef",
    chefFemale: "Chef",
    driver: "Delivery Driver",
    services: "Services",
    chefDashboard: "Chef Dashboard",
    chefDashboardSub: "Manage orders and meals",
    driverDashboard: "Driver Dashboard",
    driverDashboardSub: "Manage deliveries",
    orders: "My Orders",
    ordersSub: "Track current and previous orders",
    wallet: "My Wallet",
    walletSub: "Balance and transaction history",
    addresses: "My Addresses",
    addressesSub: "Saved delivery addresses",
    settings: "Settings",
    language: "Language",
    languageSub: "Switch between Arabic and English",
    changePw: "Change Password",
    changePwSub: "Update your account password",
    region: "Region",
    regionSub: "Al-Qassim, Saudi Arabia",
    notifications: "Notifications",
    notificationsSub: "Order and update alerts",
    support: "Support",
    supportSub: "Contact us when you need help",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    version: "App Version",
    logout: "Logout",
    logoutTitle: "Logout",
    logoutMsg: "Are you sure you want to logout?",
    yes: "Yes",
    no: "No",
    appFooter: "Zafaran · Home Food · Authentic Taste",
  },
};

function cleanText(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ز";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { lang, toggleLang } = useLang();
  const t = T[lang] || T.ar;

  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const isArabic = lang === "ar";

  const loadUser = useCallback(async () => {
    setLoading(true);

    try {
      const stored = await AsyncStorage.getItem("user");

      if (!stored) {
        setUser(null);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const roleInfo = useMemo(() => {
    if (user?.role === "chef") {
      return {
        label: user?.gender === "female" ? t.chefFemale : t.chef,
        color: "#F2B233",
        bg: "rgba(242,178,51,0.12)",
        Icon: ChefHat,
      };
    }

    if (user?.role === "driver") {
      return {
        label: t.driver,
        color: "#03A9F4",
        bg: "rgba(3,169,244,0.12)",
        Icon: Truck,
      };
    }

    return {
      label: t.customer,
      color: "#4CAF50",
      bg: "rgba(76,175,80,0.12)",
      Icon: UserRound,
    };
  }, [t, user?.gender, user?.role]);

  const logout = useCallback(() => {
    Alert.alert(
      t.logoutTitle,
      t.logoutMsg,
      [
        { text: t.no, style: "cancel" },
        {
          text: t.yes,
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
            router.replace("/login" as any);
          },
        },
      ],
      { cancelable: true }
    );
  }, [router, t]);

  const openLogin = useCallback(() => {
    router.replace("/login" as any);
  }, [router]);

  const MenuItem = useCallback(
    ({
      title,
      subtitle,
      Icon,
      onPress,
      disabled = false,
      danger = false,
    }: {
      title: string;
      subtitle?: string;
      Icon: any;
      onPress?: () => void;
      disabled?: boolean;
      danger?: boolean;
    }) => {
      return (
        <TouchableOpacity
          activeOpacity={disabled ? 1 : 0.86}
          disabled={disabled}
          style={[s.menuItem, disabled && s.menuItemDisabled]}
          onPress={onPress}
        >
          <View
            style={[
              s.menuIconBox,
              danger && s.menuIconDanger,
              disabled && s.menuIconDisabled,
            ]}
          >
            <Icon
              size={20}
              color={danger ? "#E53935" : disabled ? "#5A3A18" : "#F2B233"}
              strokeWidth={1.8}
            />
          </View>

          <View style={s.menuInfo}>
            <Text
              style={[
                s.menuTitle,
                danger && s.menuTitleDanger,
                disabled && s.menuTitleDisabled,
              ]}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text style={[s.menuSub, disabled && s.menuSubDisabled]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {!disabled ? <ChevronLeft size={18} color="#5A3A18" strokeWidth={1.8} /> : null}
        </TouchableOpacity>
      );
    },
    []
  );

  const Section = useCallback(
    ({ title, children }: { title: string; children: React.ReactNode }) => {
      return (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{title}</Text>
          {children}
        </View>
      );
    },
    []
  );

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تحميل الحساب...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.guestWrap}>
          <View style={s.guestIcon}>
            <User size={58} color="#F2B233" strokeWidth={1.5} />
          </View>

          <Text style={s.guestTitle}>{t.guestTitle}</Text>
          <Text style={s.guestSub}>{t.guestSub}</Text>

          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={openLogin}>
            <LogIn size={18} color="#17100B" strokeWidth={2} />
            <Text style={s.primaryBtnText}>{t.login}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={s.guestOutlineBtn}
            onPress={() => router.push({ pathname: "/login", params: { step: "register" } } as any)}
          >
            <UserRound size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.guestOutlineText}>{t.guestRegister}</Text>
          </TouchableOpacity>

          <View style={s.guestDivider} />

          <TouchableOpacity
            activeOpacity={0.85}
            style={s.guestRoleBtn}
            onPress={() => router.push({ pathname: "/login", params: { step: "chef_register" } } as any)}
          >
            <ChefHat size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.guestRoleText}>{t.guestChef}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[s.guestRoleBtn, s.guestRoleBtnDriver]}
            onPress={() => router.push({ pathname: "/login", params: { step: "driver_register" } } as any)}
          >
            <Truck size={17} color="#2196F3" strokeWidth={1.8} />
            <Text style={[s.guestRoleText, { color: "#2196F3" }]}>{t.guestDriver}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const RoleIcon = roleInfo.Icon;
  const fullName = cleanText(user.full_name, isArabic ? "مستخدم زعفران" : "Zafaran User");
  const phone = cleanText(user.phone, "—");

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{t.account}</Text>
          <View style={s.headerBadge}>
            <Sparkles size={13} color="#F2B233" />
            <Text style={s.headerBadgeText}>Zafaran</Text>
          </View>
        </View>

        <View style={s.profileCard}>
          <View style={s.avatarOuter}>
            <View style={s.avatarInner}>
              <Text style={s.avatarText}>{getInitials(fullName)}</Text>
            </View>
          </View>

          <Text style={s.name} numberOfLines={1}>
            {fullName}
          </Text>

          <Text style={s.phone}>{phone}</Text>

          <View style={s.badgesRow}>
            <View style={[s.roleBadge, { backgroundColor: roleInfo.bg }]}>
              <RoleIcon size={15} color={roleInfo.color} strokeWidth={1.8} />
              <Text style={[s.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
            </View>

            <View style={s.verifiedBadge}>
              <ShieldCheck size={15} color="#4CAF50" strokeWidth={1.8} />
              <Text style={s.verifiedText}>{t.verified}</Text>
            </View>
          </View>
        </View>

        <View style={s.quickGrid}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={s.quickCard}
            onPress={() => router.push("/(tabs)/orders" as any)}
          >
            <PackageCheck size={23} color="#F2B233" />
            <Text style={s.quickTitle}>{t.orders}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={s.quickCard}
            onPress={() => router.push("/(tabs)/wallet" as any)}
          >
            <Wallet size={23} color="#F2B233" />
            <Text style={s.quickTitle}>{t.wallet}</Text>
          </TouchableOpacity>
        </View>

        <Section title={t.services}>
          {user.role === "chef" ? (
            <MenuItem
              title={t.chefDashboard}
              subtitle={t.chefDashboardSub}
              Icon={LayoutDashboard}
              onPress={() => router.push("/dashboard/chef" as any)}
            />
          ) : null}

          {user.role === "driver" ? (
            <MenuItem
              title={t.driverDashboard}
              subtitle={t.driverDashboardSub}
              Icon={Truck}
              onPress={() => router.push("/dashboard/driver" as any)}
            />
          ) : null}

          <MenuItem
            title={t.orders}
            subtitle={t.ordersSub}
            Icon={PackageCheck}
            onPress={() => router.push("/(tabs)/orders" as any)}
          />

          <MenuItem
            title={t.wallet}
            subtitle={t.walletSub}
            Icon={CircleDollarSign}
            onPress={() => router.push("/(tabs)/wallet" as any)}
          />

          <MenuItem
            title={t.addresses}
            subtitle={t.addressesSub}
            Icon={MapPin}
            onPress={() => router.push("/addresses" as any)}
          />
        </Section>

        <Section title={t.settings}>
          <MenuItem
            title={t.language}
            subtitle={t.languageSub}
            Icon={Languages}
            onPress={toggleLang}
          />

          <MenuItem
            title={t.region}
            subtitle={t.regionSub}
            Icon={Globe2}
            onPress={() => router.push("/addresses" as any)}
          />

          <MenuItem
            title={t.notifications}
            subtitle={t.notificationsSub}
            Icon={Bell}
            onPress={() => router.push("/notifications" as any)}
          />

          <MenuItem
            title={t.changePw}
            subtitle={t.changePwSub}
            Icon={KeyRound}
            onPress={() => router.push("/change-password" as any)}
          />
        </Section>

        <Section title={t.legal}>
          <MenuItem
            title={t.support}
            subtitle={t.supportSub}
            Icon={Headphones}
            onPress={() => router.push("/support" as any)}
          />
          <MenuItem
            title={t.privacy}
            Icon={ShieldCheck}
            onPress={() => router.push("/privacy" as any)}
          />
          <MenuItem
            title={t.terms}
            Icon={FileText}
            onPress={() => router.push("/terms" as any)}
          />

          <View style={s.versionRow}>
            <View style={s.menuIconBox}>
              <Smartphone size={20} color="#F2B233" strokeWidth={1.8} />
            </View>
            <View style={s.menuInfo}>
              <Text style={s.menuTitle}>{t.version}</Text>
              <Text style={s.menuSub}>v1.0.0</Text>
            </View>
          </View>
        </Section>

        <TouchableOpacity activeOpacity={0.86} style={s.logoutBtn} onPress={logout}>
          <LogOut size={19} color="#E53935" strokeWidth={1.9} />
          <Text style={s.logoutText}>{t.logout}</Text>
        </TouchableOpacity>

        <Text style={s.footer}>{t.appFooter}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17100B",
  },

  content: {
    paddingBottom: 34,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#FDF0DC",
    fontSize: 24,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  headerBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(242,178,51,0.09)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.18)",
  },

  headerBadgeText: {
    color: "#F2B233",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  profileCard: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#21160D",
    borderRadius: 30,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.13)",
  },

  avatarOuter: {
    width: 102,
    height: 102,
    borderRadius: 36,
    padding: 4,
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.18)",
    marginBottom: 14,
  },

  avatarInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: "#17100B",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#F2B233",
    fontSize: 32,
    fontFamily: "Almarai_800ExtraBold",
  },

  name: {
    maxWidth: "90%",
    color: "#FDF0DC",
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  phone: {
    marginTop: 5,
    color: "#A98961",
    fontSize: 13,
    fontFamily: "Almarai_400Regular",
  },

  badgesRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  roleBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },

  roleText: {
    fontSize: 12,
    fontFamily: "Almarai_800ExtraBold",
  },

  verifiedBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(76,175,80,0.1)",
  },

  verifiedText: {
    color: "#8AF0A5",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  quickGrid: {
    flexDirection: "row-reverse",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },

  quickCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: 24,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  quickTitle: {
    color: "#FDF0DC",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  section: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#21160D",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    overflow: "hidden",
  },

  sectionTitle: {
    color: "#6D4E2D",
    fontSize: 11,
    letterSpacing: 1.2,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 4,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  menuItem: {
    minHeight: 66,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "rgba(242,178,51,0.07)",
  },

  menuItemDisabled: {
    opacity: 0.72,
  },

  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
  },

  menuIconDanger: {
    backgroundColor: "rgba(229,57,53,0.09)",
    borderColor: "rgba(229,57,53,0.16)",
  },

  menuIconDisabled: {
    backgroundColor: "rgba(242,178,51,0.04)",
  },

  menuInfo: {
    flex: 1,
  },

  menuTitle: {
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  menuTitleDanger: {
    color: "#E53935",
  },

  menuTitleDisabled: {
    color: "#8A6030",
  },

  menuSub: {
    color: "#8A6030",
    textAlign: "right",
    marginTop: 3,
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  menuSubDisabled: {
    color: "#5A3A18",
  },

  versionRow: {
    minHeight: 66,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "rgba(242,178,51,0.07)",
  },

  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 18,
    minHeight: 56,
    borderRadius: 19,
    backgroundColor: "rgba(229,57,53,0.09)",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.18)",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  logoutText: {
    color: "#E53935",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  footer: {
    color: "#3B2A18",
    textAlign: "center",
    fontSize: 12,
    marginTop: 18,
    paddingHorizontal: 16,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
    marginBottom: 22,
  },

  guestTitle: {
    color: "#FDF0DC",
    fontSize: 22,
    textAlign: "center",
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
    minHeight: 54,
    minWidth: 190,
    borderRadius: 18,
    backgroundColor: "#F2B233",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 24,
  },

  primaryBtnText: {
    color: "#17100B",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestOutlineBtn: {
    minHeight: 50,
    minWidth: 190,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.35)",
    backgroundColor: "rgba(242,178,51,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 24,
  },

  guestOutlineText: {
    color: "#F2B233",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestDivider: {
    width: 190,
    height: 1,
    backgroundColor: "rgba(242,178,51,0.12)",
    marginVertical: 20,
  },

  guestRoleBtn: {
    minHeight: 48,
    minWidth: 230,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.25)",
    backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 20,
  },

  guestRoleBtnDriver: {
    marginTop: 10,
    borderColor: "rgba(33,150,243,0.3)",
    backgroundColor: "rgba(33,150,243,0.08)",
  },

  guestRoleText: {
    color: "#F2B233",
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});