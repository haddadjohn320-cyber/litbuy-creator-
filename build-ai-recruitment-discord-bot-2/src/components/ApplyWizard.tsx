"use client";

import { useRef, useState, type ReactNode } from "react";
import { FREQ_VALUES, LANG_OPTIONS } from "@/lib/i18n";
import { useLang } from "@/lib/lang";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconUpload,
  IconX,
} from "./icons";

type FormState = {
  tiktokUrl: string;
  followers: string;
  freq: string;
  langs: string[];
  hasPrior: "" | "yes" | "no";
  agents: string;
  invited: string;
  active: string;
  discord: string;
  email: string;
  screenshot: string | null;
  consent: boolean;
};

const INITIAL: FormState = {
  tiktokUrl: "",
  followers: "",
  freq: "",
  langs: [],
  hasPrior: "",
  agents: "",
  invited: "",
  active: "",
  discord: "",
  email: "",
  screenshot: null,
  consent: false,
};

const TIKTOK_RE = /^https?:\/\/(www\.|m\.)?tiktok\.com\/@?[A-Za-z0-9_.]+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isNum(v: string): boolean {
  return v.trim() !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not-image"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxW = 1280;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      } catch {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-bone">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-dim">{hint}</p>}
      {error && <p className="text-xs font-semibold text-bad">{error}</p>}
    </div>
  );
}

export default function ApplyWizard() {
  const { t, lang } = useLang();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<"form" | "submitting" | "success">("form");
  const [serverError, setServerError] = useState("");
  const [shotBusy, setShotBusy] = useState(false);
  const [refId, setRefId] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const inputCls = (err?: string) =>
    `w-full rounded-lg border bg-coal px-3.5 py-2.5 text-sm text-bone placeholder:text-dim outline-none transition focus:ring-2 ${
      err
        ? "border-bad focus:border-bad focus:ring-bad/25"
        : "border-line focus:border-flame focus:ring-flame/25"
    }`;

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.tiktokUrl.trim()) e.tiktokUrl = t("err_required");
      else if (!TIKTOK_RE.test(form.tiktokUrl.trim())) e.tiktokUrl = t("err_url");
      if (!isNum(form.followers)) e.followers = t("err_followers");
      if (!form.freq) e.freq = t("err_required");
    }
    if (s === 2) {
      if (form.langs.length === 0) e.langs = t("err_lang");
    }
    if (s === 3) {
      if (!form.hasPrior) e.hasPrior = t("err_prior");
      if (form.hasPrior === "yes") {
        if (!form.agents.trim()) e.agents = t("err_agents");
        if (!isNum(form.invited)) e.invited = t("err_number");
        if (!isNum(form.active)) e.active = t("err_number");
      }
    }
    if (s === 4) {
      if (form.discord.trim().length < 2) e.discord = t("err_required");
      if (!form.email.trim()) e.email = t("err_required");
      else if (!EMAIL_RE.test(form.email.trim())) e.email = t("err_email");
      if (!form.consent) e.consent = t("err_consent");
    }
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStep((v) => Math.min(4, v + 1));
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function back() {
    setErrors({});
    setStep((v) => Math.max(1, v - 1));
  }

  async function onShot(file: File | null) {
    if (!file) return;
    setShotBusy(true);
    setServerError("");
    try {
      const data = await compressImage(file);
      if (data.length > 1_400_000) {
        setErrors((e) => ({ ...e, screenshot: t("f_shot_big") }));
      } else {
        setErrors((e) => {
          const n = { ...e };
          delete n.screenshot;
          return n;
        });
        set("screenshot", data);
      }
    } catch {
      setErrors((e) => ({ ...e, screenshot: t("f_shot_bad") }));
    } finally {
      setShotBusy(false);
    }
  }

  async function submit() {
    const e = validate(4);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setPhase("submitting");
    setServerError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiktokUrl: form.tiktokUrl.trim(),
          followers: Number(form.followers),
          postingFrequency: form.freq,
          languages: form.langs,
          hasPriorCollab: form.hasPrior === "yes",
          priorAgents: form.hasPrior === "yes" ? form.agents.trim() : null,
          invitedUsers: form.hasPrior === "yes" ? Number(form.invited) : null,
          activeUsers: form.hasPrior === "yes" ? Number(form.active) : null,
          discord: form.discord.trim(),
          email: form.email.trim(),
          screenshot: form.screenshot,
        }),
      });
      let code = "";
      if (!res.ok) {
        try {
          code = ((await res.json()) as { error?: string }).error ?? "";
        } catch {
          /* not json */
        }
        throw new Error(code || "http");
      }
      const data: { id: number } = await res.json();
      setRefId(data.id);
      setPhase("success");
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setServerError(
        msg === "db-not-configured" || msg === "db-error" ? t("err_db") : t("err_server"),
      );
      setPhase("form");
    }
  }

  const stepMeta = [
    { n: 1, label: t("step1") },
    { n: 2, label: t("step2") },
    { n: 3, label: t("step3") },
    { n: 4, label: t("step4") },
  ];

  const langOpts = LANG_OPTIONS[lang];

  return (
    <div ref={cardRef} className="scroll-mt-24 overflow-hidden rounded-xl border border-line bg-char">
      {/* Step header 01 → 04 */}
      <div className="grid grid-cols-4 border-b border-line bg-char2/40">
        {stepMeta.map((s) => {
          const done = phase === "success" || step > s.n;
          const current = phase !== "success" && step === s.n;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => {
                if (phase === "form" && s.n < step) setStep(s.n);
              }}
              className={`flex flex-col items-center gap-1 border-r border-line py-3 last:border-r-0 ${
                current ? "bg-flame/10" : ""
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold ${
                  done
                    ? "bg-ok/15 text-ok"
                    : current
                      ? "bg-flame text-coal"
                      : "bg-char2 text-dim"
                }`}
              >
                {done ? <IconCheck className="h-3.5 w-3.5" /> : `0${s.n}`}
              </span>
              <span
                className={`hidden px-1 text-[11px] font-semibold sm:block ${
                  current ? "text-bone" : done ? "text-mute" : "text-dim"
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-7">
        {phase === "success" ? (
          <div className="rise-in space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok/15 text-ok">
              <IconCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold">{t("ok_title")}</h3>
              <p className="mt-1 text-sm text-mute">{t("ok_sub")}</p>
            </div>
            <p className="inline-block rounded-lg border border-line bg-coal px-4 py-2 font-display text-sm font-bold text-sun">
              {t("ok_ref")} : #LB-{String(refId ?? 0).padStart(4, "0")}
            </p>
            <div className="mx-auto max-w-sm rounded-lg border border-line bg-coal p-4 text-left">
              <p className="mb-2 text-xs font-bold text-mute">{t("ok_next_t")}</p>
              <ol className="space-y-2 text-sm text-mute">
                {[t("ok_next1"), t("ok_next2"), t("ok_next3")].map((txt, i) => (
                  <li key={txt} className="flex gap-2.5">
                    <span className="font-display font-bold text-flame">0{i + 1}</span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ol>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm(INITIAL);
                setStep(1);
                setErrors({});
                setPhase("form");
              }}
              className="text-sm font-semibold text-mute underline-offset-4 hover:text-bone hover:underline"
            >
              {t("ok_again")}
            </button>
          </div>
        ) : (
          <div key={step} className="rise-in space-y-5">
            {serverError && (
              <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-2.5 text-sm font-semibold text-bad">
                {serverError}
              </div>
            )}

            {step === 1 && (
              <>
                <Field label={t("f_tiktok")} hint={t("f_tiktok_hint")} error={errors.tiktokUrl}>
                  <input
                    className={inputCls(errors.tiktokUrl)}
                    placeholder={t("f_tiktok_ph")}
                    value={form.tiktokUrl}
                    onChange={(e) => set("tiktokUrl", e.target.value)}
                    inputMode="url"
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t("f_followers")} error={errors.followers}>
                    <input
                      className={inputCls(errors.followers)}
                      placeholder="25000"
                      value={form.followers}
                      onChange={(e) => set("followers", e.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label={t("f_freq")} error={errors.freq}>
                    <select
                      className={inputCls(errors.freq)}
                      value={form.freq}
                      onChange={(e) => set("freq", e.target.value)}
                    >
                      <option value="">{t("f_freq_ph")}</option>
                      {FREQ_VALUES.map((f) => (
                        <option key={f} value={f}>
                          {t(`freq_${f}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </>
            )}

            {step === 2 && (
              <Field label={t("f_lang")} hint={t("f_lang_hint")} error={errors.langs}>
                <div className="flex flex-wrap gap-2">
                  {langOpts.map((o) => {
                    const on = form.langs.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          set(
                            "langs",
                            on ? form.langs.filter((l) => l !== o.value) : [...form.langs, o.value],
                          )
                        }
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                          on
                            ? "border-flame bg-flame/15 text-ember"
                            : "border-line bg-coal text-mute hover:border-line2 hover:text-bone"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {step === 3 && (
              <>
                <Field label={t("f_prior")} error={errors.hasPrior}>
                  <div className="flex gap-2">
                    {(["yes", "no"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set("hasPrior", v)}
                        className={`rounded-lg border px-5 py-2 text-sm font-bold transition ${
                          form.hasPrior === v
                            ? v === "yes"
                              ? "border-flame bg-flame/15 text-ember"
                              : "border-line2 bg-char2 text-bone"
                            : "border-line bg-coal text-mute hover:text-bone"
                        }`}
                      >
                        {t(v)}
                      </button>
                    ))}
                  </div>
                </Field>
                {form.hasPrior === "yes" && (
                  <div className="rise-in space-y-5 rounded-lg border border-line bg-coal/60 p-4">
                    <Field label={t("f_agents")} hint={t("f_agents_hint")} error={errors.agents}>
                      <input
                        className={inputCls(errors.agents)}
                        placeholder={t("f_agents_ph")}
                        value={form.agents}
                        onChange={(e) => set("agents", e.target.value)}
                      />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label={t("f_invited")} error={errors.invited}>
                        <input
                          className={inputCls(errors.invited)}
                          placeholder="374"
                          value={form.invited}
                          onChange={(e) => set("invited", e.target.value.replace(/[^\d]/g, ""))}
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label={t("f_active")} error={errors.active}>
                        <input
                          className={inputCls(errors.active)}
                          placeholder="80"
                          value={form.active}
                          onChange={(e) => set("active", e.target.value.replace(/[^\d]/g, ""))}
                          inputMode="numeric"
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t("f_discord")} error={errors.discord}>
                    <input
                      className={inputCls(errors.discord)}
                      placeholder={t("f_discord_ph")}
                      value={form.discord}
                      onChange={(e) => set("discord", e.target.value)}
                    />
                  </Field>
                  <Field label={t("f_email")} hint={t("f_email_hint")} error={errors.email}>
                    <input
                      className={inputCls(errors.email)}
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      inputMode="email"
                    />
                  </Field>
                </div>

                <Field label={t("f_shot")} hint={t("f_shot_hint")} error={errors.screenshot}>
                  {form.screenshot ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.screenshot}
                        alt="Litbuy dashboard"
                        className="h-24 w-auto rounded-lg border border-line object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => set("screenshot", null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-mute hover:border-bad/50 hover:text-bad"
                      >
                        <IconX className="h-3.5 w-3.5" />
                        {t("f_shot_remove")}
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-sm font-semibold transition ${
                        shotBusy
                          ? "cursor-wait border-line text-dim"
                          : "border-line2 text-mute hover:border-flame hover:text-ember"
                      }`}
                    >
                      <IconUpload className="h-4 w-4" />
                      {shotBusy ? "…" : t("f_shot_add")}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void onShot(e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </Field>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-mute">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#ff6a00]"
                    />
                    {t("f_consent")}
                  </label>
                  {errors.consent && (
                    <p className="mt-1 text-xs font-semibold text-bad">{errors.consent}</p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-between border-t border-line pt-5">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-mute transition hover:border-line2 hover:text-bone"
                >
                  <IconArrowLeft className="h-4 w-4" />
                  {t("btn_back")}
                </button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-lg bg-flame px-5 py-2.5 text-sm font-bold text-coal transition hover:bg-ember"
                >
                  {t("btn_next")}
                  <IconArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={phase === "submitting"}
                  className="inline-flex items-center gap-2 rounded-lg bg-flame px-5 py-2.5 text-sm font-bold text-coal transition hover:bg-ember disabled:cursor-wait disabled:opacity-60"
                >
                  {phase === "submitting" ? t("btn_submitting") : t("btn_submit")}
                  <IconArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
