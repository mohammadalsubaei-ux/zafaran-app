import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  Camera,
  ChevronLeft,
  FileText,
  Headphones,
  Languages,
  Palette,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  PackageCheck,
  Pencil,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  Truck,
  User,
  UserRound,
  Wallet,
  KeyRound,
} from "lucide-react-native";

import { useLang } from "@/context/LanguageContext";
import { THEME_OPTIONS, useTheme, type Colors } from "@/context/ThemeContext";
import { pickCompressedImage, uploadImageToBucket } from "@/utils/images";

const API = "https://zafaran-backend-production.up.railway.app";

type Role = "customer" | "chef" | "driver" | string;

type UserSession = {
  id?: string | number | null;
  full_name?: string | null;
  phone?: string | null;
  role?: Role | null;
  gender?: string | null;
  avatar_url?: string | null;
};

const T: any = {
  ar: {
    account: "حسابي",
    guestTitle: "أهلًا بك في زعفران",
    guestSub: "سجل دخولك للوصول إلى الطلبات، المحفظة، العناوين، ولوحات التحكم.",
    login: "تسجيل الدخول",
    guestRegister: "إنشاء حساب جديد",
    guestChef: "سجّل متجرك المنزلي",
    guestDriver: "انضم كمندوب توصيل",
    verified: "حساب موثق",
    customer: "عميل",
    chef: "صاحب متجر",
    chefFemale: "صاحبة متجر",
    driver: "مندوب توصيل",
    services: "الخدمات",
    chefDashboard: "لوحة متجري",
    chefDashboardSub: "إدارة الطلبات والمنتجات",
    driverDashboard: "لوحة المندوب",
    driverDashboardSub: "إدارة التوصيلات",
    orders: "طلباتي",
    wallet: "محفظتي",
    addresses: "عناويني",
    addressesSub: "عناوين التوصيل المحفوظة",
    settings: "الإعدادات",
    language: "اللغة",
    languageSub: "التبديل بين العربية والإنجليزية",
    changePw: "تغيير كلمة المرور",
    changePwSub: "حدّث كلمة مرور حسابك",
    notifications: "الإشعارات",
    notificationsSub: "إشعارات الطلبات والتحديثات",
    support: "الدعم والمساعدة",
    supportSub: "تواصل معنا عند وجود مشكلة",
    legal: "المعلومات القانونية",
    privacy: "سياسة الخصوصية",
    terms: "الشروط والأحكام",
    version: "إصدار التطبيق",
    appearance: "المظهر",
    appearanceSub: "اختر بين الوضع النهاري والليلي",
    deleteAccount: "حذف الحساب",
    deleteAccountSub: "حذف حسابك وبياناتك من زعفران",
    logout: "تسجيل الخروج",
    logoutTitle: "تسجيل الخروج",
    logoutMsg: "هل تريد الخروج من حسابك؟",
    yes: "نعم",
    no: "لا",
    appFooter: "زعفران · من بيتنا لبيتك",
    editName: "تعديل الاسم",
    nameLabel: "الاسم",
    photoTitle: "الصورة الشخصية",
    choosePhoto: "اختيار صورة",
    changePhoto: "تغيير الصورة",
    removePhoto: "حذف الصورة",
    save: "حفظ",
    cancel: "إلغاء",
    uploading: "جاري رفع الصورة...",
    saving: "جاري الحفظ...",
    photoDone: "تم تحديث صورتك",
    nameDone: "تم تحديث اسمك",
  },
  en: {
    account: "My Account",
    guestTitle: "Welcome to Zafaran",
    guestSub: "Sign in to access orders, wallet, addresses, and dashboards.",
    login: "Login",
    guestRegister: "Create a new account",
    guestChef: "Register your home store",
    guestDriver: "Join as a delivery driver",
    verified: "Verified Account",
    customer: "Customer",
    chef: "Store Owner",
    chefFemale: "Store Owner",
    driver: "Delivery Driver",
    services: "Services",
    chefDashboard: "My Store Dashboard",
    chefDashboardSub: "Manage orders and products",
    driverDashboard: "Driver Dashboard",
    driverDashboardSub: "Manage deliveries",
    orders: "My Orders",
    wallet: "My Wallet",
    addresses: "My Addresses",
    addressesSub: "Saved delivery addresses",
    settings: "Settings",
    language: "Language",
    languageSub: "Switch between Arabic and English",
    changePw: "Change Password",
    changePwSub: "Update your account password",
    notifications: "Notifications",
    notificationsSub: "Order and update alerts",
    support: "Support",
    supportSub: "Contact us when you need help",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    version: "App Version",
    appearance: "Appearance",
    appearanceSub: "Choose between light and dark mode",
    deleteAccount: "Delete Account",
    deleteAccountSub: "Remove your account and data from Zafaran",
    logout: "Logout",
    logoutTitle: "Logout",
    logoutMsg: "Are you sure you want to logout?",
    yes: "Yes",
    no: "No",
    appFooter: "Zafaran · From our home to yours",
    editName: "Edit Name",
    nameLabel: "Name",
    photoTitle: "Profile Photo",
    choosePhoto: "Choose Photo",
    changePhoto: "Change Photo",
    removePhoto: "Remove Photo",
    save: "Save",
    cancel: "Cancel",
    uploading: "Uploading photo...",
    saving: "Saving...",
    photoDone: "Photo updated",
    nameDone: "Name updated",
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
  const { c, mode, setMode } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const t = T[lang] || T.ar;

  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [showNameModal, setShowNameModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

      let parsed: any = null;

      try {
        parsed = JSON.parse(stored);
      } catch {
        await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
        setUser(null);
        return;
      }

      setUser(parsed);

      // تحديث صامت من الخادم — البيانات المخزنة قد تكون قديمة بعد أي تعديل
      if (parsed?.id) {
        try {
          const res = await fetch(`${API}/api/users/${parsed.id}`);
          const json = await res.json().catch(() => null);

          if (res.ok && json?.success && json.data) {
            const merged = { ...parsed, ...json.data };
            setUser(merged);
            await AsyncStorage.setItem("user", JSON.stringify(merged));
          }
        } catch {
          // فشل التحديث لا يمنع عرض البيانات المخزنة
        }
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
        color: c.gold,
        bg: "rgba(242,178,51,0.12)",
        Icon: Store,
      };
    }

    if (user?.role === "driver") {
      return {
        label: t.driver,
        color: c.info,
        bg: "rgba(3,169,244,0.12)",
        Icon: Truck,
      };
    }

    return {
      label: t.customer,
      color: c.success,
      bg: "rgba(76,175,80,0.12)",
      Icon: UserRound,
    };
  }, [t, user?.gender, user?.role]);

  // حفظ التعديل على الخادم ثم مزامنة الجلسة المخزنة
  const patchProfile = useCallback(
    async (updates: { full_name?: string; avatar_url?: string | null }) => {
      if (!user?.id) return false;

      try {
        const res = await fetch(`${API}/api/users/${user.id}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        const json = await res.json().catch(() => null);

        if (res.ok && json?.success && json.data) {
          const merged = { ...user, ...json.data };
          setUser(merged);
          await AsyncStorage.setItem("user", JSON.stringify(merged));
          return true;
        }

        Alert.alert("تعذر الحفظ", json?.message || "حاول مرة ثانية.");
        return false;
      } catch {
        Alert.alert("مشكلة اتصال", "تأكد من الإنترنت وحاول مرة ثانية.");
        return false;
      }
    },
    [user]
  );

  // الكاميرا تفتح المعرض مباشرة — بلا مودال وسيط
  const changePhoto = useCallback(async () => {
    if (uploadingPhoto || savingName) return;

    // قص مربع 1:1 — الصورة تُعرض داخل إطار دائري
    const uri = await pickCompressedImage({ crop: [1, 1] });
    if (!uri) return;

    setUploadingPhoto(true);

    try {
      const url = await uploadImageToBucket("avatars", "avatar", uri);

      if (!url) {
        Alert.alert("تعذر رفع الصورة", "تأكد من الإنترنت وحاول مرة ثانية.");
        return;
      }

      await patchProfile({ avatar_url: url });
    } finally {
      setUploadingPhoto(false);
    }
  }, [patchProfile, savingName, uploadingPhoto]);

  const photoOptions = useCallback(() => {
    if (uploadingPhoto || savingName) return;

    if (!user?.avatar_url) {
      changePhoto();
      return;
    }

    Alert.alert(t.photoTitle, "", [
      { text: t.changePhoto, onPress: changePhoto },
      {
        text: t.removePhoto,
        style: "destructive",
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            await patchProfile({ avatar_url: null });
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
      { text: t.cancel, style: "cancel" },
    ]);
  }, [changePhoto, patchProfile, savingName, t, uploadingPhoto, user?.avatar_url]);

  const openNameModal = useCallback(() => {
    setEditName(cleanText(user?.full_name, ""));
    setShowNameModal(true);
  }, [user?.full_name]);

  const saveName = useCallback(async () => {
    const name = editName.trim();

    if (name.length < 2) {
      Alert.alert("تنبيه", "اكتب اسمك كاملاً");
      return;
    }

    setSavingName(true);

    try {
      const ok = await patchProfile({ full_name: name });
      if (ok) setShowNameModal(false);
    } finally {
      setSavingName(false);
    }
  }, [editName, patchProfile]);

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
              color={danger ? c.danger : disabled ? c.textMuted : c.gold}
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

          {!disabled ? <ChevronLeft size={18} color={c.textMuted} strokeWidth={1.8} /> : null}
        </TouchableOpacity>
      );
    },
    [c, s]
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
    [s]
  );

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
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
            <User size={58} color={c.gold} strokeWidth={1.5} />
          </View>

          <Text style={s.guestTitle}>{t.guestTitle}</Text>
          <Text style={s.guestSub}>{t.guestSub}</Text>

          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={openLogin}>
            <LogIn size={18} color={c.onGold} strokeWidth={2} />
            <Text style={s.primaryBtnText}>{t.login}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={s.guestOutlineBtn}
            onPress={() => router.push({ pathname: "/login", params: { step: "register" } } as any)}
          >
            <UserRound size={17} color={c.gold} strokeWidth={1.8} />
            <Text style={s.guestOutlineText}>{t.guestRegister}</Text>
          </TouchableOpacity>

          <View style={s.guestDivider} />

          <TouchableOpacity
            activeOpacity={0.85}
            style={s.guestRoleBtn}
            onPress={() => router.push({ pathname: "/login", params: { step: "chef_register" } } as any)}
          >
            <Store size={17} color={c.gold} strokeWidth={1.8} />
            <Text style={s.guestRoleText}>{t.guestChef}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[s.guestRoleBtn, s.guestRoleBtnDriver]}
            onPress={() => router.push({ pathname: "/login", params: { step: "driver_register" } } as any)}
          >
            <Truck size={17} color={c.info} strokeWidth={1.8} />
            <Text style={[s.guestRoleText, { color: c.info }]}>{t.guestDriver}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const RoleIcon = roleInfo.Icon;
  const fullName = cleanText(user.full_name, isArabic ? "مستخدم زعفران" : "Zafaran User");
  const phone = cleanText(user.phone, "—");
  const avatar = user.avatar_url || null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{t.account}</Text>
          <View style={s.headerBadge}>
            <Sparkles size={13} color={c.gold} />
            <Text style={s.headerBadgeText}>Zafaran</Text>
          </View>
        </View>

        <View style={s.profileCard}>
          {/* الصورة: ضغطة واحدة تفتح المعرض مباشرة (أو خيارات لمن له صورة) */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={photoOptions}
            style={s.avatarOuter}
            disabled={uploadingPhoto}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarInner}>
                <Text style={s.avatarText}>{getInitials(fullName)}</Text>
              </View>
            )}

            {uploadingPhoto ? (
              <View style={s.avatarLoading}>
                <ActivityIndicator color={c.gold} />
              </View>
            ) : null}

            <View style={s.avatarBadge}>
              <Camera size={13} color={c.onGold} strokeWidth={2.2} />
            </View>
          </TouchableOpacity>

          {/* الاسم: القلم يفتح تعديل الاسم فقط */}
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>
              {fullName}
            </Text>
            <TouchableOpacity activeOpacity={0.8} onPress={openNameModal} style={s.editNameBtn}>
              <Pencil size={14} color={c.gold} strokeWidth={1.9} />
            </TouchableOpacity>
          </View>

          <Text style={s.phone}>{phone}</Text>

          <View style={s.badgesRow}>
            <View style={[s.roleBadge, { backgroundColor: roleInfo.bg }]}>
              <RoleIcon size={15} color={roleInfo.color} strokeWidth={1.8} />
              <Text style={[s.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
            </View>

            <View style={s.verifiedBadge}>
              <ShieldCheck size={15} color={c.success} strokeWidth={1.8} />
              <Text style={s.verifiedText}>{t.verified}</Text>
            </View>
          </View>
        </View>

        {/* الوصول السريع — طلباتي والمحفظة هنا فقط، وأُزيل تكرارهما من قائمة الخدمات */}
        <View style={s.quickGrid}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={s.quickCard}
            onPress={() => router.push("/(tabs)/orders" as any)}
          >
            <PackageCheck size={23} color={c.gold} />
            <Text style={s.quickTitle}>{t.orders}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={s.quickCard}
            onPress={() => router.push("/(tabs)/wallet" as any)}
          >
            <Wallet size={23} color={c.gold} />
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
            title={t.addresses}
            subtitle={t.addressesSub}
            Icon={MapPin}
            onPress={() => router.push("/addresses" as any)}
          />
        </Section>

        <Section title={t.settings}>
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

          <MenuItem
            title={t.language}
            subtitle={t.languageSub}
            Icon={Languages}
            onPress={toggleLang}
          />

          <View style={s.themeRow}>
            <View style={s.themeHead}>
              <View style={s.menuIconBox}>
                <Palette size={20} color={c.gold} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuTitle}>{t.appearance}</Text>
                <Text style={s.menuSub}>{t.appearanceSub}</Text>
              </View>
            </View>

            <View style={s.themeOptions}>
              {THEME_OPTIONS.map((opt) => {
                const on = mode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.85}
                    style={[s.themeChip, on && s.themeChipOn]}
                    onPress={() => setMode(opt.id)}
                  >
                    <Text style={[s.themeChipText, on && s.themeChipTextOn]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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

          <MenuItem
            title={t.deleteAccount}
            subtitle={t.deleteAccountSub}
            Icon={Trash2}
            danger
            onPress={() => router.push("/delete-account" as any)}
          />

          <View style={s.versionRow}>
            <View style={s.menuIconBox}>
              <Smartphone size={20} color={c.gold} strokeWidth={1.8} />
            </View>
            <View style={s.menuInfo}>
              <Text style={s.menuTitle}>{t.version}</Text>
              <Text style={s.menuSub}>v1.0.1</Text>
            </View>
          </View>
        </Section>

        <TouchableOpacity activeOpacity={0.86} style={s.logoutBtn} onPress={logout}>
          <LogOut size={19} color={c.danger} strokeWidth={1.9} />
          <Text style={s.logoutText}>{t.logout}</Text>
        </TouchableOpacity>

        <Text style={s.footer}>{t.appFooter}</Text>
      </ScrollView>

      {/* مودال تعديل الاسم — محمي من الكيبورد */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!savingName) setShowNameModal(false); }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>{t.editName}</Text>

              <Text style={s.inputLabel}>{t.nameLabel}</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="اسمك الكامل"
                  placeholderTextColor={c.textMuted}
                  textAlign="right"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[s.saveBtn, savingName && s.saveBtnDisabled]}
                onPress={saveName}
                disabled={savingName}
              >
                {savingName ? (
                  <View style={s.saveLoadingRow}>
                    <ActivityIndicator color={c.onGold} size="small" />
                    <Text style={s.saveBtnText}>{t.saving}</Text>
                  </View>
                ) : (
                  <Text style={s.saveBtnText}>{t.save}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={s.cancelBtn}
                onPress={() => setShowNameModal(false)}
                disabled={savingName}
              >
                <Text style={s.cancelText}>{t.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
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
    color: c.text,
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
    color: c.text,
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
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  headerBadgeText: {
    color: c.gold,
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  profileCard: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: c.surface,
    borderRadius: 30,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
  },

  avatarOuter: {
    width: 102,
    height: 102,
    borderRadius: 36,
    padding: 4,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    marginBottom: 14,
    position: "relative",
  },

  avatarInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: c.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImg: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: c.bg,
    resizeMode: "cover",
  },

  avatarLoading: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 32,
    backgroundColor: c.overlay,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarBadge: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: c.surface,
  },

  avatarText: {
    color: c.gold,
    fontSize: 32,
    fontFamily: "Almarai_800ExtraBold",
  },

  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    maxWidth: "92%",
  },

  name: {
    flexShrink: 1,
    color: c.text,
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  editNameBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
  },

  phone: {
    marginTop: 5,
    color: c.textSoft,
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
    backgroundColor: c.successSoft,
  },

  verifiedText: {
    color: c.success,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  quickTitle: {
    color: c.text,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  section: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: c.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.goldSoft,
    overflow: "hidden",
  },

  sectionTitle: {
    color: c.textMuted,
    fontSize: 11,
    letterSpacing: 1.2,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 4,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  themeRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },

  themeHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },

  themeOptions: {
    flexDirection: "row-reverse",
    gap: 8,
  },

  themeChip: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  themeChipOn: {
    backgroundColor: c.border,
    borderColor: c.goldBorder,
  },

  themeChipText: {
    color: c.textSoft,
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },

  themeChipTextOn: {
    color: c.gold,
  },

  menuItem: {
    minHeight: 66,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: c.goldSoft,
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
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
  },

  menuIconDanger: {
    backgroundColor: c.dangerSoft,
    borderColor: c.dangerSoft,
  },

  menuIconDisabled: {
    backgroundColor: c.goldSoft,
  },

  menuInfo: {
    flex: 1,
  },

  menuTitle: {
    color: c.text,
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  menuTitleDanger: {
    color: c.danger,
  },

  menuTitleDisabled: {
    color: c.textSoft,
  },

  menuSub: {
    color: c.textSoft,
    textAlign: "right",
    marginTop: 3,
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  menuSubDisabled: {
    color: c.textMuted,
  },

  versionRow: {
    minHeight: 66,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: c.goldSoft,
  },

  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 18,
    minHeight: 56,
    borderRadius: 19,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  logoutText: {
    color: c.danger,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  footer: {
    color: c.surfaceAlt,
    textAlign: "center",
    fontSize: 12,
    marginTop: 18,
    paddingHorizontal: 16,
    fontFamily: "Almarai_400Regular",
  },

  // ━━ مودال تعديل الاسم ━━
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "flex-end",
  },

  modalBox: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
  },

  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: c.goldBorder,
    marginBottom: 14,
  },

  modalTitle: {
    color: c.text,
    fontSize: 19,
    marginBottom: 18,
    fontFamily: "Almarai_800ExtraBold",
  },

  inputLabel: {
    alignSelf: "flex-end",
    color: c.gold,
    fontSize: 12,
    marginBottom: 7,
    fontFamily: "Almarai_800ExtraBold",
  },

  inputWrap: {
    width: "100%",
    backgroundColor: c.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  input: {
    height: 50,
    color: c.text,
    fontSize: 15,
    fontFamily: "Almarai_400Regular",
  },

  saveBtn: {
    width: "100%",
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtnDisabled: {
    opacity: 0.72,
  },

  saveLoadingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },

  saveBtnText: {
    color: c.bg,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  cancelText: {
    color: c.textSoft,
    fontSize: 14,
    fontFamily: "Almarai_700Bold",
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 22,
  },

  guestTitle: {
    color: c.text,
    fontSize: 22,
    textAlign: "center",
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
    minHeight: 54,
    minWidth: 190,
    borderRadius: 18,
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 24,
  },

  primaryBtnText: {
    color: c.bg,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestOutlineBtn: {
    minHeight: 50,
    minWidth: 190,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 24,
  },

  guestOutlineText: {
    color: c.gold,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestDivider: {
    width: 190,
    height: 1,
    backgroundColor: c.border,
    marginVertical: 20,
  },

  guestRoleBtn: {
    minHeight: 48,
    minWidth: 230,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 20,
  },

  guestRoleBtnDriver: {
    marginTop: 10,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
  },

  guestRoleText: {
    color: c.gold,
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});