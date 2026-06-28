import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCardsBySet } from "../api/pokemontcg";
import { getTcgdexCardNames } from "../api/tcgdex";
import { getMergedSets } from "../data/sets";
import type { MergedSet } from "../db/db";
import type { PokemonCard } from "../api/types";
import { formatEuro, priceInfo } from "../lib/price";
import { formatChance, groupByRarity } from "../lib/pullrates";
import { useLang } from "../i18n/LangContext";
import CardModal from "../components/CardModal";

export default function PacksView() {
  const { t, lang } = useLang();
  const [selected, setSelected] = useState<MergedSet | null>(null);

  const setsQuery = useQuery({
    queryKey: ["mergedSets"],
    queryFn: getMergedSets,
    staleTime: 1000 * 60 * 60 * 24,
  });

  if (selected) {
    return <PackDetail set={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <h2 className="text-xl font-bold">{t.packsTitle}</h2>
      <p className="mt-1 text-sm text-slate-400">{t.packsIntro}</p>
      <p className="my-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">
        {t.pullDisclaimer}
      </p>
      {setsQuery.isLoading && (
        <p className="animate-pulse text-slate-400">{t.loading}</p>
      )}
      {setsQuery.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {setsQuery.data.map((set) => (
            <button
              key={set.pk}
              onClick={() => setSelected(set)}
              className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-4 transition hover:bg-white/10"
            >
              <img
                src={set.logo}
                alt=""
                loading="lazy"
                className="h-12 object-contain"
              />
              <span className="text-center text-xs text-slate-300">
                {(lang === "de" ? set.nameDe : set.nameEn) ?? set.nameEn}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PackDetail({ set, onBack }: { set: MergedSet; onBack: () => void }) {
  const { t, lang } = useLang();
  const [modalCard, setModalCard] = useState<PokemonCard | null>(null);
  const setName = (lang === "de" ? set.nameDe : set.nameEn) ?? set.nameEn;

  const cardsQuery = useQuery({
    queryKey: ["cards", set.pk],
    queryFn: () => getCardsBySet(set.pk),
  });
  const namesQuery = useQuery({
    queryKey: ["deNames", set.tcgdexId, lang],
    queryFn: () => getTcgdexCardNames("de", set.tcgdexId!),
    enabled: lang === "de" && !!set.tcgdexId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const nameFor = (card: PokemonCard) =>
    (lang === "de" && namesQuery.data?.get(parseInt(card.number, 10))) ||
    card.name;

  const groups = useMemo(
    () => (cardsQuery.data ? groupByRarity(cardsQuery.data, t.unknownRarity) : []),
    [cardsQuery.data, t.unknownRarity]
  );

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-sm text-emerald-400 hover:underline"
      >
        ← {t.packsTitle}
      </button>
      <div className="mb-4 flex items-center gap-3">
        <img src={set.logo} alt="" className="h-10" />
        <h2 className="text-xl font-bold">{setName}</h2>
      </div>
      <p className="mb-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">
        {t.pullDisclaimer}
      </p>

      {cardsQuery.isLoading && (
        <p className="animate-pulse text-slate-400">{t.loading}</p>
      )}

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.rarity} className="rounded-xl bg-white/5 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{g.rarity}</h3>
              <div className="text-sm text-slate-300">
                <span className="text-slate-500">{g.cards.length} {t.cards}</span>
                {" · "}
                <span className="text-slate-500">{t.perPack}:</span>{" "}
                {formatChance(g.perPack)}
                {" · "}
                <span className="text-slate-500">{t.perCard}:</span>{" "}
                <span className="text-emerald-300">{formatChance(g.perCard)}</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {g.cards.map((c) => {
                const pi = priceInfo(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => setModalCard(c)}
                    className="w-24 shrink-0 text-left"
                    title={nameFor(c)}
                  >
                    <img
                      src={c.images.small}
                      alt={nameFor(c)}
                      loading="lazy"
                      className="aspect-[3/4] w-full rounded-lg object-cover"
                    />
                    <p className="mt-1 truncate text-xs">{nameFor(c)}</p>
                    <p className="text-xs font-semibold text-emerald-400">
                      {pi.value > 0 ? formatEuro(pi.value) : "–"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modalCard && (
        <CardModal
          card={modalCard}
          displayName={lang === "de" ? nameFor(modalCard) : undefined}
          displaySetName={setName}
          onClose={() => setModalCard(null)}
        />
      )}
    </div>
  );
}
