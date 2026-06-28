import { getSets } from "../api/pokemontcg";
import { getAllTcgdexSetDetails, type TcgdexSetDetail } from "../api/tcgdex";
import { db, type MergedSet } from "../db/db";

const CACHE_KEY = "setsBuiltAt";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 Woche

function normDate(d?: string): string {
  return (d ?? "").replace(/\//g, "-");
}

/**
 * Matcht pokemontcg-Sets gegen TCGdex-Sets (für deutsche Namen).
 * Strategie in Reihenfolge: Abkürzung == ptcgoCode → (Datum+Total) → Datum.
 */
function buildMatcher(tcgdex: TcgdexSetDetail[]) {
  const byAbbr = new Map<string, TcgdexSetDetail>();
  const byDateTotal = new Map<string, TcgdexSetDetail>();
  const byDate = new Map<string, TcgdexSetDetail>();
  for (const s of tcgdex) {
    const abbr = s.abbreviation?.official?.toUpperCase();
    if (abbr) byAbbr.set(abbr, s);
    const date = normDate(s.releaseDate);
    if (date) {
      byDateTotal.set(`${date}|${s.cardCount?.total}`, s);
      if (!byDate.has(date)) byDate.set(date, s);
    }
  }
  return (pkCode: string | undefined, pkDate: string, pkTotal: number) => {
    if (pkCode) {
      const m = byAbbr.get(pkCode.toUpperCase());
      if (m) return m;
    }
    return (
      byDateTotal.get(`${pkDate}|${pkTotal}`) ?? byDate.get(pkDate) ?? null
    );
  };
}

/** Baut das gemergte Set-Verzeichnis (einmaliger ~1s-Sync) und cached es in Dexie. */
export async function buildMergedSets(): Promise<MergedSet[]> {
  const [pk, tcgdex] = await Promise.all([
    getSets(),
    getAllTcgdexSetDetails("de").catch(() => [] as TcgdexSetDetail[]),
  ]);
  const match = buildMatcher(tcgdex);

  const merged: MergedSet[] = pk.map((s) => {
    const m = match(s.ptcgoCode, normDate(s.releaseDate), s.total);
    return {
      pk: s.id,
      tcgdexId: m?.id,
      nameEn: s.name,
      nameDe: m?.name,
      logo: s.images.logo,
      releaseDate: s.releaseDate,
      total: s.total,
    };
  });

  await db.transaction("rw", db.sets, db.meta, async () => {
    await db.sets.clear();
    await db.sets.bulkPut(merged);
    await db.meta.put({ key: CACHE_KEY, value: Date.now() });
  });
  return merged;
}

/** Liefert das Set-Verzeichnis – aus dem Cache, sonst frisch gebaut. */
export async function getMergedSets(): Promise<MergedSet[]> {
  const builtAt = await db.meta.get(CACHE_KEY);
  const cached = await db.sets.toArray();
  const fresh =
    builtAt &&
    typeof builtAt.value === "number" &&
    Date.now() - builtAt.value < MAX_AGE_MS;
  if (cached.length > 0 && fresh) {
    return cached.sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1));
  }
  const built = await buildMergedSets();
  return built.sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1));
}
