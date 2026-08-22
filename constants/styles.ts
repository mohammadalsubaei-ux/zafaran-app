// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  زعفران — الأنماط المشتركة
//
//  مركز التحكم في الشكل. كل ما يتكرر بين الشاشات يُعرَّف هنا مرة واحدة،
//  وأي تعديل هنا ينعكس على التطبيق كله.
//
//  الاستخدام:
//    const { c } = useTheme();
//    const g = useMemo(() => makeCommon(c), [c]);         // المشتركة
//    const s = useMemo(() => makeStyles(c), [c]);         // الخاصة بالشاشة
//    <View style={g.safe}> ... <View style={[g.card, s.myExtra]}>
//
//  قاعدة: لا تكتب لونًا ثابتًا في أي شاشة. استخدم c.* أو أنماط هذا الملف.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { StyleSheet } from "react-native";
import type { Colors } from "@/context/ThemeContext";

// ━━━ الخطوط ━━━
export const FONT = {
  regular: "Almarai_400Regular",
  bold: "Almarai_700Bold",
  black: "Almarai_800ExtraBold",
} as const;

// ━━━ المقاسات ━━━
export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const makeCommon = (c: Colors) =>
  StyleSheet.create({
    // ── الأسطح ──
    safe: {
      flex: 1,
      backgroundColor: c.bg,
    },

    screenPad: {
      paddingHorizontal: SPACE.lg,
    },

    listContent: {
      paddingBottom: 110,
    },

    // ── الهيدر ──
    header: {
      minHeight: 62,
      paddingHorizontal: SPACE.lg,
      paddingVertical: SPACE.md,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.bg,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },

    backBtn: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: c.goldBorder,
      alignItems: "center",
      justifyContent: "center",
    },

    headerGhost: {
      width: 38,
      height: 38,
    },

    headerTitle: {
      color: c.text,
      fontSize: 17,
      fontFamily: FONT.black,
    },

    headerSub: {
      color: c.textSoft,
      fontSize: 11,
      marginTop: 3,
      fontFamily: FONT.regular,
    },

    // ── البطاقات ──
    card: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.xl,
      padding: 15,
      borderWidth: 1,
      borderColor: c.border,
    },

    cardRow: {
      backgroundColor: c.surface,
      borderRadius: 22,
      padding: 14,
      marginHorizontal: SPACE.lg,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.divider,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
    },

    cardTitle: {
      color: c.text,
      fontSize: 15,
      textAlign: "right",
      fontFamily: FONT.black,
    },

    cardSub: {
      color: c.textSoft,
      fontSize: 12,
      textAlign: "right",
      marginTop: 3,
      fontFamily: FONT.regular,
    },

    sectionTitle: {
      color: c.text,
      fontSize: 16,
      textAlign: "right",
      marginBottom: SPACE.md,
      fontFamily: FONT.black,
    },

    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginVertical: SPACE.sm,
    },

    // ── الأيقونات ──
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: c.goldSoft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },

    iconBoxLg: {
      width: 96,
      height: 96,
      borderRadius: 32,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── الأزرار ──
    primaryBtn: {
      minHeight: 52,
      borderRadius: RADIUS.md,
      backgroundColor: c.goldSolid,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row-reverse",
      gap: SPACE.sm,
      paddingHorizontal: SPACE.xl,
    },

    primaryBtnText: {
      color: c.onGold,
      fontSize: 14,
      fontFamily: FONT.black,
    },

    ghostBtn: {
      minHeight: 46,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.goldBorder,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row-reverse",
      gap: 7,
      paddingHorizontal: SPACE.xl,
    },

    ghostBtnText: {
      color: c.gold,
      fontSize: 13,
      fontFamily: FONT.bold,
    },

    dangerBtn: {
      minHeight: 48,
      borderRadius: RADIUS.md,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
    },

    dangerBtnText: {
      color: c.danger,
      fontSize: 14,
      fontFamily: FONT.bold,
    },

    btnDisabled: {
      opacity: 0.55,
    },

    // ── الحقول ──
    input: {
      minHeight: 50,
      borderRadius: RADIUS.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      color: c.text,
      fontSize: 14,
      textAlign: "right",
      fontFamily: FONT.regular,
    },

    inputLabel: {
      color: c.textSoft,
      fontSize: 12,
      textAlign: "right",
      marginBottom: 6,
      fontFamily: FONT.bold,
    },

    // ── الشارات ──
    chip: {
      minHeight: 40,
      borderRadius: 14,
      paddingHorizontal: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 7,
    },

    chipOn: {
      backgroundColor: c.goldSoft,
      borderColor: c.goldBorder,
    },

    chipText: {
      color: c.textSoft,
      fontSize: 13,
      fontFamily: FONT.bold,
    },

    chipTextOn: {
      color: c.gold,
    },

    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor: c.goldSoft,
    },

    badgeText: {
      color: c.gold,
      fontSize: 10,
      fontFamily: FONT.bold,
    },

    adBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: c.adBg,
    },

    adBadgeText: {
      color: c.adText,
      fontSize: 9,
      fontFamily: FONT.regular,
    },

    // ── الشرائط الأفقية ──
    // مهم: بلا flexGrow:0 تتمدد ScrollView الأفقية رأسيًا ويتمدد أبناؤها معها
    rail: {
      flexGrow: 0,
      flexShrink: 0,
    },

    railContent: {
      flexDirection: "row-reverse",
      alignItems: "center",
      paddingHorizontal: SPACE.lg,
      gap: 10,
    },

    railHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACE.lg,
      marginBottom: 10,
    },

    railMore: {
      color: c.gold,
      fontSize: 12,
      fontFamily: FONT.bold,
    },

    // ── الحالات ──
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.md,
    },

    loadingText: {
      color: c.textSoft,
      fontSize: 13,
      fontFamily: FONT.regular,
    },

    emptyWrap: {
      alignItems: "center",
      marginTop: 60,
      paddingHorizontal: 26,
    },

    emptyTitle: {
      color: c.text,
      fontSize: 18,
      textAlign: "center",
      marginTop: SPACE.lg,
      fontFamily: FONT.black,
    },

    emptyText: {
      color: c.textSoft,
      fontSize: 13,
      lineHeight: 24,
      textAlign: "center",
      marginTop: 9,
      marginBottom: 22,
      fontFamily: FONT.regular,
    },

    errorBox: {
      marginHorizontal: SPACE.lg,
      marginBottom: SPACE.md,
      borderRadius: RADIUS.md,
      padding: 14,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.danger,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: SPACE.sm,
    },

    errorText: {
      flex: 1,
      color: c.danger,
      fontSize: 12,
      textAlign: "right",
      lineHeight: 20,
      fontFamily: FONT.bold,
    },

    // ── الشريط السفلي الثابت ──
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: SPACE.lg,
      paddingBottom: 20,
      backgroundColor: c.bg,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },

    // ── النوافذ المنبثقة ──
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "flex-end",
    },

    modalBox: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 20,
      paddingBottom: 36,
      borderWidth: 1,
      borderColor: c.border,
    },

    modalTitle: {
      color: c.text,
      fontSize: 18,
      fontFamily: FONT.black,
    },
  });

export type CommonStyles = ReturnType<typeof makeCommon>;