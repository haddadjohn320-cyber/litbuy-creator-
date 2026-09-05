"use client";

import { useLang } from "@/lib/lang";
import { IconCheck, IconFlame, IconLock } from "./icons";
import { Logo } from "./Logo";
import type { Lang } from "@/lib/i18n";

function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex overflow-hidden rounded-lg border border-line">
      {(["en", "fr"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1.5 text-xs font-bold uppercase transition ${
            lang === l ? "bg-flame text-coal" : "bg-char text-mute hover:text-bone"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-coal/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <a href="#top" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="font-display text-base font-bold tracking-wide text-bone">
            {t("brand")}
          </span>
        </a>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-mute md:flex">
          <a href="#how" className="transition hover:text-bone">
            {t("nav_how")}
          </a>
          <a href="#estimate" className="transition hover:text-bone">
            {t("nav_estimate")}
          </a>
          <a href="#apply" className="transition hover:text-ember">
            {t("nav_apply")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitch />
          <a
            href="/admin"
            title={t("nav_admin")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-mute transition hover:border-line2 hover:text-bone"
          >
            <IconLock className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  const { t } = useLang();
  const bullets = [t("hero_pay"), t("hero_code"), t("hero_dash"), t("hero_coupon")];
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-sun/30 bg-sun/10 px-3 py-1 text-xs font-bold text-sun">
          <IconFlame className="h-3.5 w-3.5" />
          {t("hero_kicker")}
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] text-bone sm:text-5xl">
          {t("hero_title")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-mute">{t("hero_sub")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#apply"
            className="rounded-lg bg-flame px-5 py-3 text-sm font-bold text-coal transition hover:bg-ember"
          >
            {t("hero_cta")}
          </a>
          <a
            href="#estimate"
            className="rounded-lg border border-line px-5 py-3 text-sm font-bold text-mute transition hover:border-line2 hover:text-bone"
          >
            {t("hero_cta2")}
          </a>
        </div>
        <ul className="mt-7 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-mute">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
                <IconCheck className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Example referral dashboard card */}
      <div className="rounded-xl border border-line bg-char p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-bold text-bone">{t("perf_title")}</p>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] font-bold text-dim">
            {t("perf_example")}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { v: "374", l: t("perf_invited") },
            { v: "80", l: t("perf_active") },
            { v: "77", l: t("perf_act") },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-line bg-coal p-3">
              <p className="font-display text-xl font-bold text-sun">{s.v}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-dim">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-char2 text-[10px] font-bold text-dim">
              <tr>
                <th className="px-3 py-2">{t("perf_user")}</th>
                <th className="px-3 py-2 text-right">{t("perf_settled")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-mute">
              {[
                ["ma**d@gmail…", "¥11.76"],
                ["gs**m@hotm…", "¥39.70"],
                ["ak**4@gmail…", "¥27.06"],
              ].map(([u, v]) => (
                <tr key={u}>
                  <td className="px-3 py-2">{u}</td>
                  <td className="px-3 py-2 text-right font-semibold text-ok">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-dim">{t("perf_note")}</p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useLang();
  const steps = [
    { n: "01", title: t("how1_t"), body: t("how1_s") },
    { n: "02", title: t("how2_t"), body: t("how2_s") },
    { n: "03", title: t("how3_t"), body: t("how3_s") },
    { n: "04", title: t("how4_t"), body: t("how4_s") },
  ];
  return (
    <section id="how" className="scroll-mt-20 border-t border-line bg-char/40">
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="font-display text-3xl font-bold text-bone">{t("how_title")}</h2>
        <p className="mt-1.5 text-sm text-mute">{t("how_sub")}</p>
        <ol className="mt-8 divide-y divide-line border-y border-line">
          {steps.map((s) => (
            <li key={s.n} className="grid grid-cols-[56px_1fr] gap-4 py-5 sm:grid-cols-[80px_1fr]">
              <span className="font-display text-2xl font-bold text-flame sm:text-3xl">
                {s.n}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-bone">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-mute">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-dim sm:flex-row">
        <p>{t("footer_note")}</p>
        <a href="/admin" className="font-semibold transition hover:text-bone">
          {t("footer_admin")}
        </a>
      </div>
    </footer>
  );
}
