"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { makeT, type Lang } from "./i18n";

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("lb_lang");
    if (saved === "fr" || saved === "en") setLangState(saved);
  }, []);

  const value = useMemo<LangCtx>(() => {
    const setLang = (l: Lang) => {
      setLangState(l);
      try {
        window.localStorage.setItem("lb_lang", l);
      } catch {
        /* private mode */
      }
    };
    return { lang, setLang, t: makeT(lang) };
  }, [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
