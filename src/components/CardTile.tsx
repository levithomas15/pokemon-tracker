import { useLiveQuery } from "dexie-react-hooks";
import type { PokemonCard } from "../api/types";
import { formatEuro, priceInfo } from "../lib/price";
import { db } from "../db/db";
import { useLang } from "../i18n/LangContext";

interface Props {
  card: PokemonCard;
  onClick: () => void;
  /** Lokalisierter (z. B. deutscher) Name, überschreibt den englischen. */
  displayName?: string;
}

export default function CardTile({ card, onClick, displayName }: Props) {
  const owned = useLiveQuery(() => db.ownedCards.get(card.id), [card.id]);
  const { value: price, source } = priceInfo(card);
  const { t } = useLang();
  const name = displayName ?? card.name;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl bg-white/5 p-2 text-left transition hover:bg-white/10"
    >
      {owned ? (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-black">
          {owned.qty}×
        </span>
      ) : null}
      <img
        src={card.images.small}
        alt={name}
        loading="lazy"
        className="aspect-[3/4] w-full rounded-lg object-cover"
      />
      <div className="mt-2 px-1">
        <p className="truncate text-sm font-medium" title={name}>
          {name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">#{card.number}</span>
          {price > 0 ? (
            <span
              className={`text-sm font-semibold ${
                source === "tcgplayer" ? "text-sky-400" : "text-emerald-400"
              }`}
              title={
                source === "tcgplayer" ? t.srcTcgplayer : t.srcCardmarket
              }
            >
              {source === "tcgplayer" ? "≈ " : ""}
              {formatEuro(price)}
            </span>
          ) : (
            <span className="text-xs text-slate-500" title={t.noPriceTile}>
              {t.noPriceShort}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
