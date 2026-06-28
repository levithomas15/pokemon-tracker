import type {
  CardmarketPrices,
  PokemonCard,
  TcgplayerPriceTier,
} from "../api/types";

/**
 * Grober USD→EUR-Umrechnungskurs für TCGplayer-Fallbackpreise.
 * Bewusst eine Konstante (lokale App, kein Live-FX) – als Schätzwert gekennzeichnet.
 */
export const EUR_PER_USD = 0.92;

export type PriceSource = "cardmarket" | "tcgplayer" | "none";

export interface PriceInfo {
  /** Wert in EUR (bei TCGplayer umgerechnet). 0 = kein Preis verfügbar. */
  value: number;
  source: PriceSource;
}

/** Bester positiver Cardmarket-Preis (EUR). */
function bestCardmarket(p: CardmarketPrices | undefined): number {
  if (!p) return 0;
  // Bevorzugte Reihenfolge der „Normal"-Felder …
  const preferred = [
    p.trendPrice,
    p.averageSellPrice,
    p.avg30,
    p.avg7,
    p.avg1,
    p.lowPrice,
  ];
  for (const v of preferred) if (v && v > 0) return v;
  // … sonst irgendein positiver Wert (z. B. nur Reverse-Holo-Preise vorhanden).
  for (const v of Object.values(p)) if (typeof v === "number" && v > 0) return v;
  return 0;
}

/** Bester positiver TCGplayer-Preis (USD). */
function bestTcgplayerUsd(
  prices: Record<string, TcgplayerPriceTier> | undefined
): number {
  if (!prices) return 0;
  for (const tier of Object.values(prices)) {
    const v = tier.market ?? tier.mid ?? tier.low ?? tier.high;
    if (v && v > 0) return v;
  }
  return 0;
}

/**
 * Einheitlicher Bewertungspreis einer Karte in EUR.
 * Priorität: Cardmarket (EUR) → TCGplayer (USD→EUR) → 0.
 */
export function priceInfo(
  card: Pick<PokemonCard, "cardmarket" | "tcgplayer">
): PriceInfo {
  const cm = bestCardmarket(card.cardmarket?.prices);
  if (cm > 0) return { value: cm, source: "cardmarket" };

  const usd = bestTcgplayerUsd(card.tcgplayer?.prices);
  if (usd > 0)
    return { value: usd * EUR_PER_USD, source: "tcgplayer" };

  return { value: 0, source: "none" };
}

/** Kurzform: nur der EUR-Wert (für Summen/Portfolio). */
export function cardPrice(
  card: Pick<PokemonCard, "cardmarket" | "tcgplayer">
): number {
  return priceInfo(card).value;
}

export function sourceLabel(source: PriceSource): string {
  switch (source) {
    case "cardmarket":
      return "Cardmarket";
    case "tcgplayer":
      return "TCGplayer (Schätzung)";
    default:
      return "noch kein Marktpreis";
  }
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} %`;
}

/** Veränderung zwischen zwei Werten in € und %. */
export function delta(current: number, past: number) {
  const abs = current - past;
  const pct = past > 0 ? (abs / past) * 100 : 0;
  return { abs, pct };
}

/**
 * Erzeugt aus den Kurz-Mittelwerten (avg30/avg7/avg1/trend) eine
 * kleine Pseudo-Historie, damit Charts ab Tag 1 eine Kurve zeigen.
 * Nur für Cardmarket-Karten verfügbar; sonst leer.
 * Rückgabe: aufsteigend nach Datum.
 */
export function seedHistoryFromAverages(
  prices: CardmarketPrices | undefined,
  today = new Date()
): { date: string; value: number }[] {
  if (!prices) return [];
  const trend = prices.trendPrice ?? prices.averageSellPrice;
  const points: { daysAgo: number; value?: number }[] = [
    { daysAgo: 30, value: prices.avg30 },
    { daysAgo: 7, value: prices.avg7 },
    { daysAgo: 1, value: prices.avg1 },
    { daysAgo: 0, value: trend },
  ];
  return points
    .filter((p): p is { daysAgo: number; value: number } => p.value != null)
    .map((p) => {
      const d = new Date(today);
      d.setDate(d.getDate() - p.daysAgo);
      return { date: isoDate(d), value: p.value };
    });
}

export function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
