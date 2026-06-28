import Dexie, { type Table } from "dexie";

export interface OwnedCard {
  id: string; // pokemontcg Karten-ID
  name: string;
  setId: string;
  setName: string;
  number: string;
  image: string; // small image url
  rarity?: string;
  qty: number;
  /** zuletzt bekannter Cardmarket-Preis pro Stück (€) */
  lastPrice: number;
  /** optionaler Kaufpreis pro Stück (€) */
  buyPrice?: number;
  addedAt: number; // epoch ms
}

export interface ValueSnapshot {
  date: string; // YYYY-MM-DD
  total: number; // Portfolio-Gesamtwert (€)
}

/** Zusammengeführtes Set (pokemontcg-Struktur + deutsche TCGdex-Namen). */
export interface MergedSet {
  pk: string; // pokemontcg Set-ID (Primärschlüssel)
  tcgdexId?: string; // gematchte TCGdex-ID (falls vorhanden)
  nameEn: string;
  nameDe?: string;
  logo: string;
  releaseDate: string; // "YYYY/MM/DD"
  total: number;
}

/** Schlüssel-Wert-Tabelle für Metadaten (z. B. Cache-Zeitstempel). */
export interface MetaEntry {
  key: string;
  value: number | string;
}

class PokeDB extends Dexie {
  ownedCards!: Table<OwnedCard, string>;
  valueSnapshots!: Table<ValueSnapshot, string>;
  sets!: Table<MergedSet, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("pokemon-uebersicht");
    this.version(1).stores({
      ownedCards: "id, name, setId",
      valueSnapshots: "date",
    });
    this.version(2).stores({
      ownedCards: "id, name, setId",
      valueSnapshots: "date",
      sets: "pk, releaseDate",
      meta: "key",
    });
  }
}

export const db = new PokeDB();

// ---- CRUD-Helfer ---------------------------------------------------------

export async function addOrIncrement(card: Omit<OwnedCard, "qty" | "addedAt">) {
  await db.transaction("rw", db.ownedCards, async () => {
    const existing = await db.ownedCards.get(card.id);
    if (existing) {
      existing.qty += 1;
      existing.lastPrice = card.lastPrice;
      await db.ownedCards.put(existing);
    } else {
      await db.ownedCards.put({ ...card, qty: 1, addedAt: Date.now() });
    }
  });
}

export async function setQty(id: string, qty: number) {
  if (qty <= 0) {
    await db.ownedCards.delete(id);
  } else {
    await db.ownedCards.update(id, { qty });
  }
}

export async function setBuyPrice(id: string, buyPrice: number | undefined) {
  await db.ownedCards.update(id, { buyPrice });
}

export async function removeCard(id: string) {
  await db.ownedCards.delete(id);
}
