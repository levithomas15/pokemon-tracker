import type { Lang } from "../i18n/strings";

// TCGdex liefert lokalisierte (u. a. deutsche) Karten- und Set-Namen.
const BASE = "https://api.tcgdex.net/v2";

async function j<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`TCGdex ${r.status}`);
  return (await r.json()) as T;
}

async function pool<I, O>(items: I[], n: number, fn: (i: I) => Promise<O>) {
  const out: O[] = new Array(items.length);
  let idx = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (idx < items.length) {
        const k = idx++;
        out[k] = await fn(items[k]);
      }
    })
  );
  return out;
}

export interface TcgdexSetBrief {
  id: string;
  name: string;
  cardCount: { total: number; official?: number };
}

export interface TcgdexSetDetail {
  id: string;
  name: string;
  releaseDate?: string; // "YYYY-MM-DD"
  cardCount: { total: number; official?: number };
  abbreviation?: { official?: string };
  cards: { id: string; localId: string; name: string; image?: string }[];
}

export function getTcgdexSetsBrief(lang: Lang) {
  return j<TcgdexSetBrief[]>(`${BASE}/${lang}/sets`);
}

export function getTcgdexSetDetail(lang: Lang, id: string) {
  return j<TcgdexSetDetail>(`${BASE}/${lang}/sets/${id}`);
}

/** Alle Set-Details parallel (für das einmalige Set-Mapping). ~1s bei 145 Sets. */
export async function getAllTcgdexSetDetails(
  lang: Lang
): Promise<TcgdexSetDetail[]> {
  const brief = await getTcgdexSetsBrief(lang);
  return pool(brief, 25, (s) =>
    getTcgdexSetDetail(lang, s.id).catch(
      () => ({ ...s, cards: [] } as TcgdexSetDetail)
    )
  );
}

/** Karten eines TCGdex-Sets als Map<Nummer, lokalisierter Name>. */
export async function getTcgdexCardNames(
  lang: Lang,
  tcgdexId: string
): Promise<Map<number, string>> {
  const detail = await getTcgdexSetDetail(lang, tcgdexId);
  const map = new Map<number, string>();
  for (const c of detail.cards) {
    const num = parseInt(c.localId, 10);
    if (!Number.isNaN(num)) map.set(num, c.name);
  }
  return map;
}
