import type { ApiList, CardSet, PokemonCard } from "./types";

const BASE = "https://api.pokemontcg.io/v2";
const API_KEY = import.meta.env.VITE_POKETCG_API_KEY as string | undefined;

function headers(): HeadersInit {
  const h: Record<string, string> = {};
  if (API_KEY) h["X-Api-Key"] = API_KEY;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`API-Fehler ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// Nur Felder anfordern, die wir brauchen – spart Bandbreite.
const CARD_FIELDS =
  "id,name,number,rarity,artist,images,cardmarket,tcgplayer,set";

/** Alle Sets, neueste zuerst. */
export async function getSets(): Promise<CardSet[]> {
  const res = await get<ApiList<CardSet>>(
    "/sets?orderBy=-releaseDate&pageSize=250"
  );
  return res.data;
}

/** Teuerste Karte (Chase) eines Sets nach Cardmarket-Trendpreis. */
export async function getChaseCard(
  setId: string
): Promise<PokemonCard | null> {
  const res = await get<ApiList<PokemonCard>>(
    `/cards?q=set.id:${encodeURIComponent(
      setId
    )}&orderBy=-cardmarket.prices.trendPrice&pageSize=1&select=${CARD_FIELDS}`
  );
  return res.data[0] ?? null;
}

/** Alle Karten eines Sets (paginiert zusammengeführt). */
export async function getCardsBySet(setId: string): Promise<PokemonCard[]> {
  const pageSize = 250;
  let page = 1;
  const all: PokemonCard[] = [];
  // Sets haben i.d.R. < 250 Karten, aber wir paginieren sicherheitshalber.
  for (;;) {
    const res = await get<ApiList<PokemonCard>>(
      `/cards?q=set.id:${encodeURIComponent(
        setId
      )}&orderBy=number&pageSize=${pageSize}&page=${page}&select=${CARD_FIELDS}`
    );
    all.push(...res.data);
    if (res.data.length < pageSize) break;
    page += 1;
  }
  return all;
}

/**
 * Karten anhand der aufgedruckten Sammelnummer „number/printedTotal" finden
 * (für den Scanner). Sucht nach number und filtert nach printedTotal.
 */
export async function findCardsByNumber(
  number: string,
  printedTotal?: number
): Promise<PokemonCard[]> {
  const res = await get<ApiList<PokemonCard>>(
    `/cards?q=${encodeURIComponent(`number:${number}`)}&pageSize=60&select=${CARD_FIELDS}`
  );
  let data = res.data;
  if (printedTotal) {
    const exact = data.filter((c) => c.set.printedTotal === printedTotal);
    if (exact.length > 0) data = exact;
  }
  // Neueste zuerst (wahrscheinlichster Treffer bei Mehrdeutigkeit).
  return data.sort((a, b) =>
    a.set.releaseDate < b.set.releaseDate ? 1 : -1
  );
}

/** Kartenübergreifende Namenssuche (erste 60 Treffer). */
export async function searchCards(query: string): Promise<PokemonCard[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await get<ApiList<PokemonCard>>(
    `/cards?q=${encodeURIComponent(
      `name:"*${q}*"`
    )}&orderBy=-set.releaseDate&pageSize=60&select=${CARD_FIELDS}`
  );
  return res.data;
}

/** Frische Daten zu konkreten Karten-IDs (für Snapshot-Wertberechnung). */
export async function getCardsByIds(ids: string[]): Promise<PokemonCard[]> {
  if (ids.length === 0) return [];
  const out: PokemonCard[] = [];
  // In Blöcken abfragen, damit die Query nicht zu lang wird.
  const chunkSize = 20;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const q = chunk.map((id) => `id:${id}`).join(" OR ");
    const res = await get<ApiList<PokemonCard>>(
      `/cards?q=${encodeURIComponent(q)}&pageSize=${chunkSize}&select=${CARD_FIELDS}`
    );
    out.push(...res.data);
  }
  return out;
}
