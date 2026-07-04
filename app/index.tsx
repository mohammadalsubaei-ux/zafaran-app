import { useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Almarai_800ExtraBold,
  Almarai_400Regular,
} from "@expo-google-fonts/almarai";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.94)).current;
  const logoTranslate = useRef(new Animated.Value(8)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const dotOpacity = useRef(new Animated.Value(0)).current;
  const dotMove = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Almarai_800ExtraBold,
    Almarai_400Regular,
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    let mounted = true;

    const dotsLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotMove, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotMove, {
          toValue: 0,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    dotsLoop.start();

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
        Animated.timing(logoTranslate, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(dotOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.delay(1350),

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

        if (!user) {
          router.replace("/login" as any);
          return;
        }

        let userData: any = null;

        try {
          userData = JSON.parse(user);
        } catch {
          await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
          router.replace("/login" as any);
          return;
        }

        const routes: Record<string, string> = {
         chef: "/dashboard/chef",
driver: "/dashboard/driver",
          customer: "/(tabs)",
        };

        router.replace((routes[userData?.role] || "/(tabs)") as any);
      } catch {
        router.replace("/login" as any);
      }
    });

    return () => {
      mounted = false;
      dotsLoop.stop();
    };
  }, [
    fontsLoaded,
    logoOpacity,
    logoScale,
    logoTranslate,
    dotOpacity,
    dotMove,
    exitOpacity,
    router,
  ]);

  const dotOneMove = dotMove.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const dotTwoMove = dotMove.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });

  if (!fontsLoaded) return <View style={s.safe} />;

  return (
    <Animated.View style={[s.safe, { opacity: exitOpacity }]}>
      <View style={s.circle1} />
      <View style={s.circle2} />
      <View style={s.ring1} />
      <View style={s.ring2} />

      <Animated.View
        style={[
          s.logoGlow,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          s.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslate }, { scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("@/assets/images/logo.png")}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[s.dots, { opacity: dotOpacity }]}>
        <Animated.View style={[s.dot, { transform: [{ translateY: dotOneMove }] }]} />
        <Animated.View
          style={[
            s.dot,
            s.dotActive,
            { transform: [{ translateY: dotTwoMove }] },
          ]}
        />
        <Animated.View style={[s.dot, { transform: [{ translateY: dotOneMove }] }]} />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#080400",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  circle1: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(242,178,51,0.05)",
    top: -70,
    right: -90,
  },

  circle2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(242,178,51,0.035)",
    bottom: 40,
    left: -80,
  },

  ring1: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.055)",
  },

  ring2: {
    position: "absolute",
    width: width * 0.58,
    height: width * 0.58,
    borderRadius: width,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
  },

  logoGlow: {
    position: "absolute",
    width: width * 0.76,
    height: width * 0.76,
    borderRadius: width,
    backgroundColor: "rgba(242,178,51,0.035)",
  },

  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: width * 0.78,
    height: width * 0.78,
  },

  dots: {
    position: "absolute",
    bottom: 48,
    flexDirection: "row",
    gap: 8,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(242,178,51,0.28)",
  },

  dotActive: {
    width: 22,
    backgroundColor: "#F2B233",
    borderRadius: 3,
  },
});