import { getCardsByIds } from "../api/pokemontcg";
import { cardPrice, isoDate, seedHistoryFromAverages } from "../lib/price";
import { db, type OwnedCard } from "./db";

/**
 * Stellt sicher, dass für heute ein Wert-Snapshot existiert.
 * - Holt frische Preise für alle besessenen Karten,
 * - aktualisiert lastPrice,
 * - schreibt einen Tages-Snapshot (heute),
 * - seedet einmalig eine Pseudo-Historie, falls noch keine existiert.
 *
 * Läuft idempotent: existiert heute schon ein Snapshot, passiert nichts.
 */
export async function ensureDailySnapshot(): Promise<void> {
  const today = isoDate();
  const owned = await db.ownedCards.toArray();

  if (owned.length === 0) return;

  const existingToday = await db.valueSnapshots.get(today);
  const snapCount = await db.valueSnapshots.count();
  if (existingToday && snapCount > 1) return; // heute schon erledigt

  let cards: import("../api/types").PokemonCard[];
  try {
    cards = await getCardsByIds(owned.map((c) => c.id));
  } catch {
    // Offline o.ä. – mit lastPrice weiterrechnen.
    cards = [];
  }

  const freshPrice = new Map(cards.map((c) => [c.id, cardPrice(c)]));
  const freshPricesObj = new Map(
    cards.map((c) => [c.id, c.cardmarket?.prices])
  );

  // lastPrice aktualisieren
  await db.transaction("rw", db.ownedCards, async () => {
    for (const c of owned) {
      const p = freshPrice.get(c.id);
      if (p != null && p > 0) {
        c.lastPrice = p;
        await db.ownedCards.put(c);
      }
    }
  });

  const updated = await db.ownedCards.toArray();
  const total = portfolioTotal(updated);

  // Seed-Historie (nur einmal, wenn noch keine Vergangenheit da ist)
  if (snapCount === 0) {
    await seedFromOwned(updated, freshPricesObj);
  }

  await db.valueSnapshots.put({ date: today, total });
}

function portfolioTotal(cards: OwnedCard[]): number {
  return cards.reduce((sum, c) => sum + c.lastPrice * c.qty, 0);
}

/**
 * Baut aus den avg-Feldern aller Karten aggregierte Tages-Snapshots
 * (~30/7/1 Tage zurück), gewichtet mit der jeweiligen Menge.
 */
async function seedFromOwned(
  owned: OwnedCard[],
  pricesById: Map<string, import("../api/types").CardmarketPrices | undefined>
) {
  const totalsByDate = new Map<string, number>();
  for (const c of owned) {
    const hist = seedHistoryFromAverages(pricesById.get(c.id));
    for (const point of hist) {
      totalsByDate.set(
        point.date,
        (totalsByDate.get(point.date) ?? 0) + point.value * c.qty
      );
    }
  }
  const entries = [...totalsByDate.entries()]
    .map(([date, total]) => ({ date, total }))
    .filter((e) => e.date !== isoDate()); // heute schreibt ensureDailySnapshot
  if (entries.length > 0) {
    await db.valueSnapshots.bulkPut(entries);
  }
}
