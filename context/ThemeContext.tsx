// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  زعفران — الثيم المركزي (ليلي / نهاري)
//
//  لا تكتب لونًا ثابتًا داخل أي شاشة بعد اليوم. استورد useTheme واستخدم c.*
//
//  الاستخدام داخل أي شاشة:
//    const { c, mode, setMode } = useTheme();
//    const s = useMemo(() => makeStyles(c), [c]);
//    ...
//    const makeStyles = (c: Colors) => StyleSheet.create({
//      safe: { flex: 1, backgroundColor: c.bg },
//    });
//
//  ملاحظة مهمة: StyleSheet.create يجب أن يكون داخل دالة تستقبل الألوان،
//  لأن الألوان تتغيّر وقت التشغيل عند تبديل المظهر.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "auto" | "light" | "dark";

export type Colors = {
  // الأسطح
  bg: string;          // خلفية الشاشة
  surface: string;     // البطاقات والأقسام
  surfaceAlt: string;  // حقول وأسطح داخلية أعمق/أفتح
  overlay: string;     // خلفية النوافذ المنبثقة

  // النصوص
  text: string;        // العنوان الأساسي
  textSoft: string;    // نص ثانوي
  textMuted: string;   // نص خافت جدًا

  // الهوية
  gold: string;        // الذهبي على الأسطح (نصوص وأيقونات)
  goldSolid: string;   // الذهبي المصمت (خلفيات الأزرار)
  onGold: string;      // النص فوق الذهبي المصمت
  goldSoft: string;    // خلفية ذهبية خفيفة
  goldBorder: string;  // حد ذهبي خفيف

  // الحدود والفواصل
  border: string;
  divider: string;

  // الحالات
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  info: string;

  // شارات
  adBg: string;        // خلفية وسم "إعلان"
  adText: string;      // نص وسم "إعلان"
};

// ━━━ الليلي — كما هو اليوم بالضبط، لا تغيير ━━━
export const DARK: Colors = {
  bg: "#17100B",
  surface: "#21160D",
  surfaceAlt: "#2A1E00",
  overlay: "rgba(0,0,0,0.7)",

  text: "#FDF0DC",
  textSoft: "#A98961",
  textMuted: "#6D4E2D",

  gold: "#F2B233",
  goldSolid: "#F2B233",
  onGold: "#17100B",
  goldSoft: "rgba(242,178,51,0.10)",
  goldBorder: "rgba(242,178,51,0.20)",

  border: "rgba(242,178,51,0.12)",
  divider: "rgba(242,178,51,0.09)",

  success: "#4CAF50",
  successSoft: "rgba(76,175,80,0.10)",
  danger: "#E53935",
  dangerSoft: "rgba(229,57,53,0.10)",
  warning: "#F2B233",
  info: "#03A9F4",

  adBg: "rgba(255,255,255,0.08)",
  adText: "#8A6030",
};

// ━━━ النهاري — بيج دافئ يحفظ هوية زعفران ━━━
export const LIGHT: Colors = {
  bg: "#F4EDE3",          // بيج أعمق قليلًا حتى تبرز البطاقات فوقه
  surface: "#FFFCF7",     // بطاقة دافئة لا بيضاء ناصعة
  surfaceAlt: "#EDE3D5",  // حقول وأسطح داخلية أعمق درجة
  overlay: "rgba(46,33,24,0.45)",

  text: "#241A12",        // بني شبه أسود — تباين عالٍ للقراءة
  textSoft: "#6B584A",    // كان #9C8873 وكان باهتًا لا يُقرأ
  textMuted: "#8F7E6E",   // كان #A79684

  gold: "#8A5E12",        // ذهبي غامق يُقرأ على الفاتح
  goldSolid: "#F2B233",
  onGold: "#241A12",
  goldSoft: "rgba(138,94,18,0.10)",
  goldBorder: "rgba(138,94,18,0.32)",

  border: "rgba(90,70,45,0.20)",   // كان 0.13 — الحواف كانت تختفي
  divider: "rgba(90,70,45,0.13)",

  success: "#1D6B33",
  successSoft: "rgba(29,107,51,0.10)",
  danger: "#A81E1E",
  dangerSoft: "rgba(168,30,30,0.09)",
  warning: "#8A5E12",
  info: "#0B5A96",

  adBg: "rgba(36,26,18,0.08)",
  adText: "#6B584A",
};

// ━━━ السياق ━━━

const STORAGE_KEY = "theme_mode";

type ThemeContextValue = {
  c: Colors;
  mode: ThemeMode;          // ما اختاره المستخدم
  isDark: boolean;          // المظهر الفعلي المطبَّق
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  c: DARK,
  mode: "dark",
  isDark: true,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    let alive = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!alive) return;
        if (saved === "auto" || saved === "light" || saved === "dark") {
          setModeState(saved);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const isDark = mode === "auto" ? systemScheme !== "light" : mode === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({ c: isDark ? DARK : LIGHT, mode, isDark, setMode }),
    [isDark, mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// أسماء الخيارات في شاشة حسابي
export const THEME_OPTIONS: Array<{ id: ThemeMode; label: string }> = [
  { id: "auto", label: "تلقائي" },
  { id: "light", label: "نهاري" },
  { id: "dark", label: "ليلي" },
];