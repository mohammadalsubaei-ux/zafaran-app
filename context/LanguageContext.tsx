import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LanguageContextType = {
  lang: string;
  toggleLang: () => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  toggleLang: async () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState("ar");

  useEffect(() => {
    AsyncStorage.getItem("lang").then(l => {
      if (l) setLang(l);
    });
  }, []);

  const toggleLang = async () => {
    const newLang = lang === "ar" ? "en" : "ar";
    setLang(newLang);
    await AsyncStorage.setItem("lang", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
