import { useLiveQuery } from "dexie-react-hooks";
import type { PokemonCard } from "../api/types";
import { formatEuro, priceInfo, seedHistoryFromAverages } from "../lib/price";
import { addOrIncrement, db, removeCard } from "../db/db";
import { useLang } from "../i18n/LangContext";
import Sparkline from "./Sparkline";

interface Props {
  card: PokemonCard;
  onClose: () => void;
  /** Lokalisierter Kartenname (z. B. deutsch). */
  displayName?: string;
  /** Lokalisierter Set-Name. */
  displaySetName?: string;
}

export default function CardModal({
  card,
  onClose,
  displayName,
  displaySetName,
}: Props) {
  const owned = useLiveQuery(() => db.ownedCards.get(card.id), [card.id]);
  const { t } = useLang();
  const { value: price, source } = priceInfo(card);
  const prices = card.cardmarket?.prices;
  const spark = seedHistoryFromAverages(prices).map((p) => p.value);
  const name = displayName ?? card.name;
  const setName = displaySetName ?? card.set.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-[#141a2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-6 sm:flex-row">
          <img
            src={card.images.large}
            alt={name}
            className="mx-auto w-64 rounded-xl"
            loading="lazy"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{name}</h2>
                <p className="text-sm text-slate-400">
                  {setName} · Nr. {card.number}/{card.set.printedTotal}
                  {card.rarity ? ` · ${card.rarity}` : ""}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1 text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-black/20 p-4">
              <div className="flex items-end justify-between">
                <span
                  className={`text-3xl font-bold ${
                    source === "tcgplayer"
                      ? "text-sky-400"
                      : source === "cardmarket"
                      ? "text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {price > 0
                    ? `${source === "tcgplayer" ? "≈ " : ""}${formatEuro(price)}`
                    : "—"}
                </span>
                <Sparkline data={spark} width={120} height={36} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {source === "cardmarket"
                  ? t.srcCardmarket
                  : source === "tcgplayer"
                  ? t.srcTcgplayer
                  : t.srcNone}
                {card.cardmarket?.updatedAt
                  ? ` · ${card.cardmarket.updatedAt}`
                  : ""}
              </p>
            </div>

            {source === "tcgplayer" && (
              <p className="mt-3 rounded-lg bg-sky-500/10 p-2 text-xs text-sky-200">
                {t.tcgEstimateNote}
              </p>
            )}
            {source === "none" && (
              <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
                {t.noneNote}
              </p>
            )}

            {prices && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <PriceRow label="Trend" value={prices.trendPrice} />
                <PriceRow label="Ø" value={prices.averageSellPrice} />
                <PriceRow label="Low" value={prices.lowPrice} />
                <PriceRow label="Ø 1d" value={prices.avg1} />
                <PriceRow label="Ø 7d" value={prices.avg7} />
                <PriceRow label="Ø 30d" value={prices.avg30} />
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() =>
                  addOrIncrement({
                    id: card.id,
                    name,
                    setId: card.set.id,
                    setName,
                    number: card.number,
                    image: card.images.small,
                    rarity: card.rarity,
                    lastPrice: price,
                  })
                }
                className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black hover:bg-emerald-400"
              >
                {t.addToCollection}
              </button>
              {owned ? (
                <>
                  <span className="text-sm text-slate-300">
                    {t.youOwn(owned.qty)}
                  </span>
                  <button
                    onClick={() => removeCard(card.id)}
                    className="text-sm text-slate-400 underline hover:text-rose-400"
                  >
                    {t.remove}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span>{value != null ? formatEuro(value) : "–"}</span>
    </div>
  );
}
