import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <LanguageProvider>
        <CartProvider>
          <Stack>
            <Stack.Screen name="index"           options={{ headerShown: false }} />
            <Stack.Screen name="login"           options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
            <Stack.Screen name="chef/[id]"       options={{ headerShown: false }} />
            <Stack.Screen name="item/[id]"       options={{ headerShown: false }} />
            <Stack.Screen name="cart"            options={{ headerShown: false }} />
            <Stack.Screen name="addresses/index" options={{ headerShown: false }} />
            <Stack.Screen name="orders/index"    options={{ headerShown: false }} />
            <Stack.Screen name="dashboard/index" options={{ headerShown: false }} />
            <Stack.Screen name="driver/index"    options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
