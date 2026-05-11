import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_800ExtraBold, Almarai_400Regular } from "@expo-google-fonts/almarai";
import Svg, { Path, Ellipse, Line, Circle, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from "react-native-svg";

const { width, height } = Dimensions.get("window");

function BowlIcon({ size = 100 }: { size?: number }) {
  const s = size / 100;
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
      {/* دخان */}
      <Path d="M30,22 C27,14 33,8 30,22 C27,32 33,38 30,48"
        stroke="#F0A500" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.5}/>
      <Path d="M50,18 C47,8 53,12 50,24 C47,36 53,42 50,52"
        stroke="#F0A500" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={0.8}/>
      <Path d="M70,22 C67,14 73,8 70,22 C67,32 73,38 70,48"
        stroke="#F0A500" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.5}/>

      {/* حافة الصحن العليا */}
      <Ellipse cx="50" cy="58" rx="44" ry="10" fill="#F0A500" opacity={0.9}/>

      {/* جسم الصحن */}
      <Path d="M6,58 Q6,95 50,99 Q94,95 94,58 Z"
        fill="#120800" stroke="#F0A500" strokeWidth="2.2"/>

      {/* غطاء خفيف */}
      <Path d="M6,58 Q6,50 50,47 Q94,50 94,58"
        fill="#F0A500" opacity={0.2}/>

      {/* طبق تحت */}
      <Ellipse cx="50" cy="102" rx="42" ry="7"
        fill="none" stroke="#F0A500" strokeWidth="1.5" opacity={0.5}/>
      <Path d="M8,98 Q8,109 50,109 Q92,109 92,98"
        fill="none" stroke="#F0A500" strokeWidth="1.2" opacity={0.3}/>
    </Svg>
  );
}

export default function SplashScreen() {
  const router = useRouter();

  const containerOpacity = useRef(new Animated.Value(0)).current;
  const bowlTranslate    = useRef(new Animated.Value(30)).current;
  const bowlOpacity      = useRef(new Animated.Value(0)).current;
  const textOpacity      = useRef(new Animated.Value(0)).current;
  const sloganOpacity    = useRef(new Animated.Value(0)).current;
  const exitOpacity      = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({ Almarai_800ExtraBold, Almarai_400Regular });

  useEffect(() => {
    Animated.sequence([
      // ظهور الخلفية
      Animated.timing(containerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // ظهور الصحن من الأسفل
      Animated.parallel([
        Animated.spring(bowlTranslate, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(bowlOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      // ظهور الاسم
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(100),
      // ظهور الشعار
      Animated.timing(sloganOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // انتظار
      Animated.delay(1200),
      // خروج
      Animated.timing(exitOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(async () => {
      const user = await AsyncStorage.getItem("user");
      router.replace(user ? "/(tabs)" : "/login");
    });
  }, []);

  if (!fontsLoaded) return <View style={s.safe} />;

  return (
    <Animated.View style={[s.safe, { opacity: exitOpacity }]}>
      {/* دوائر خلفية */}
      <View style={s.circle1} />
      <View style={s.circle2} />

      {/* المحتوى */}
      <Animated.View style={[s.content, { opacity: containerOpacity }]}>

        {/* الصحن */}
        <Animated.View style={{
          opacity: bowlOpacity,
          transform: [{ translateY: bowlTranslate }],
          marginBottom: 8,
        }}>
          <BowlIcon size={130} />
        </Animated.View>

        {/* فاصل */}
        <View style={s.separator} />

        {/* اسم زعفران */}
        <Animated.Text style={[s.appName, { opacity: textOpacity }]}>
          زعفران
        </Animated.Text>

        {/* شعار */}
        <Animated.Text style={[s.tagline, { opacity: sloganOpacity }]}>
          أكل بيتي  ·  طعم أصيل
        </Animated.Text>

      </Animated.View>

      {/* نقاط سفلية */}
      <Animated.View style={[s.dots, { opacity: sloganOpacity }]}>
        <View style={s.dot} />
        <View style={[s.dot, s.dotActive]} />
        <View style={s.dot} />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: "#0A0500", alignItems: "center", justifyContent: "center" },
  circle1:   { position: "absolute", width: 350, height: 350, borderRadius: 175, backgroundColor: "rgba(240,165,0,0.04)", top: -50, right: -80 },
  circle2:   { position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(240,165,0,0.03)", bottom: 50, left: -60 },
  content:   { alignItems: "center" },
  separator: { width: 120, height: 1, backgroundColor: "rgba(240,165,0,0.2)", marginVertical: 16 },
  appName:   {
    fontSize: 72,
    fontWeight: "900",
    color: "#F0A500",
    fontFamily: "Almarai_800ExtraBold",
    textShadowColor: "rgba(240,165,0,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 4,
  },
  tagline:   {
    fontSize: 12,
    color: "#8A6030",
    fontFamily: "Almarai_400Regular",
    letterSpacing: 4,
    marginTop: 8,
  },
  dots:      { position: "absolute", bottom: 50, flexDirection: "row", gap: 8 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(240,165,0,0.2)" },
  dotActive: { width: 22, backgroundColor: "#F0A500", borderRadius: 3 },
});
