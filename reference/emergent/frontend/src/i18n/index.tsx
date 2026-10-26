import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import bn from "./bn.json";
import en from "./en.json";
import type { Lang } from "../types";
import { digits } from "../lib/format";

type Dict = Record<string, string>;
const dicts: Record<Lang, Dict> = { bn: bn as Dict, en: en as Dict };
const STORAGE_KEY = "htr_lang";

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  n: (value: string | number) => string;
}

const Ctx = createContext<I18n | null>(null);

function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "en" ? "en" : "bn";
  } catch {
    return "bn";
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private mode */
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const dict = dicts[lang];
    const t = (key: string, vars?: Record<string, string | number>) => {
      let s = dict[key] ?? dicts.bn[key] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replace(`{${k}}`, String(v))));
      return s;
    };
    return { lang, setLang, t, n: (v) => digits(v, lang) };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}
