import { useLiveQuery } from "dexie-react-hooks";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../db/db";
import { delta, formatEuro, formatPercent, isoDate } from "../lib/price";
import { useLang } from "../i18n/LangContext";

export default function PortfolioView() {
  const { t } = useLang();
  const owned = useLiveQuery(() => db.ownedCards.toArray(), []);
  const snapshots = useLiveQuery(
    () => db.valueSnapshots.orderBy("date").toArray(),
    []
  );

  if (!owned || !snapshots) return null;

  if (owned.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 p-10 text-center text-slate-400">
        <p className="text-lg">{t.emptyPortfolioTitle}</p>
        <p className="mt-1 text-sm">{t.emptyPortfolioHint}</p>
      </div>
    );
  }

  const current = owned.reduce((s, c) => s + c.lastPrice * c.qty, 0);
  const chartData = buildChartData(snapshots, current);

  const valueAt = (daysAgo: number) => {
    const target = isoDate(daysFromNow(-daysAgo));
    // letzten Snapshot an/ vor dem Zieldatum nehmen
    const past = [...snapshots]
      .filter((s) => s.date <= target)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return past?.total ?? snapshots[0]?.total ?? current;
  };

  const d1 = delta(current, valueAt(1));
  const d7 = delta(current, valueAt(7));
  const d30 = delta(current, valueAt(30));

  // beste / schlechteste Karte nach Gesamtwert
  const ranked = [...owned].sort(
    (a, b) => b.lastPrice * b.qty - a.lastPrice * a.qty
  );
  const best = ranked[0];

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-6">
        <p className="text-sm text-slate-400">{t.portfolioTotal}</p>
        <p className="text-4xl font-bold text-emerald-400">
          {formatEuro(current)}
        </p>

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <DeltaPill label={t.today} d={d1} />
          <DeltaPill label={t.days7} d={d7} />
          <DeltaPill label={t.days30} d={d30} />
        </div>

        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                width={56}
                tickFormatter={(v: number) => `${Math.round(v)}€`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#141a2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#e6e9f0",
                }}
                formatter={(v: number) => [formatEuro(v), t.colValue]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#g)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {snapshots.length <= 4 && (
          <p className="mt-2 text-xs text-slate-500">{t.seedHint}</p>
        )}
      </div>

      {best && (
        <div className="mt-5 rounded-xl bg-white/5 p-4">
          <p className="text-xs text-slate-400">{t.topPosition}</p>
          <div className="mt-2 flex items-center gap-3">
            <img src={best.image} alt="" className="h-14 rounded" />
            <div>
              <p className="font-medium">{best.name}</p>
              <p className="text-sm text-slate-400">
                {best.qty}× · {formatEuro(best.lastPrice * best.qty)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaPill({
  label,
  d,
}: {
  label: string;
  d: { abs: number; pct: number };
}) {
  const up = d.abs >= 0;
  return (
    <div
      className={`rounded-lg px-3 py-1.5 ${
        up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
      }`}
    >
      <span className="text-slate-400">{label}: </span>
      {up ? "▲" : "▼"} {formatEuro(Math.abs(d.abs))} ({formatPercent(d.pct)})
    </div>
  );
}

function buildChartData(
  snapshots: { date: string; total: number }[],
  current: number
) {
  const today = isoDate();
  const data = snapshots.map((s) => ({ date: s.date, total: s.total }));
  const last = data[data.length - 1];
  if (!last || last.date !== today) {
    data.push({ date: today, total: current });
  } else {
    last.total = current; // heutigen Punkt live aktualisieren
  }
  return data;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
