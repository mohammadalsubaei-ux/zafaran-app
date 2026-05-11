import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n";

type LanguageContextType = {
  lang: string;
  toggleLang: () => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  toggleLang: async () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState(i18n.locale);

  useEffect(() => {
    AsyncStorage.getItem("lang").then(l => {
      if (l) { i18n.locale = l; setLang(l); }
    });
  }, []);

  const toggleLang = async () => {
    const newLang = lang === "ar" ? "en" : "ar";
    i18n.locale = newLang;
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
