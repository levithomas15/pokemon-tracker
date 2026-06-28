import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCardsBySet,
  getChaseCard,
  searchCards,
} from "../api/pokemontcg";
import { getTcgdexCardNames } from "../api/tcgdex";
import { getMergedSets } from "../data/sets";
import type { MergedSet } from "../db/db";
import type { PokemonCard } from "../api/types";
import { cardPrice, formatEuro, priceInfo } from "../lib/price";
import { useLang } from "../i18n/LangContext";
import CardTile from "../components/CardTile";
import CardModal from "../components/CardModal";

export default function BrowseView() {
  const { t, lang } = useLang();
  const [selectedSet, setSelectedSet] = useState<MergedSet | null>(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [modalCard, setModalCard] = useState<{
    card: PokemonCard;
    name?: string;
    setName?: string;
  } | null>(null);

  const setsQuery = useQuery({
    queryKey: ["mergedSets"],
    queryFn: getMergedSets,
    staleTime: 1000 * 60 * 60 * 24,
  });

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(search.trim());
    setSelectedSet(null);
  }

  const modal = modalCard ? (
    <CardModal
      card={modalCard.card}
      displayName={modalCard.name}
      displaySetName={modalCard.setName}
      onClose={() => setModalCard(null)}
    />
  ) : null;

  // --- Suche ---
  if (activeSearch) {
    return (
      <div>
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={runSearch}
          onClear={() => {
            setSearch("");
            setActiveSearch("");
          }}
        />
        <p className="mb-3 text-sm text-slate-400">
          {t.searchResultsFor(activeSearch)}
        </p>
        <SearchResults
          query={activeSearch}
          onPick={(card) => setModalCard({ card })}
        />
        {modal}
      </div>
    );
  }

  // --- Karten eines Sets ---
  if (selectedSet) {
    return (
      <SetCardsView
        set={selectedSet}
        onBack={() => setSelectedSet(null)}
        onPick={(card, name) =>
          setModalCard({
            card,
            name,
            setName: lang === "de" ? selectedSet.nameDe : selectedSet.nameEn,
          })
        }
      />
    );
  }

  // --- Set-Übersicht mit Chase-Kacheln ---
  return (
    <div>
      <SearchBar
        value={search}
        onChange={setSearch}
        onSubmit={runSearch}
        onClear={() => setSearch("")}
      />
      {setsQuery.isLoading && (
        <p className="animate-pulse text-slate-400">{t.preparingDb}</p>
      )}
      {setsQuery.isError && <ErrorBox />}
      {setsQuery.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {setsQuery.data.map((set) => (
            <SetTile
              key={set.pk}
              set={set}
              onClick={() => setSelectedSet(set)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Set-Kachel mit Logo, Name und (lazy geladener) teuerster Karte (Chase). */
function SetTile({ set, onClick }: { set: MergedSet; onClick: () => void }) {
  const { t, lang } = useLang();
  const name = (lang === "de" ? set.nameDe : set.nameEn) ?? set.nameEn;

  const chaseQuery = useQuery({
    queryKey: ["chase", set.pk],
    queryFn: () => getChaseCard(set.pk),
    staleTime: 1000 * 60 * 60 * 24,
  });
  const chase = chaseQuery.data;
  const chasePrice = chase ? cardPrice(chase) : 0;

  return (
    <button
      onClick={onClick}
      className="group flex gap-4 rounded-2xl bg-white/5 p-4 text-left transition hover:bg-white/10"
    >
      <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg bg-black/20">
        {chasePrice > 0 && chase ? (
          <img
            src={chase.images.small}
            alt={t.chase}
            loading="lazy"
            className="h-32 rounded-lg object-contain"
          />
        ) : (
          <span className="px-2 text-center text-[11px] text-slate-500">
            {t.noPriceTile}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <img
          src={set.logo}
          alt=""
          loading="lazy"
          className="h-9 self-start object-contain"
        />
        <p className="mt-1 truncate font-semibold" title={name}>
          {name}
        </p>
        <p className="text-xs text-slate-500">
          {set.releaseDate?.slice(0, 4)} · {set.total} {t.cards}
        </p>
        {chasePrice > 0 && chase ? (
          <div className="mt-auto">
            <p className="text-[11px] text-slate-400">★ {t.chase}</p>
            <p className="truncate text-sm text-slate-200" title={chase.name}>
              {chase.name}
            </p>
            <p className="font-bold text-emerald-400">
              {formatEuro(chasePrice)}
            </p>
          </div>
        ) : null}
      </div>
    </button>
  );
}

/** Kartenliste eines Sets: nach Preis sortiert, Chase im Header, deutsche Namen. */
function SetCardsView({
  set,
  onBack,
  onPick,
}: {
  set: MergedSet;
  onBack: () => void;
  onPick: (card: PokemonCard, displayName?: string) => void;
}) {
  const { t, lang } = useLang();
  const setName = (lang === "de" ? set.nameDe : set.nameEn) ?? set.nameEn;

  const cardsQuery = useQuery({
    queryKey: ["cards", set.pk],
    queryFn: () => getCardsBySet(set.pk),
  });

  // Deutsche Kartennamen nur bei DE und vorhandenem TCGdex-Mapping.
  const namesQuery = useQuery({
    queryKey: ["deNames", set.tcgdexId, lang],
    queryFn: () => getTcgdexCardNames("de", set.tcgdexId!),
    enabled: lang === "de" && !!set.tcgdexId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const nameFor = (card: PokemonCard): string | undefined => {
    if (lang !== "de" || !namesQuery.data) return undefined;
    return namesQuery.data.get(parseInt(card.number, 10));
  };

  // Nach Wert absteigend sortieren (teuerste oben), inkl. TCGplayer-Fallback.
  const sorted = useMemo(() => {
    const list = cardsQuery.data ? [...cardsQuery.data] : [];
    return list.sort((a, b) => priceInfo(b).value - priceInfo(a).value);
  }, [cardsQuery.data]);

  const chase = sorted[0] && priceInfo(sorted[0]).value > 0 ? sorted[0] : null;
  const rest = chase ? sorted.slice(1) : sorted;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-sm text-emerald-400 hover:underline"
      >
        ← {t.allSets}
      </button>
      <div className="mb-5 flex items-center gap-3">
        <img src={set.logo} alt="" className="h-10" />
        <div>
          <h2 className="text-xl font-bold">{setName}</h2>
          <p className="text-xs text-slate-400">
            {set.releaseDate} · {set.total} {t.cards}
          </p>
        </div>
      </div>

      {cardsQuery.isLoading && (
        <p className="animate-pulse text-slate-400">{t.loading}</p>
      )}
      {cardsQuery.isError && <ErrorBox />}

      {chase && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-transparent p-4">
          <img
            src={chase.images.small}
            alt=""
            className="h-36 rounded-lg"
            loading="lazy"
          />
          <div>
            <p className="text-xs font-semibold text-amber-300">★ {t.chase}</p>
            <p className="text-lg font-bold">{nameFor(chase) ?? chase.name}</p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatEuro(priceInfo(chase).value)}
            </p>
            <button
              onClick={() => onPick(chase, nameFor(chase))}
              className="mt-2 rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
            >
              Details
            </button>
          </div>
        </div>
      )}

      {cardsQuery.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rest.map((c) => (
            <CardTile
              key={c.id}
              card={c}
              displayName={nameFor(c)}
              onClick={() => onPick(c, nameFor(c))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResults({
  query,
  onPick,
}: {
  query: string;
  onPick: (c: PokemonCard) => void;
}) {
  const { t } = useLang();
  const q = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchCards(query),
  });
  if (q.isLoading)
    return <p className="animate-pulse text-slate-400">{t.loading}</p>;
  if (q.isError) return <ErrorBox />;
  if (!q.data || q.data.length === 0)
    return <p className="text-slate-400">{t.noCards}</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {q.data.map((c) => (
        <CardTile key={c.id} card={c} onClick={() => onPick(c)} />
      ))}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
}) {
  const { t } = useLang();
  return (
    <form onSubmit={onSubmit} className="mb-5 flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.searchPlaceholder}
        className="flex-1 rounded-lg bg-white/10 px-4 py-2 outline-none placeholder:text-slate-500 focus:bg-white/15"
      />
      <button
        type="submit"
        className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black hover:bg-emerald-400"
      >
        {t.search}
      </button>
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg bg-white/10 px-3 py-2 text-slate-300 hover:bg-white/15"
        >
          ✕
        </button>
      )}
    </form>
  );
}

function ErrorBox() {
  const { t } = useLang();
  return (
    <p className="rounded-lg bg-rose-500/10 p-3 text-rose-300">{t.loadError}</p>
  );
}
