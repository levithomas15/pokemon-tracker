import { useLiveQuery } from "dexie-react-hooks";
import { db, removeCard, setQty } from "../db/db";
import { formatEuro } from "../lib/price";
import { useLang } from "../i18n/LangContext";

export default function CollectionView() {
  const { t } = useLang();
  const cards = useLiveQuery(
    () => db.ownedCards.orderBy("name").toArray(),
    []
  );

  if (!cards) return null;

  if (cards.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 p-10 text-center text-slate-400">
        <p className="text-lg">{t.emptyCollectionTitle}</p>
        <p className="mt-1 text-sm">{t.emptyCollectionHint}</p>
      </div>
    );
  }

  const total = cards.reduce((s, c) => s + c.lastPrice * c.qty, 0);
  const count = cards.reduce((s, c) => s + c.qty, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-4">
        <Stat label={t.totalCards} value={String(count)} />
        <Stat label={t.distinct} value={String(cards.length)} />
        <Stat label={t.totalValue} value={formatEuro(total)} accent />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="p-3">{t.colCard}</th>
              <th className="p-3">{t.colSet}</th>
              <th className="p-3 text-right">{t.colUnit}</th>
              <th className="p-3 text-center">{t.colQty}</th>
              <th className="p-3 text-right">{t.colValue}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.image}
                      alt=""
                      className="h-12 rounded"
                      loading="lazy"
                    />
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        #{c.number}
                        {c.rarity ? ` · ${c.rarity}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-slate-400">{c.setName}</td>
                <td className="p-3 text-right">{formatEuro(c.lastPrice)}</td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setQty(c.id, c.qty - 1)}
                      className="h-6 w-6 rounded bg-white/10 hover:bg-white/20"
                    >
                      −
                    </button>
                    <span className="w-6 text-center">{c.qty}</span>
                    <button
                      onClick={() => setQty(c.id, c.qty + 1)}
                      className="h-6 w-6 rounded bg-white/10 hover:bg-white/20"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="p-3 text-right font-semibold text-emerald-400">
                  {formatEuro(c.lastPrice * c.qty)}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => removeCard(c.id)}
                    className="text-slate-500 hover:text-rose-400"
                    title="Entfernen"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/5 px-5 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`text-xl font-bold ${
          accent ? "text-emerald-400" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
