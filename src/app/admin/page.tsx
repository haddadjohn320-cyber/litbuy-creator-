"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconCheck,
  IconChevron,
  IconCopy,
  IconDownload,
  IconExternal,
  IconLock,
  IconLogout,
  IconSearch,
} from "@/components/icons";
import { Logo } from "@/components/Logo";
import { FREQ_VALUES, LANG_OPTIONS, makeAdminT, type Lang } from "@/lib/i18n";

type AppRow = {
  id: number;
  tiktokUrl: string;
  followers: number;
  postingFrequency: string;
  languages: string;
  hasPriorCollab: boolean;
  priorAgents: string | null;
  invitedUsers: number | null;
  activeUsers: number | null;
  discord: string;
  email: string;
  screenshot: string | null;
  status: string;
  createdAt: string;
};

const STATUSES = ["new", "contacted", "accepted", "rejected"] as const;
type Status = (typeof STATUSES)[number];
const TOKEN_KEY = "lb_admin_token";

const STATUS_CLS: Record<Status, string> = {
  new: "border-sun/40 bg-sun/10 text-sun",
  contacted: "border-ember/40 bg-ember/10 text-ember",
  accepted: "border-ok/40 bg-ok/10 text-ok",
  rejected: "border-bad/40 bg-bad/10 text-bad",
};

function parseLangs(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked — session-only auth still works via state */
  }
}

/** fetch with a hard timeout so the UI can never spin forever. */
function fetchT(url: string, init?: RequestInit, ms = 12_000): Promise<Response> {
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() =>
    window.clearTimeout(id),
  );
}

export default function AdminPage() {
  const [lang, setLangState] = useState<Lang>("en");
  const t = useMemo(() => makeAdminT(lang), [lang]);
  const [auth, setAuth] = useState<"checking" | "out" | "in">("checking");
  const [token, setToken] = useState<string | null>(null);
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("lb_lang");
    if (saved === "fr" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("lb_lang", l);
    } catch {
      /* noop */
    }
  };

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const authHeaders = useCallback(
    (tk: string | null) => {
      const h: Record<string, string> = {};
      if (tk) h.Authorization = `Bearer ${tk}`;
      return h;
    },
    [],
  );

  const load = useCallback(
    async (tk: string | null) => {
      try {
        const res = await fetchT("/api/applications", { headers: authHeaders(tk) });
        if (res.status === 401) {
          setToken(null);
          storeToken(null);
          setAuth("out");
          return;
        }
        if (res.status === 500) {
          let code = "";
          try {
            code = ((await res.json()) as { error?: string }).error ?? "";
          } catch {
            /* not json */
          }
          if (code === "db-not-configured" || code === "db-error") {
            setDbError(t("admin_db_missing"));
            setAuth("in");
          } else {
            setAuth("out");
          }
          return;
        }
        if (!res.ok) {
          setAuth("out");
          return;
        }
        const data: AppRow[] = await res.json();
        setRows(data);
        setDbError("");
        setAuth("in");
      } catch {
        setAuth("out");
      }
    },
    [authHeaders, t],
  );

  useEffect(() => {
    const tk = readStoredToken();
    if (tk) {
      setToken(tk);
      void load(tk);
    } else {
      setAuth("out");
    }
  }, [load]);

  async function login() {
    setLoginBusy(true);
    setLoginErr("");
    try {
      const res = await fetchT("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: pass }),
      });
      if (res.status === 429) {
        setLoginErr(t("admin_later"));
        return;
      }
      if (res.status === 404 || res.status === 500) {
        setLoginErr(t("admin_deploy"));
        return;
      }
      if (!res.ok) {
        setLoginErr(t("admin_bad"));
        return;
      }
      const data: { token?: string } = await res.json();
      const tk = data.token ?? null;
      setToken(tk);
      storeToken(tk);
      setPass("");
      await load(tk);
    } catch {
      setLoginErr(t("admin_deploy"));
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", headers: authHeaders(token) });
    } catch {
      /* noop */
    }
    setToken(null);
    storeToken(null);
    setRows([]);
    setAuth("out");
  }

  async function setStatus(id: number, status: Status) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated: AppRow = await res.json();
        setRows((r) => r.map((row) => (row.id === id ? updated : row)));
        showToast(t("admin_status_updated"));
      }
    } catch {
      showToast(t("err_server"));
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("admin_copied"));
    } catch {
      showToast(text);
    }
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportCsv() {
    const esc = (v: string | number | null) => {
      const s = v === null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      "id",
      "created_at",
      "status",
      "discord",
      "email",
      "tiktok_url",
      "followers",
      "posting_frequency",
      "languages",
      "prior_collab",
      "prior_agents",
      "invited_users",
      "active_users",
      "screenshot",
    ];
    const lines = rows.map((r) =>
      [
        r.id,
        r.createdAt,
        r.status,
        esc(r.discord),
        esc(r.email),
        esc(r.tiktokUrl),
        r.followers,
        r.postingFrequency,
        esc(parseLangs(r.languages).join(" / ")),
        r.hasPriorCollab ? "yes" : "no",
        esc(r.priorAgents),
        r.invitedUsers ?? "",
        r.activeUsers ?? "",
        r.screenshot ? "yes" : "no",
      ].join(","),
    );
    download("litbuy-creators-applications.csv", "\uFEFF" + header.join(",") + "\n" + lines.join("\n"), "text/csv;charset=utf-8");
  }

  function exportJson() {
    download("litbuy-creators-backup.json", JSON.stringify(rows, null, 2), "application/json");
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { new: 0, contacted: 0, accepted: 0, rejected: 0 };
    rows.forEach((r) => {
      if (r.status in c) c[r.status] += 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.discord, r.email, r.tiktokUrl, r.priorAgents ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, filter, query]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fmtNum = (n: number) =>
    new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US").format(n);

  const langLabel = (v: string) => LANG_OPTIONS[lang].find((o) => o.value === v)?.label ?? v;

  const freqLabel = (v: string) =>
    FREQ_VALUES.includes(v as (typeof FREQ_VALUES)[number]) ? t(`freq_${v}`) : v;

  return (
    <div className="min-h-screen bg-coal text-bone">
      <header className="sticky top-0 z-40 border-b border-line bg-coal/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <div>
              <p className="font-display text-sm font-bold leading-tight">{t("brand")}</p>
              <p className="text-[11px] font-semibold text-dim">{t("nav_admin")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <a
              href="/"
              className="hidden rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-mute transition hover:text-bone sm:block"
            >
              {t("admin_back_site")}
            </a>
            {auth === "in" && (
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-mute transition hover:border-bad/50 hover:text-bad"
              >
                <IconLogout className="h-3.5 w-3.5" />
                {t("admin_logout")}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {auth === "checking" && (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-flame" />
          </div>
        )}

        {auth === "out" && (
          <div className="mx-auto max-w-sm py-16">
            <div className="rounded-xl border border-line bg-char p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-flame/15 text-flame">
                <IconLock className="h-5 w-5" />
              </div>
              <h1 className="font-display text-xl font-bold">{t("admin_login_t")}</h1>
              <p className="mt-1 text-sm text-mute">{t("admin_login_sub")}</p>
              <form
                className="mt-5 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void login();
                }}
              >
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder={t("admin_pass")}
                  className="w-full rounded-lg border border-line bg-coal px-3.5 py-2.5 text-sm outline-none transition placeholder:text-dim focus:border-flame focus:ring-2 focus:ring-flame/25"
                />
                {loginErr && <p className="text-xs font-semibold text-bad">{loginErr}</p>}
                <button
                  type="submit"
                  disabled={loginBusy || !pass}
                  className="w-full rounded-lg bg-flame px-4 py-2.5 text-sm font-bold text-coal transition hover:bg-ember disabled:cursor-wait disabled:opacity-60"
                >
                  {loginBusy ? "…" : t("admin_login_btn")}
                </button>
              </form>
            </div>
          </div>
        )}

        {auth === "in" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold">{t("admin_title")}</h1>
              <p className="mt-1 text-sm text-mute">{t("admin_sub")}</p>
            </div>

            {dbError && (
              <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm font-semibold text-warn">
                {dbError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  ["all", t("admin_total"), rows.length, "text-bone"],
                  ["new", t("admin_new"), counts.new, "text-sun"],
                  ["contacted", t("admin_contacted"), counts.contacted, "text-ember"],
                  ["accepted", t("admin_accepted"), counts.accepted, "text-ok"],
                  ["rejected", t("admin_rejected"), counts.rejected, "text-bad"],
                ] as const
              ).map(([key, label, value, color]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key as "all" | Status)}
                  className={`rounded-xl border p-3 text-left transition ${
                    filter === key
                      ? "border-flame bg-flame/10"
                      : "border-line bg-char hover:border-line2"
                  }`}
                >
                  <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-[11px] font-semibold text-dim">{label}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("admin_search_ph")}
                  className="w-full rounded-lg border border-line bg-char py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-dim focus:border-flame focus:ring-2 focus:ring-flame/25"
                />
              </div>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-mute transition hover:border-line2 hover:text-bone"
              >
                <IconDownload className="h-4 w-4" />
                {t("admin_export")}
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-mute transition hover:border-line2 hover:text-bone"
              >
                <IconDownload className="h-4 w-4" />
                {t("admin_export_json")}
              </button>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line2 py-16 text-center text-sm text-mute">
                {t("admin_empty")}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line2 py-16 text-center text-sm text-mute">
                {t("admin_empty_filter")}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => {
                  const open = openId === r.id;
                  const status = (STATUSES.includes(r.status as Status)
                    ? r.status
                    : "new") as Status;
                  return (
                    <div
                      key={r.id}
                      className="overflow-hidden rounded-xl border border-line bg-char"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : r.id)}
                        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition hover:bg-char2/50"
                      >
                        <span className="font-display text-xs font-bold text-dim">
                          #{String(r.id).padStart(4, "0")}
                        </span>
                        <span className="min-w-[120px] flex-1 text-sm font-bold text-bone">
                          {r.discord}
                        </span>
                        <span className="hidden text-xs text-mute md:block">
                          {fmtNum(r.followers)} {t("admin_th_followers").toLowerCase()}
                        </span>
                        <span className="hidden text-xs text-dim sm:block">
                          {fmtDate(r.createdAt)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_CLS[status]}`}
                        >
                          {t(`admin_${status}`)}
                        </span>
                        <IconChevron
                          className={`h-4 w-4 text-dim transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>

                      {open && (
                        <div className="rise-in space-y-4 border-t border-line bg-coal/50 px-4 py-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 text-sm">
                              <p className="flex items-center gap-2 text-mute">
                                <span className="w-24 shrink-0 text-[11px] font-bold text-dim">
                                  {t("admin_th_discord")}
                                </span>
                                <span className="font-semibold text-bone">{r.discord}</span>
                                <button
                                  type="button"
                                  onClick={() => void copy(r.discord)}
                                  className="text-dim transition hover:text-bone"
                                  title={t("admin_copy")}
                                >
                                  <IconCopy className="h-3.5 w-3.5" />
                                </button>
                              </p>
                              <p className="flex items-center gap-2 text-mute">
                                <span className="w-24 shrink-0 text-[11px] font-bold text-dim">
                                  {t("admin_detail_email")}
                                </span>
                                <span className="font-semibold text-bone">{r.email}</span>
                                <button
                                  type="button"
                                  onClick={() => void copy(r.email)}
                                  className="text-dim transition hover:text-bone"
                                  title={t("admin_copy")}
                                >
                                  <IconCopy className="h-3.5 w-3.5" />
                                </button>
                              </p>
                              <p className="flex items-center gap-2 text-mute">
                                <span className="w-24 shrink-0 text-[11px] font-bold text-dim">
                                  {t("admin_th_tiktok")}
                                </span>
                                <a
                                  href={r.tiktokUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-ember hover:underline"
                                >
                                  {t("admin_open_tiktok")}
                                  <IconExternal className="h-3.5 w-3.5" />
                                </a>
                              </p>
                              <p className="flex items-center gap-2 text-mute">
                                <span className="w-24 shrink-0 text-[11px] font-bold text-dim">
                                  {t("admin_detail_freq")}
                                </span>
                                {freqLabel(r.postingFrequency)}
                              </p>
                            </div>
                            <div className="space-y-2 text-sm">
                              <p className="flex items-start gap-2 text-mute">
                                <span className="w-24 shrink-0 text-[11px] font-bold text-dim">
                                  {t("admin_detail_langs")}
                                </span>
                                <span>{parseLangs(r.languages).map(langLabel).join(", ")}</span>
                              </p>
                              <p className="flex items-center gap-2 text-mute">
                                <span className="w-24 shrink-0 text-[11px] font-bold text-dim">
                                  {t("admin_th_prior")}
                                </span>
                                {r.hasPriorCollab ? (
                                  <span className="inline-flex items-center gap-1 text-ok">
                                    <IconCheck className="h-3.5 w-3.5" />
                                    {r.priorAgents ?? t("yes")}
                                  </span>
                                ) : (
                                  t("no")
                                )}
                              </p>
                              {r.hasPriorCollab && (
                                <p className="flex items-center gap-2 text-mute">
                                  <span className="w-24 shrink-0 text-[11px] font-bold text-dim">
                                    {t("admin_th_stats")}
                                  </span>
                                  <span className="font-semibold text-bone">
                                    {r.invitedUsers ?? 0} / {r.activeUsers ?? 0}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="mb-1.5 text-[11px] font-bold text-dim">
                              {t("admin_detail_shot")}
                            </p>
                            {r.screenshot ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={r.screenshot}
                                alt="Litbuy dashboard screenshot"
                                className="max-h-72 rounded-lg border border-line object-contain"
                              />
                            ) : (
                              <p className="text-sm text-dim">{t("admin_no_shot")}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                            <span className="text-[11px] font-bold text-dim">
                              {t("admin_th_status")} :
                            </span>
                            {STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => void setStatus(r.id, s)}
                                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                                  status === s
                                    ? STATUS_CLS[s]
                                    : "border-line text-mute hover:border-line2 hover:text-bone"
                                }`}
                              >
                                {t(`admin_${s}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className="toast-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-char2 px-4 py-2 text-sm font-semibold text-bone shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
