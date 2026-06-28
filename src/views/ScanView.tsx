import { useEffect, useRef, useState } from "react";
import { findCardsByNumber, searchCards } from "../api/pokemontcg";
import type { PokemonCard } from "../api/types";
import { runOcr, type OcrResult } from "../lib/scan";
import { useLang } from "../i18n/LangContext";
import CardTile from "../components/CardTile";
import CardModal from "../components/CardModal";

type Phase = "idle" | "camera" | "reading" | "results";

export default function ScanView() {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [candidates, setCandidates] = useState<PokemonCard[]>([]);
  const [manual, setManual] = useState("");
  const [modalCard, setModalCard] = useState<PokemonCard | null>(null);

  // Kamera bei Verlassen sauber stoppen.
  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setPhase("camera");
      // Video-Element ist nach State-Update gemountet:
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError(t.scanNoCamera);
      setPhase("idle");
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1000;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    setPhase("reading");
    try {
      const res = await runOcr(canvas);
      setOcr(res);
      await searchFromOcr(res);
    } catch {
      setError(t.scanNoMatch);
    }
    setPhase("results");
  }

  async function searchFromOcr(res: OcrResult) {
    let found: PokemonCard[] = [];
    if (res.number) {
      found = await findCardsByNumber(res.number, res.printedTotal).catch(
        () => []
      );
    }
    if (found.length === 0 && res.name) {
      found = await searchCards(res.name).catch(() => []);
    }
    setCandidates(found);
  }

  async function runManual(e: React.FormEvent) {
    e.preventDefault();
    const q = manual.trim();
    if (!q) return;
    setPhase("reading");
    let found: PokemonCard[] = [];
    const numMatch = q.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
    if (numMatch) {
      found = await findCardsByNumber(
        String(parseInt(numMatch[1], 10)),
        parseInt(numMatch[2], 10)
      ).catch(() => []);
    }
    if (found.length === 0) found = await searchCards(q).catch(() => []);
    setCandidates(found);
    setPhase("results");
  }

  return (
    <div>
      <h2 className="text-xl font-bold">{t.scanTitle}</h2>
      <p className="mt-1 text-sm text-slate-400">{t.scanIntro}</p>
      <p className="mt-2 text-xs text-amber-300">{t.scanBeta}</p>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-1/2">
          {phase === "camera" ? (
            <div>
              <video
                ref={videoRef}
                className="w-full rounded-xl bg-black"
                playsInline
                muted
              />
              <button
                onClick={capture}
                className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black hover:bg-emerald-400"
              >
                {t.scanCapture}
              </button>
            </div>
          ) : phase === "reading" ? (
            <div className="flex h-64 items-center justify-center rounded-xl bg-white/5">
              <p className="animate-pulse text-slate-300">{t.scanReading}</p>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
            >
              <span className="text-4xl">📷</span>
              <span className="font-semibold">{t.scanStart}</span>
            </button>
          )}

          {/* Manuelle Suche immer verfügbar */}
          <form onSubmit={runManual} className="mt-4 flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={t.scanManual}
              className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:bg-white/15"
            />
            <button
              type="submit"
              className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              {t.search}
            </button>
          </form>
        </div>

        <div className="sm:w-1/2">
          {ocr && (
            <div className="mb-3 rounded-lg bg-white/5 p-3 text-sm">
              <span className="text-slate-400">{t.scanDetected}: </span>
              {ocr.number ? (
                <span className="font-mono">
                  #{ocr.number}
                  {ocr.printedTotal ? `/${ocr.printedTotal}` : ""}
                </span>
              ) : null}
              {ocr.name ? <span className="ml-2">„{ocr.name}"</span> : null}
            </div>
          )}

          {phase === "results" && candidates.length === 0 && (
            <p className="text-slate-400">{t.scanNoMatch}</p>
          )}

          {candidates.length > 0 && (
            <>
              <p className="mb-2 text-sm text-slate-400">{t.scanCandidates}</p>
              <div className="grid grid-cols-3 gap-3">
                {candidates.map((c) => (
                  <CardTile
                    key={c.id}
                    card={c}
                    onClick={() => setModalCard(c)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {modalCard && (
        <CardModal card={modalCard} onClose={() => setModalCard(null)} />
      )}
    </div>
  );
}
