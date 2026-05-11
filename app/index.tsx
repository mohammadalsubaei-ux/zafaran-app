import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_800ExtraBold, Almarai_400Regular } from "@expo-google-fonts/almarai";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();

  // Animated values
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({ Almarai_800ExtraBold, Almarai_400Regular });

  useEffect(() => {
    // تسلسل الأنيميشن
    Animated.sequence([
      // 1. اللوقو يظهر مع scale
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // 2. توقف قصير
      Animated.delay(200),
      // 3. الاسم يظهر
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // 4. الشعار يظهر
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 5. انتظر ثانية
      Animated.delay(1000),
    ]).start(async () => {
      // تحقق من وجود مستخدم مسجل
      const user = await AsyncStorage.getItem("user");
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    });
  }, []);

  if (!fontsLoaded) return <View style={s.safe} />;

  return (
    <View style={s.safe}>
      {/* خلفية متدرجة */}
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />

      {/* المحتوى */}
      <View style={s.content}>

        {/* توهج خلف اللوقو */}
        <Animated.View style={[s.glow, { opacity: glowOpacity }]} />

        {/* اللوقو */}
        <Animated.View style={[s.logoWrap, {
          opacity: logoOpacity,
          transform: [{ scale: logoScale }]
        }]}>
          <Text style={s.logoEmoji}>🍲</Text>
        </Animated.View>

        {/* اسم التطبيق */}
        <Animated.Text style={[s.appName, { opacity: textOpacity }]}>
          زعفران
        </Animated.Text>

        {/* الشعار */}
        <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
          أكل بيتي · طعم أصيل
        </Animated.Text>

      </View>

      {/* نقاط في الأسفل */}
      <Animated.View style={[s.footer, { opacity: tagOpacity }]}>
        <View style={s.dot} />
        <View style={[s.dot, s.dotActive]} />
        <View style={s.dot} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: "#0A0500", alignItems: "center", justifyContent: "center" },

  // دوائر الخلفية
  bgCircle1:  { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(240,165,0,0.04)", top: "10%", right: "-20%" },
  bgCircle2:  { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(240,165,0,0.03)", bottom: "15%", left: "-10%" },

  content:    { alignItems: "center", justifyContent: "center" },

  // توهج
  glow:       { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(240,165,0,0.12)", top: -30 },

  // اللوقو
  logoWrap:   {
    width: 120, height: 120, borderRadius: 36,
    backgroundColor: "#1C1000",
    borderWidth: 2, borderColor: "rgba(240,165,0,0.3)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#F0A500",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  logoEmoji:  { fontSize: 64 },

  // النصوص
  appName:    {
    fontSize: 48, fontWeight: "900", color: "#F0A500",
    fontFamily: "Almarai_800ExtraBold",
    marginBottom: 8,
    letterSpacing: 2,
  },
  tagline:    {
    fontSize: 14, color: "#8A6030",
    fontFamily: "Almarai_400Regular",
    letterSpacing: 3,
  },

  // النقاط
  footer:     { position: "absolute", bottom: 60, flexDirection: "row", gap: 8 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(240,165,0,0.2)" },
  dotActive:  { width: 20, backgroundColor: "#F0A500" },
});
