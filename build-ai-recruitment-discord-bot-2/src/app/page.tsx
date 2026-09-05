"use client";

import ApplyWizard from "@/components/ApplyWizard";
import Estimator from "@/components/Estimator";
import { Footer, Header, Hero, HowItWorks } from "@/components/Landing";
import { LangProvider, useLang } from "@/lib/lang";

function ApplySection() {
  const { t } = useLang();
  return (
    <section id="apply" className="scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center font-display text-3xl font-bold text-bone">
          {t("form_title")}
        </h2>
        <p className="mt-1.5 text-center text-sm text-mute">{t("form_sub")}</p>
        <div className="mt-8">
          <ApplyWizard />
        </div>
      </div>
    </section>
  );
}

function EstimateSection() {
  const { t } = useLang();
  return (
    <section id="estimate" className="scroll-mt-20 border-t border-line bg-char/40">
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="font-display text-3xl font-bold text-bone">{t("est_title")}</h2>
        <p className="mt-1.5 text-sm text-mute">{t("est_sub")}</p>
        <div className="mt-8">
          <Estimator />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <LangProvider>
      <div id="top" className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Hero />
          <HowItWorks />
          <ApplySection />
          <EstimateSection />
        </main>
        <Footer />
      </div>
    </LangProvider>
  );
}
