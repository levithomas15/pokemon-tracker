# Pokémon-Übersicht

**🌐 Live:** https://levithomas15.github.io/pokemon-tracker/

Web-App (läuft im Browser auf dem Mac, kein Backend) für Pokémon-Sammelkarten:
Karten aus allen Sets durchsuchen, Cardmarket-Werte sehen, die eigene Sammlung
wie ein Aktien-Portfolio tracken, Karten per Kamera scannen und geschätzte
Pull-Rates pro Pack ansehen.

## Features
- **Durchsuchen** – alle Sets & Karten, Bilder, Cardmarket-Preise. Pro Set wird die
  teuerste Karte (Chase) hervorgehoben; die Kartenliste ist nach Wert sortiert.
- **Meine Sammlung** – Karten als „besitze ich" markieren, Menge, Gesamtwert.
- **Portfolio** – Wertverlauf des Bestands als Chart (wie ein Aktienkurs), mit
  Δ heute / 7 / 30 Tagen.
- **Scannen** – Karte vor die Kamera halten, Texterkennung (OCR) liest Nummer & Name
  und sucht passende Karten. Manuelle Suche als Fallback.
- **Packs & Pull-Rates** – Raritäts-Verteilung je Set mit geschätzten Zieh-Chancen
  (Community-Schätzung, nicht offiziell).
- **Sprache** – umschaltbar Deutsch / Englisch, inkl. deutscher Kartennamen.

## Datenquellen
- [pokemontcg.io](https://pokemontcg.io/) – Karten, Bilder, Cardmarket- & TCGplayer-Preise.
- [TCGdex](https://tcgdex.dev/) – deutsche Set- und Kartennamen.

Beides kostenlos. Optionaler API-Key für höheres Rate-Limit: `.env.example` nach
`.env` kopieren und `VITE_POKETCG_API_KEY` eintragen (ohne Key läuft die App auch).

## Lokal starten
```bash
npm install
npm run dev
```
Dann **http://localhost:5173** im Browser öffnen.
(Die Kamera-Funktion funktioniert nur über `localhost` oder HTTPS.)

## Stack
Vite · React · TypeScript · Tailwind CSS · Recharts · Dexie (IndexedDB) ·
TanStack Query · tesseract.js (OCR)

## Hinweise
- Pull-Rates sind **nicht offiziell** – es sind grobe Community-Schätzungen.
- Sehr neue Sets haben teils noch keine Marktpreise (Limit der Datenquelle).
- Alle Sammlungsdaten bleiben lokal im Browser (IndexedDB); es gibt kein Backend.
