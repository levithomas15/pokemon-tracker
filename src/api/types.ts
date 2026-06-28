// Typen für die pokemontcg.io v2 API (nur die Felder, die wir nutzen)

export interface CardmarketPrices {
  averageSellPrice?: number;
  lowPrice?: number;
  trendPrice?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  [key: string]: number | undefined;
}

export interface Cardmarket {
  url?: string;
  updatedAt?: string;
  prices?: CardmarketPrices;
}

// TCGplayer (USD) – Fallback, wenn Cardmarket für ein Set noch keine Preise hat.
export interface TcgplayerPriceTier {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

export interface Tcgplayer {
  url?: string;
  updatedAt?: string;
  // Kategorien wie "normal", "holofoil", "reverseHolofoil", "1stEditionHolofoil", …
  prices?: Record<string, TcgplayerPriceTier>;
}

export interface CardSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string; // "YYYY/MM/DD"
  ptcgoCode?: string; // offizieller Set-Code, z. B. "MEW" – für Mapping zu TCGdex
  images: {
    symbol: string;
    logo: string;
  };
}

export interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  artist?: string;
  set: CardSet;
  images: {
    small: string;
    large: string;
  };
  cardmarket?: Cardmarket;
  tcgplayer?: Tcgplayer;
}

export interface ApiList<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}
