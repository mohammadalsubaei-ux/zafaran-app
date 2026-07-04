import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { savePushToken, setupNotificationListeners } from "@/utils/notifications";

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
    <ThemeProvider value={DarkTheme}>
      <LanguageProvider>
        <CartProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chef/[id]" />
            <Stack.Screen name="item/[id]" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="addresses/index" />
            <Stack.Screen name="orders/index" />
            <Stack.Screen name="orders/[id]" />
            <Stack.Screen name="review/[id]" />
            <Stack.Screen name="menu/index" />
            <Stack.Screen name="dashboard/chef/index" />
            <Stack.Screen name="dashboard/driver/index" />
          </Stack>

          <StatusBar style="light" />
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}