/**
 * Content Lab · Video → Carrusel
 * React App — estética editorial oscura / tipografía de impacto
 */

import { useState, useRef, useCallback } from "react";

// ── Paleta por tipo de slide ──────────────────────────────────────────────────
const PALETTE = {
  HOOK:          { accent: "#C9A84C", dim: "rgba(201,168,76,0.12)",  label: "ORO"    },
  PROBLEMA:      { accent: "#C4472A", dim: "rgba(196,71,42,0.12)",   label: "ROJO"   },
  PROMESA:       { accent: "#3D7A55", dim: "rgba(61,122,85,0.12)",   label: "VERDE"  },
  "REVELACIÓN 1":{ accent: "#7B9EC7", dim: "rgba(123,158,199,0.12)", label: "AZUL"   },
  "REVELACIÓN 2":{ accent: "#A07CC5", dim: "rgba(160,124,197,0.12)", label: "UVA"    },
  "REVELACIÓN 3":{ accent: "#C77CA0", dim: "rgba(199,124,160,0.12)", label: "ROSA"   },
  CTA:           { accent: "#E8875A", dim: "rgba(232,135,90,0.12)",  label: "FUEGO"  },
};
const DEFAULT_PAL = { accent: "#8a8278", dim: "rgba(138,130,120,0.12)", label: "—" };

function getPal(type = "") {
  const key = Object.keys(PALETTE).find(k => type.toUpperCase().includes(k));
  return key ? PALETTE[key] : DEFAULT_PAL;
}

function fmt(bytes) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

// ── Convertir File a base64 ───────────────────────────────────────────────────
function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Componente: Slide Instagram (1080×1350 → ratio 4:5) ──────────────────────
function SlideCard({ slide }) {
  const pal = getPal(slide.type);
  const lines = (slide.body || "")
    .split(/\n/)
    .map(l => l.replace(/^•\s*/, "").trim())
    .filter(Boolean);

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl select-none"
      style={{
        aspectRatio: "4/5",
        background: "#111",
        border: `1px solid ${pal.accent}28`,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      {/* Top accent stripe */}
      <div style={{ height: 3, background: pal.accent, flexShrink: 0 }} />

      {/* Slide number + type badge */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2" style={{ flexShrink: 0 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.3em", color: pal.accent, opacity: 0.7 }}>
          {String(slide.number).padStart(2, "0")} / 07
        </span>
        <span
          style={{
            fontSize: 8,
            letterSpacing: "0.25em",
            background: pal.dim,
            color: pal.accent,
            padding: "3px 8px",
            borderRadius: 4,
            border: `1px solid ${pal.accent}30`,
          }}
        >
          {slide.type}
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 px-5 pb-5 gap-3 justify-between">
        <div className="flex flex-col gap-3">
          {/* Emoji */}
          <span style={{ fontSize: "clamp(2rem, 6vw, 2.8rem)", lineHeight: 1 }}>{slide.emoji}</span>

          {/* Title */}
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(1.4rem, 4.5vw, 2.2rem)",
              lineHeight: 1.05,
              letterSpacing: "0.01em",
              color: "#f2ede6",
            }}
          >
            {slide.title}
          </h2>

          {/* Divider */}
          <div style={{ width: 32, height: 2, background: pal.accent, borderRadius: 1 }} />

          {/* Subtitle */}
          {slide.subtitle && (
            <p style={{ fontSize: "clamp(0.6rem, 1.8vw, 0.72rem)", letterSpacing: "0.18em", color: "#8a8278", textTransform: "uppercase" }}>
              {slide.subtitle}
            </p>
          )}

          {/* Body */}
          {lines.length > 0 && (
            <ul className="flex flex-col gap-1.5 mt-1">
              {lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: pal.accent, flexShrink: 0, marginTop: 1 }}>•</span>
                  <span style={{ fontSize: "clamp(0.65rem, 2vw, 0.78rem)", color: "#c8c0b4", lineHeight: 1.55, fontWeight: 300 }}>
                    {l}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
          <span style={{ fontSize: 8, letterSpacing: "0.2em", color: "#4a4540", textTransform: "uppercase" }}>
            Content Lab
          </span>
          <span style={{ fontSize: 8, letterSpacing: "0.2em", color: pal.accent, opacity: 0.5 }}>
            IG /{" "}4:5
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Miniatura en el panel izquierdo ───────────────────────────────
function SlideThumbnail({ slide, active, onClick }) {
  const pal = getPal(slide.type);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
      style={{
        background: active ? pal.dim : "transparent",
        border: `1px solid ${active ? pal.accent + "40" : "transparent"}`,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{slide.emoji}</span>
      <div className="min-w-0">
        <p style={{ fontSize: 10, letterSpacing: "0.15em", color: pal.accent, marginBottom: 2 }}>
          {slide.type}
        </p>
        <p style={{ fontSize: 11, color: "#c8c0b4", fontFamily: "'Instrument Serif', serif", lineHeight: 1.3 }}
          className="truncate">
          {slide.title}
        </p>
      </div>
    </button>
  );
}

// ── Componente: Barra de progreso ─────────────────────────────────────────────
function ProgressBar({ phase }) {
  const steps = [
    { key: "upload",     label: "Subiendo video" },
    { key: "transcribe", label: "Transcribiendo con Whisper" },
    { key: "generate",   label: "Generando con Claude" },
  ];
  const idx = steps.findIndex(s => s.key === phase);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Spinner */}
      <div className="flex justify-center">
        <div className="relative w-16 h-16">
          <svg className="spin-slow w-full h-full" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="2"/>
            <circle cx="32" cy="32" r="28" fill="none" stroke="#C9A84C" strokeWidth="2"
              strokeLinecap="round" strokeDasharray="44 132" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 22 }}>
            {phase === "upload" ? "📤" : phase === "transcribe" ? "🎙" : "✦"}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((s, i) => {
          const done    = i < idx;
          const current = i === idx;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs transition-all duration-500"
                style={{
                  background: done ? "#C9A84C" : current ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${done || current ? "#C9A84C40" : "rgba(255,255,255,0.06)"}`,
                  color: done ? "#0c0c0c" : current ? "#C9A84C" : "#4a4540",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 12,
                letterSpacing: "0.1em",
                color: done ? "#8a8278" : current ? "#f2ede6" : "#3a3530",
                transition: "color 0.3s",
              }}>
                {s.label}
              </span>
              {current && (
                <span style={{ fontSize: 10, color: "#C9A84C", letterSpacing: "0.1em" }}
                  className="shimmer px-2 py-0.5 rounded">
                  en progreso
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase]         = useState("idle");  // idle | uploading | transcribe | generate | done | error
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [carousel, setCarousel]   = useState(null);
  const [transcript, setTrans]    = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError]         = useState("");
  const inputRef = useRef(null);

  const pick = useCallback((f) => {
    if (!f) return;
    const ok = ["video/mp4", "video/quicktime"].includes(f.type) || /\.(mp4|mov)$/i.test(f.name);
    if (!ok) { setError("Solo se aceptan archivos MP4 o MOV."); return; }
    if (f.size > 200 * 1024 * 1024) { setError("El video es demasiado grande. Máximo 200MB."); return; }
    setFile(f);
    setError("");
    setPhase("ready");
    setCarousel(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  }, [pick]);

  const process = useCallback(async () => {
    if (!file) return;
    setError("");

    try {
      // Step 1: upload (convert to base64)
      setPhase("upload");
      const fileBase64 = await toBase64(file);

      // Step 2: transcribe
      setPhase("transcribe");

      // Step 3: generate (server does both in one call, we simulate steps client-side)
      // We call the API and then flip to generate while waiting
      const callPromise = fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileBase64,
        }),
      });

      // After a delay flip to "generate" phase (Whisper usually takes ~10-20s)
      setTimeout(() => setPhase("generate"), 8000);

      const res = await callPromise;
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error desconocido");
      }

      setCarousel(data.carousel);
      setTrans(data.transcript);
      setActiveIdx(0);
      setPhase("done");

    } catch (e) {
      setError(e.message || "Error al procesar el video.");
      setPhase("error");
    }
  }, [file]);

  const reset = useCallback(() => {
    setPhase("idle");
    setFile(null);
    setCarousel(null);
    setTrans("");
    setError("");
  }, []);

  const processing = ["upload", "transcribe", "generate"].includes(phase);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0c0c0c" }}>

      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 28, height: 28, background: "#C9A84C", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            ✦
          </div>
          <div>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.08em", color: "#f2ede6" }}>
              CONTENT LAB
            </span>
            <span style={{ fontSize: 9, letterSpacing: "0.25em", color: "#4a4540", marginLeft: 10, textTransform: "uppercase" }}>
              Video → Carrusel
            </span>
          </div>
        </div>

        {phase === "done" && (
          <button onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-150 hover:bg-white/5"
            style={{ fontSize: 11, letterSpacing: "0.15em", color: "#8a8278", border: "1px solid rgba(255,255,255,0.08)" }}>
            ← Nuevo video
          </button>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 py-12">

        {/* ── IDLE / READY ── */}
        {(phase === "idle" || phase === "ready" || phase === "error") && (
          <div className="w-full max-w-lg space-y-6 fade-up fade-up-1">

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem,8vw,4rem)",
                letterSpacing: "0.04em", lineHeight: 1, color: "#f2ede6" }}>
                De Video a<br />
                <span style={{ color: "#C9A84C" }}>Carrusel Viral</span>
              </h1>
              <p style={{ fontSize: 13, color: "#4a4540", letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace" }}>
                Subí tu video · Whisper lo transcribe · Claude lo convierte
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-5 py-16 px-8 text-center transition-all duration-200"
              style={{
                border: `2px dashed ${dragging ? "#C9A84C" : file ? "#3D7A55" : "rgba(255,255,255,0.08)"}`,
                background: dragging ? "rgba(201,168,76,0.04)" : file ? "rgba(61,122,85,0.04)" : "rgba(255,255,255,0.015)",
                transform: dragging ? "scale(1.01)" : "scale(1)",
              }}
            >
              <div style={{ fontSize: 48, lineHeight: 1 }}>{file ? "🎬" : "📁"}</div>

              {file ? (
                <div className="space-y-1">
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "#f2ede6", fontStyle: "italic" }}>
                    {file.name}
                  </p>
                  <p style={{ fontSize: 11, color: "#3D7A55", letterSpacing: "0.15em" }}>{fmt(file.size)}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "#f2ede6", fontStyle: "italic" }}>
                    {dragging ? "Soltá el video aquí" : "Arrastrá tu video aquí"}
                  </p>
                  <p style={{ fontSize: 11, color: "#4a4540", letterSpacing: "0.12em" }}>
                    MP4 · MOV · máx. 200MB
                  </p>
                </div>
              )}

              <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,.mp4,.mov"
                className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>

            {/* Error */}
            {error && (
              <p className="text-center" style={{ fontSize: 12, color: "#C4472A", letterSpacing: "0.1em" }}>
                ⚠ {error}
              </p>
            )}

            {/* CTA */}
            {file && (
              <button onClick={process}
                className="w-full py-4 rounded-xl font-bold tracking-widest uppercase transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 18,
                  letterSpacing: "0.15em",
                  background: "linear-gradient(135deg, #C9A84C, #E8C96A)",
                  color: "#0c0c0c",
                  boxShadow: "0 0 40px rgba(201,168,76,0.25)",
                }}
              >
                Generar Carrusel ✦
              </button>
            )}
          </div>
        )}

        {/* ── PROCESSING ── */}
        {processing && (
          <div className="fade-up fade-up-1">
            <ProgressBar phase={phase} />
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && carousel && (
          <div className="w-full max-w-5xl fade-up fade-up-1">

            {/* Topic */}
            <div className="text-center mb-8">
              <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#4a4540", textTransform: "uppercase", marginBottom: 6 }}>
                Carrusel generado sobre
              </p>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.8rem,5vw,3rem)",
                letterSpacing: "0.04em", color: "#C9A84C" }}>
                {carousel.topic}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

              {/* Left — thumbnails */}
              <div className="slides-scroll space-y-1 lg:max-h-[700px] overflow-y-auto pr-1">
                {carousel.slides?.map((s, i) => (
                  <SlideThumbnail key={i} slide={s} active={activeIdx === i} onClick={() => setActiveIdx(i)} />
                ))}

                {/* Transcript toggle */}
                {transcript && (
                  <details className="mt-4 rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <summary className="px-4 py-3 cursor-pointer"
                      style={{ fontSize: 10, letterSpacing: "0.2em", color: "#4a4540", textTransform: "uppercase" }}>
                      Ver transcripción
                    </summary>
                    <p className="px-4 pb-4" style={{ fontSize: 11, color: "#4a4540", lineHeight: 1.7, fontWeight: 300 }}>
                      {transcript}
                    </p>
                  </details>
                )}
              </div>

              {/* Right — preview */}
              <div className="space-y-4">
                {carousel.slides?.[activeIdx] && (
                  <>
                    <div className="max-w-xs mx-auto lg:max-w-none">
                      <SlideCard slide={carousel.slides[activeIdx]} />
                    </div>

                    {/* Navigation dots */}
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button
                        onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                        disabled={activeIdx === 0}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#4a4540",
                          opacity: activeIdx === 0 ? 0.2 : 1 }}
                      >‹</button>

                      <div className="flex gap-1.5">
                        {carousel.slides?.map((_, i) => (
                          <button key={i} onClick={() => setActiveIdx(i)}
                            className="rounded-full transition-all duration-200"
                            style={{
                              width: activeIdx === i ? 20 : 6,
                              height: 6,
                              background: activeIdx === i ? "#C9A84C" : "rgba(255,255,255,0.12)",
                            }} />
                        ))}
                      </div>

                      <button
                        onClick={() => setActiveIdx(Math.min((carousel.slides?.length || 1) - 1, activeIdx + 1))}
                        disabled={activeIdx === (carousel.slides?.length || 1) - 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#4a4540",
                          opacity: activeIdx === (carousel.slides?.length || 1) - 1 ? 0.2 : 1 }}
                      >›</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p style={{ fontSize: 9, letterSpacing: "0.3em", color: "#2a2520", textTransform: "uppercase" }}>
          Content Lab · Whisper + Claude · Solo para uso personal
        </p>
      </footer>
    </div>
  );
}
