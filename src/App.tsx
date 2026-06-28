import { useEffect, useState } from "react";
import BrowseView from "./views/BrowseView";
import CollectionView from "./views/CollectionView";
import PortfolioView from "./views/PortfolioView";
import ScanView from "./views/ScanView";
import PacksView from "./views/PacksView";
import { ensureDailySnapshot } from "./db/snapshots";
import { useLang } from "./i18n/LangContext";
import type { Lang } from "./i18n/strings";

type Tab = "browse" | "collection" | "portfolio" | "scan" | "packs";

export default function App() {
  const { t, lang, setLang } = useLang();
  const [tab, setTab] = useState<Tab>("browse");

  const TABS: { id: Tab; label: string }[] = [
    { id: "browse", label: t.tabBrowse },
    { id: "collection", label: t.tabCollection },
    { id: "portfolio", label: t.tabPortfolio },
    { id: "scan", label: t.tabScan },
    { id: "packs", label: t.tabPacks },
  ];

  // Einmal pro Tag den Portfolio-Wert festhalten (baut die Aktienkurve auf).
  useEffect(() => {
    ensureDailySnapshot().catch((e) =>
      console.warn("Snapshot fehlgeschlagen", e)
    );
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-white/10 bg-[#0b1020]/90 px-4 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <img src="/poke.svg" alt="" className="h-6 w-6" />
            {t.appTitle}
          </h1>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1 rounded-xl bg-white/5 p-1">
              {TABS.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    tab === tb.id
                      ? "bg-emerald-500 text-black"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </nav>
            <LangSwitch lang={lang} setLang={setLang} />
          </div>
        </div>
      </header>

      <main>
        {tab === "browse" && <BrowseView />}
        {tab === "collection" && <CollectionView />}
        {tab === "portfolio" && <PortfolioView />}
        {tab === "scan" && <ScanView />}
        {tab === "packs" && <PacksView />}
      </main>
    </div>
  );
}

function LangSwitch({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-white/5 p-1 text-sm">
      {(["de", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-lg px-2.5 py-1.5 font-medium uppercase transition ${
            lang === l
              ? "bg-white/15 text-white"
              : "text-slate-400 hover:bg-white/10"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
