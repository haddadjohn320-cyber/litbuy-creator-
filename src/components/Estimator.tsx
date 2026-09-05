"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/lang";

export default function Estimator() {
  const { t, lang } = useLang();
  const [followers, setFollowers] = useState(50_000);
  const [posts, setPosts] = useState(4);

  const fmt = useMemo(
    () => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US"),
    [lang],
  );

  const invited = Math.round(followers * (0.004 + posts * 0.0008));
  const active = Math.round(invited * 0.25);
  const low = active * 20;
  const high = active * 40;

  return (
    <div className="rounded-xl border border-line bg-char p-5 sm:p-7">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="est-followers" className="text-sm font-semibold">
                {t("est_followers")}
              </label>
              <span className="font-display text-sm font-bold text-ember">
                {fmt.format(followers)}
              </span>
            </div>
            <input
              id="est-followers"
              type="range"
              min={1000}
              max={2_000_000}
              step={5000}
              value={followers}
              onChange={(e) => setFollowers(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="est-posts" className="text-sm font-semibold">
                {t("est_posts")}
              </label>
              <span className="font-display text-sm font-bold text-ember">{posts}</span>
            </div>
            <input
              id="est-posts"
              type="range"
              min={0}
              max={14}
              step={1}
              value={posts}
              onChange={(e) => setPosts(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <p className="text-xs text-dim">{t("est_note")}</p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-line rounded-lg border border-line bg-coal sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-[11px] font-bold text-dim">{t("est_invited")}</p>
            <p className="mt-1 font-display text-2xl font-bold text-bone">
              {fmt.format(invited)}
            </p>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-bold text-dim">{t("est_active")}</p>
            <p className="mt-1 font-display text-2xl font-bold text-bone">{fmt.format(active)}</p>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-bold text-dim">{t("est_range")}</p>
            <p className="mt-1 font-display text-2xl font-bold text-sun">
              ${fmt.format(low)} – ${fmt.format(high)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
