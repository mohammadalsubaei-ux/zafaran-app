import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { savePushToken, setupNotificationListeners } from "@/utils/notifications";
import UpdateBanner from "@/components/UpdateBanner";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setupAuthFetch } from "@/utils/authFetch";
import {
  useFonts,
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

// يُركَّب مرة واحدة قبل أي طلب — كل نداء لخادم زعفران يحمل رمز الجلسة
setupAuthFetch();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    savePushToken().catch(() => {});

    const cleanup = setupNotificationListeners(
      undefined,
      (response) => {
        const data = response.notification.request.content.data as any;
        const orderId = data?.order_id || data?.orderId || data?.id;
        const screen = data?.screen;

        if (!orderId) return;

        if (screen === "review") {
          router.push(`/review/${orderId}` as any);
          return;
        }

        router.push(`/orders/${orderId}` as any);
      }
    );

    return cleanup;
  }, [router]);

  return (
    <SafeAreaProvider>
    <ThemeProvider>
      <LanguageProvider>
        <CartProvider>
          <ThemedShell />
          <UpdateBanner />
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}

// يقرأ المظهر من ThemeProvider ويمرره لملاحة expo-router وشريط الحالة
function ThemedShell() {
  const { isDark, c } = useTheme();

  // تحميل مركزي مرة واحدة — كانت كل شاشة تحمّلها بنفسها، ومن نسيها
  // (الإشعارات، PaymentGateway، UpdateBanner) تظهر بالخط الافتراضي.
  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
      primary: c.gold,
    },
  };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chef/[id]" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="addresses/index" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="review/[id]" />
        <Stack.Screen name="menu/index" />
        <Stack.Screen name="dashboard/chef/index" />
        <Stack.Screen name="dashboard/chef/offers" />
        <Stack.Screen name="dashboard/chef/earnings" />
        <Stack.Screen name="dashboard/driver/index" />
      </Stack>

      <StatusBar style={isDark ? "light" : "dark"} />
    </NavThemeProvider>
  );
}