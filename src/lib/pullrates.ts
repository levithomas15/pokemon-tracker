import type { PokemonCard } from "../api/types";

/**
 * GROBE Community-Schätzwerte für die Wahrscheinlichkeit, in EINEM Booster
 * mindestens eine Karte der jeweiligen Rarität zu ziehen (Scarlet-&-Violet-Ära).
 * NICHT offiziell – nur Orientierung. Variiert je nach Set/Region stark.
 */
const PER_PACK_ESTIMATE: Record<string, number> = {
  Common: 1,
  Uncommon: 1,
  Rare: 1,
  "Rare Holo": 0.33,
  "Double Rare": 0.33, // ex-Karten
  "ACE SPEC Rare": 0.1,
  "Ultra Rare": 0.08, // Full Art / Special
  "Illustration Rare": 0.2, // ~1 in 5
  "Special Illustration Rare": 0.04, // ~1 in 25
  "Hyper Rare": 0.02, // Gold, ~1 in 50
  "Shiny Rare": 0.1,
  "Shiny Ultra Rare": 0.04,
  "Rare Holo EX": 0.1,
  "Rare Holo GX": 0.1,
  "Rare Holo V": 0.2,
  "Rare Holo VMAX": 0.08,
  "Rare Secret": 0.02,
  "Rare Rainbow": 0.02,
};

export interface RarityGroup {
  rarity: string;
  cards: PokemonCard[];
  /** geschätzte Chance je Pack (0..1), oder null wenn unbekannt */
  perPack: number | null;
  /** geschätzte Chance je konkrete Karte dieser Rarität (0..1) */
  perCard: number | null;
}

const RARITY_ORDER = [
  "Special Illustration Rare",
  "Hyper Rare",
  "Rare Secret",
  "Rare Rainbow",
  "Illustration Rare",
  "Ultra Rare",
  "Shiny Ultra Rare",
  "Rare Holo VMAX",
  "Rare Holo V",
  "ACE SPEC Rare",
  "Double Rare",
  "Shiny Rare",
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare",
  "Uncommon",
  "Common",
];

function rank(rarity: string): number {
  const i = RARITY_ORDER.indexOf(rarity);
  return i === -1 ? RARITY_ORDER.length + 1 : i;
}

/** Gruppiert die Karten eines Sets nach Rarität und schätzt Pull-Rates. */
export function groupByRarity(
  cards: PokemonCard[],
  unknownLabel: string
): RarityGroup[] {
  const buckets = new Map<string, PokemonCard[]>();
  for (const c of cards) {
    const r = c.rarity ?? unknownLabel;
    if (!buckets.has(r)) buckets.set(r, []);
    buckets.get(r)!.push(c);
  }

  const groups: RarityGroup[] = [...buckets.entries()].map(([rarity, list]) => {
    const perPack = PER_PACK_ESTIMATE[rarity] ?? null;
    const perCard =
      perPack != null && list.length > 0 ? perPack / list.length : null;
    return { rarity, cards: list, perPack, perCard };
  });

  return groups.sort((a, b) => rank(a.rarity) - rank(b.rarity));
}

/** Formatiert eine Wahrscheinlichkeit als „1 in N" bzw. Prozent. */
export function formatChance(p: number | null): string {
  if (p == null) return "–";
  if (p >= 0.999) return "≈ 100 %";
  if (p <= 0) return "–";
  const oneIn = Math.round(1 / p);
  const pct = p * 100;
  const pctStr = pct >= 1 ? `${pct.toFixed(0)} %` : `${pct.toFixed(2)} %`;
  return `1 : ${oneIn} (${pctStr})`;
}
