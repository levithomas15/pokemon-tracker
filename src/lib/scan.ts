export interface OcrResult {
  number?: string;
  printedTotal?: number;
  name?: string;
  rawText: string;
}

/**
 * Führt OCR auf einem Bild (dataURL oder Canvas) aus.
 * Tesseract wird dynamisch geladen, damit es den Initial-Bundle nicht aufbläht.
 */
export async function runOcr(
  image: string | HTMLCanvasElement
): Promise<OcrResult> {
  const { default: Tesseract } = await import("tesseract.js");
  const { data } = await Tesseract.recognize(image, "eng");
  return parseOcrText(data.text);
}

/** Extrahiert Sammelnummer „199/165" und einen Namenskandidaten aus OCR-Text. */
export function parseOcrText(text: string): OcrResult {
  const result: OcrResult = { rawText: text };

  // Sammelnummer: z. B. "199/165", "006 / 165", "TG01/TG30" (nur rein numerische nehmen)
  const numMatch = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (numMatch) {
    result.number = String(parseInt(numMatch[1], 10));
    result.printedTotal = parseInt(numMatch[2], 10);
  }

  // Namenskandidat: längste Zeile aus überwiegend Buchstaben (Kartenname steht groß oben).
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  let best = "";
  for (const line of lines) {
    const letters = line.replace(/[^A-Za-zÄÖÜäöüß]/g, "");
    // mind. 3 Buchstaben, überwiegend alphabetisch, nicht zu lang
    if (
      letters.length >= 3 &&
      letters.length / line.length > 0.6 &&
      line.length <= 24 &&
      letters.length > best.replace(/[^A-Za-zÄÖÜäöüß]/g, "").length
    ) {
      best = line;
    }
  }
  if (best) result.name = best.replace(/[^A-Za-zÄÖÜäöüß'.\- ]/g, "").trim();

  return result;
}
