import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearToken } from "@/utils/authFetch";
import {
  useFonts,
  Almarai_800ExtraBold,
  Almarai_400Regular,
} from "@expo-google-fonts/almarai";

// شاشة البداية = لوحة الهوية الأصلية كما سلّمها المصمم (assets/images/splash-art.png).
// لون الخلفية هنا هو لون حافة اللوحة نفسها، ويطابق backgroundColor للافتتاحية في app.json،
// لذلك هو ثابت عمدًا ولا يتبع الثيم.
const ART = require("@/assets/images/splash-art.png");
const ART_BG = "#FDF8F4";

export default function SplashScreen() {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.04)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    Almarai_800ExtraBold,
    Almarai_400Regular,
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    let mounted = true;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 48,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(1700),

      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(async () => {
      if (!mounted) return;

      try {
        const user = await AsyncStorage.getItem("user");

        // التصفح كضيف: بدون جلسة → الرئيسية مباشرة، والتسجيل يُطلب لحظة النية
        // (إتمام الطلب، المفضلة، طلباتي، المحفظة، حسابي)
        if (!user) {
          router.replace("/(tabs)" as any);
          return;
        }

        let userData: any = null;

        try {
          userData = JSON.parse(user);
        } catch {
          await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role", "cart_state"]);
      clearToken();
          router.replace("/(tabs)" as any);
          return;
        }

        // جلسة قديمة بلا رمز (من قبل نظام المصادقة): ندخله كضيف بدل أن
        // يتصفح ثم يصطدم برفض كل عملية حسّاسة بلا تفسير.
        if (!userData?.token) {
          await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role", "cart_state"]);
          clearToken();
          router.replace("/(tabs)" as any);
          return;
        }

        const routes: Record<string, string> = {
          chef: "/dashboard/chef",
          driver: "/dashboard/driver",
          customer: "/(tabs)",
        };

        router.replace((routes[userData?.role] || "/(tabs)") as any);
      } catch {
        router.replace("/(tabs)" as any);
      }
    });

    return () => {
      mounted = false;
    };
  }, [
    fontsLoaded,
    logoOpacity,
    logoScale,
    exitOpacity,
    router,
  ]);

  if (!fontsLoaded) return <View style={s.safe} />;

  return (
    <Animated.View style={[s.safe, { opacity: exitOpacity }]}>
      <Animated.Image
        source={ART}
        resizeMode="cover"
        style={[
          s.art,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ART_BG,
    overflow: "hidden",
  },

  art: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
});
