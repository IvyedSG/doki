import React, { useState, useRef, useEffect, useCallback } from "react";
import { useProject } from "../../context/ProjectContext";
import { api } from "../../services/api";
import { mapDocType } from "../../types/mapping";
import { segmentText } from "../../types/highlights";
import type { Sugerencia, MensajeChat as Mensaje } from "../../types/api";
import {
  IconArrowUp,
  IconAlertTriangle,
  IconCircleCheck,
  IconDatabaseOff,
  IconHierarchy,
  IconLink,
  IconTypography,
} from "@tabler/icons-react";

type WorkspaceStatus = "loading" | "success" | "error" | "partial";
type DimensionFilter = "todas" | "organizacion" | "coherencia" | "gramatica";

const DIMENSION_META = {
  organizacion: { label: "Organización", color: "var(--info)", icon: IconHierarchy },
  coherencia: { label: "Coherencia", color: "var(--warn)", icon: IconLink },
  gramatica: { label: "Gramática", color: "var(--danger)", icon: IconTypography },
} as const;

const DIMENSION_TABS: { key: DimensionFilter; label: string; color: string }[] = [
  { key: "todas", label: "Todas", color: "var(--text-muted)" },
  { key: "organizacion", label: "Organización", color: "var(--info)" },
  { key: "coherencia", label: "Coherencia", color: "var(--warn)" },
  { key: "gramatica", label: "Gramática", color: "var(--danger)" },
];

const RF_LABELS: Record<string, string> = {
  "RF-01": "Falta de sección",
  "RF-02": "Ideas en párrafos",
  "RF-03": "Orden de secciones",
  "RF-04": "Cohesión léxica",
  "RF-05": "Conectores faltantes",
  "RF-06": "Flujo del discurso",
  "RF-07": "Error ortográfico",
  "RF-08": "Corrección ortográfica",
  "RF-09": "Uso no académico",
};

function contar(items: Sugerencia[], severidad: string) {
  return items.filter((s) => s.severidad === severidad).length;
}

const SEV_ICON: Record<string, string> = {
  error: "🔴",
  advertencia: "🟡",
  sugerencia: "🟢",
};

function buildResumen(sugerencias: Sugerencia[]): string {
  const byDim: Record<string, Sugerencia[]> = { organizacion: [], coherencia: [], gramatica: [] };
  for (const s of sugerencias) byDim[s.dimension]?.push(s);

  const total = sugerencias.length;
  if (total === 0) return "📋 **Resumen del análisis**\n\nNo se encontraron problemas en tu documento.";

  const criticos = contar(sugerencias, "error");
  const graves = contar(sugerencias, "advertencia");
  const leves = contar(sugerencias, "sugerencia");

  const lines: string[] = [];
  lines.push("📋 Resumen del análisis");
  lines.push("");

  // Header counts
  const parts: string[] = [];
  if (criticos > 0) parts.push(`🔴 ${criticos} críticos`);
  if (graves > 0) parts.push(`🟡 ${graves} a corregir`);
  if (leves > 0) parts.push(`🟢 ${leves} sugerencias`);
  parts.push(`${total} total`);
  lines.push(parts.join(" · "));
  lines.push("");

  // Por severidad
  const sevs: [string, string, string][] = [
    ["error", "Críticos", "🔴"],
    ["advertencia", "A corregir", "🟡"],
    ["sugerencia", "Sugerencias", "🟢"],
  ];
  for (const [sev, label, icon] of sevs) {
    const items = sugerencias.filter(s => s.severidad === sev);
    if (items.length === 0) continue;
    lines.push(`${icon} **${label}** — ${items.length}`);
    const byRf: Record<string, Sugerencia[]> = {};
    for (const s of items) {
      if (!byRf[s.rf]) byRf[s.rf] = [];
      byRf[s.rf].push(s);
    }
    for (const [rf, grupo] of Object.entries(byRf)) {
      const rfLabel = RF_LABELS[rf] || rf;
      const dimLabel = DIMENSION_META[grupo[0].dimension as keyof typeof DIMENSION_META]?.label || "";
      lines.push(`  ${rfLabel} · ${grupo.length} casos (${dimLabel})`);
      for (const s of grupo.slice(0, 2)) {
        lines.push(`  > ${s.mensaje.slice(0, 120)}`);
      }
      if (grupo.length > 2) lines.push(`  > … y ${grupo.length - 2} más`);
    }
    lines.push("");
  }

  // Aspectos correctos
  const sinProblemas = Object.entries(byDim).filter(([, items]) => items.length === 0);
  if (sinProblemas.length > 0) {
    lines.push("✅ Aspectos correctos");
    for (const [dim] of sinProblemas) {
      const meta = DIMENSION_META[dim as keyof typeof DIMENSION_META];
      lines.push(`  • ${meta.label} — sin problemas detectados.`);
    }
    lines.push("");
  }

  // Veredicto
  lines.push("**Veredicto**");
  if (criticos > 0) {
    lines.push(`${SEV_ICON["error"]} ${criticos} críticos · ${SEV_ICON["advertencia"]} ${graves} a corregir · ${SEV_ICON["sugerencia"]} ${leves} sugerencias · ${total} total`);
    lines.push("Empezá por los críticos — son los que más afectan la calidad académica.");
  } else if (graves > 0) {
    lines.push(`${SEV_ICON["error"]} ${criticos} críticos · ${SEV_ICON["advertencia"]} ${graves} a corregir · ${SEV_ICON["sugerencia"]} ${leves} sugerencias · ${total} total`);
    lines.push("Revisá los que están a corregir — mejorarlos hará una gran diferencia.");
  } else if (leves > 0) {
    lines.push(`🟢 Solo sugerencias menores (${leves}) — tu documento está en buena forma.`);
  } else {
    lines.push("No se encontraron problemas. ¡Buen trabajo!");
  }

  return lines.join("\n");
}

function ThinkingDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const t = setInterval(() => setDots((p) => (p.length >= 3 ? "" : p + ".")), 400);
    return () => clearInterval(t);
  }, []);
  return <>{dots}</>;
}

export const Workspace: React.FC = () => {
  const { config, documentText } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatPct, setChatPct] = useState(35);
  const [dragging, setDragging] = useState(false);

  const [status, setStatus] = useState<WorkspaceStatus>("loading");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [motoresFallidos, setMotoresFallidos] = useState<string[]>([]);

  const [dimFilter, setDimFilter] = useState<DimensionFilter>("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const r1Ref = useRef<Sugerencia[]>([]);
  const [thinkingText, setThinkingText] = useState("");

  useEffect(() => {
    if (!documentText) return;
    const tipoDoc = mapDocType(config.docType);
    setStatus("loading");
    setThinkingText("Conectando con el backend");
    r1Ref.current = [];

    api
      .salud()
      .then((salud) => {
        if (salud.estado === "error") throw new Error("El backend no está disponible");
        setThinkingText("Revisando ortografía y gramática");
        return api.analizar({ texto: documentText, tipo_doc: tipoDoc, dimensiones: ["gramatica"] });
      })
      .then((r1) => {
        r1Ref.current = r1.sugerencias;
        setSugerencias(r1.sugerencias);
        setMotoresFallidos(r1.motores_fallidos);
        setStatus("partial");
        setThinkingText("Analizando organización y coherencia");
        return api.analizar({ texto: documentText, tipo_doc: tipoDoc, dimensiones: ["organizacion", "coherencia"] });
      })
      .then((r2) => {
        const idsR1 = new Set(r1Ref.current.map((s) => s.id));
        const todas = [...r1Ref.current, ...r2.sugerencias.filter((s) => !idsR1.has(s.id))];
        setSugerencias(todas);
        setMotoresFallidos((prev) => [...new Set([...prev, ...r2.motores_fallidos])]);
        const todosFallidos = todas.length === 0 && r2.motores_fallidos.length > 0;
        if (todosFallidos) {
          setStatus("error");
          setErrorMsg("Ollama no está disponible. El análisis se limitará a reglas básicas de ortografía y normativa.\nPara análisis completo con IA: https://ollama.com");
        } else {
          setStatus("success");
          setMessages([{ rol: "asistente", contenido: buildResumen(todas) }]);
        }
        setThinkingText("");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Error al analizar el documento");
        setThinkingText("");
      });
  }, [documentText, config.docType]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(25, Math.min(75, pct));
      setChatPct(pct);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const filteredSugerencias = sugerencias.filter(
    (s) => dimFilter === "todas" || s.dimension === dimFilter,
  );

  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || sending) return;
    setChatInput("");
    setSending(true);

    const userMsg: Mensaje = { rol: "usuario", contenido: text };
    const updated = [...messages, userMsg];
    setMessages(updated);

    try {
      const res = await api.chat({
        mensaje: text,
        historial: updated.map((m) => ({ rol: m.rol, contenido: m.contenido })),
        contexto: {
          documento: documentText ?? undefined,
          tipo_chat: "general",
        },
      });
      setMessages((prev) => [...prev, { rol: "asistente", contenido: res.respuesta }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { rol: "asistente", contenido: "Lo siento, no pude procesar tu mensaje. Intentalo de nuevo." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleCardClick = (s: Sugerencia) => {
    setExpandedId(expandedId === s.id ? null : s.id);
    setHighlightedId(s.id);
    setDimFilter("todas");
  };

  const handleChatOnSugerencia = async (s: Sugerencia) => {
    const meta = DIMENSION_META[s.dimension];
    const pregunta = `Decime más sobre el problema de ${meta.label.toLowerCase()}: "${s.mensaje}"`;
    const userMsg: Mensaje = { rol: "usuario", contenido: pregunta };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await api.chat({
        mensaje: pregunta,
        contexto: {
          documento: documentText ?? undefined,
          sugerencia_id: s.id,
          tipo_chat: "pedagogico",
        },
      });
      setMessages((prev) => [...prev, { rol: "asistente", contenido: res.respuesta }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { rol: "asistente", contenido: "Lo siento, no pude procesar tu mensaje." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div ref={containerRef} className="flex h-full">
      {/* ── CHAT PANEL ── */}
      <div
        className="flex flex-col bg-bg overflow-hidden"
        style={{ width: `${chatPct}%` }}
      >
          <div className="flex-1 overflow-y-auto px-3 py-6">
          <div className="max-w-[700px] mx-auto flex flex-col gap-6">

            {/* Loading state — Claude style */}
            {messages.length === 0 && status === "loading" && (
              <div className="flex flex-col gap-6 py-16">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-accent text-sm">✦</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-body text-text-main font-medium">
                      Analizando tu documento
                    </span>
                    <span className="text-label text-text-hint">
                      {thinkingText}<ThinkingDots />
                    </span>
                  </div>
                </div>
                <div className="ml-12 space-y-2">
                  <div className="h-2 bg-bg3 rounded-full w-3/4 animate-pulse" />
                  <div className="h-2 bg-bg3 rounded-full w-1/2 animate-pulse" />
                  <div className="h-2 bg-bg3 rounded-full w-5/6 animate-pulse" />
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-4 py-16">
                <div className="flex items-center gap-3 text-danger">
                  <IconDatabaseOff size={24} />
                  <span className="text-body font-medium">Error</span>
                </div>
                <p className="text-body text-text-muted whitespace-pre-wrap">{errorMsg}</p>
              </div>
            )}

            {status === "partial" && (
              <div className="bg-warn/10 border border-warn/20 rounded-sm px-5 py-4 text-body text-text-muted flex items-start gap-3">
                <IconAlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
                <span>
                  Algunos análisis están incompletos ({motoresFallidos.join(", ")}).
                  Mostrando resultados parciales.
                </span>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.rol === "usuario" ? "justify-end" : ""}`}
              >
                <div
                  className={`rounded-xl px-6 py-5 text-body leading-relaxed whitespace-pre-wrap ${
                    msg.rol === "usuario"
                      ? "bg-accent/10 text-text-main max-w-[70%]"
                      : "bg-bg2 text-text-muted w-full"
                  }`}
                >
                  {msg.rol === "asistente" ? (
                    <div className="prose-custom leading-relaxed">
                      {msg.contenido.split("\n").map((line, li) => {
                        const t = line.trim();
                        if (!t) return <div key={li} className="h-2" />;
                        if (t.startsWith("📋")) return <p key={li} className="text-text-main font-bold text-lg mb-4 mt-0">{t.replace(/\*\*/g, "")}</p>;
                        if (t.startsWith("🔴") || t.startsWith("🟡") || t.startsWith("🟢")) {
                          const isHeader = t.includes("—") || t.includes("·");
                          return <p key={li} className={`${isHeader ? "text-text-main font-semibold text-base mt-5 mb-3" : "text-text-main mb-1 ml-4"}`}>{t.replace(/\*\*/g, "")}</p>;
                        }
                        if (t.startsWith("✅")) return <p key={li} className="text-text-main font-semibold text-base mt-5 mb-3">{t}</p>;
                        if (t.startsWith("**Veredicto") || t.match(/^\*\*.*\*\*/)) return <p key={li} className="text-text-main font-semibold text-base mt-5 mb-2">{t.replace(/\*\*/g, "")}</p>;
                        if (t.startsWith(">")) return <p key={li} className="text-text-hint text-label mb-1 ml-6 italic">{t.replace(/^>\s*/, "")}</p>;
                        if (t.startsWith("•")) return <p key={li} className="text-text-muted mb-1 ml-4">{t}</p>;
                        return <p key={li} className="text-text-muted mb-1">{t.replace(/\*\*/g, "")}</p>;
                      })}
                    </div>
                  ) : (
                    msg.contenido
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator while sending */}
            {sending && (
              <div className="flex items-center gap-2 text-label text-text-hint">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                Pensando<ThinkingDots />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat input */}
        <div className="px-4 py-4 shrink-0 border-t border-border-main">
          <div className="max-w-[700px] mx-auto flex gap-2 items-stretch">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Preguntale al asistente..."
              disabled={sending || status === "error"}
              className="flex-1 bg-bg3 rounded-sm px-4 py-3 text-body text-text-main font-mono outline-none focus:bg-bg4 transition-all placeholder:text-text-hint disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !chatInput.trim() || status === "error"}
              className="bg-accent hover:bg-accent-hover text-bg rounded-sm flex items-center justify-center shrink-0 transition-colors w-12 disabled:opacity-50"
            >
              <IconArrowUp size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* DRAG HANDLE */}
      <div
        className={`w-1 shrink-0 cursor-col-resize relative transition-colors ${
          dragging ? "bg-accent/30" : "bg-border-main hover:bg-accent/20"
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* ── DOCUMENT PANEL ── */}
      <div
        className="flex flex-col bg-bg3 overflow-hidden"
        style={{ width: `${100 - chatPct}%` }}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="py-8 px-5 max-w-[750px] mx-auto">
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              <span className="inline-block text-[10px] text-accent bg-accent/5 px-3 py-1.5 rounded-sm font-medium tracking-wider uppercase">
                {config.norm === "apa7" ? "APA 7" : config.norm}
              </span>
              <span className="inline-block text-[10px] text-text-hint bg-bg2 px-3 py-1.5 rounded-sm font-medium">
                {config.carrera}
              </span>
            </div>

            {documentText && (status === "success" || status === "partial") && (
              <div className="mb-10 text-body text-text-muted leading-relaxed font-mono whitespace-pre-wrap">
                {segmentText(documentText, sugerencias).map((seg, i) => {
                  if (seg.type === "normal") {
                    return <span key={i}>{seg.text}</span>;
                  }
                  return (
                    <span
                      key={i}
                      className={`highlight-${seg.type} cursor-pointer`}
                      onClick={() => {
                        const s = sugerencias.find((x) => x.id === seg.sugerenciaId);
                        if (s) handleCardClick(s);
                      }}
                      title={
                        seg.type === "organizacion"
                          ? "Problema de organización - click para ver detalle"
                          : seg.type === "coherencia"
                            ? "Problema de coherencia - click para ver detalle"
                            : "Problema de gramática - click para ver detalle"
                      }
                    >
                      {seg.text}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Dimension filter tabs */}
            {sugerencias.length > 0 && (
              <div className="mb-6">
                <div className="flex gap-2 flex-wrap">
                  {DIMENSION_TABS.map((tab) => {
                    const count =
                      tab.key === "todas"
                        ? sugerencias.length
                        : sugerencias.filter((s) => s.dimension === tab.key).length;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setDimFilter(tab.key)}
                        className={`px-4 py-2 rounded-full text-label border transition-all ${
                          dimFilter === tab.key
                            ? "bg-accent/10 border-accent text-accent"
                            : "bg-transparent border-border-main text-text-muted hover:border-accent hover:text-accent"
                        }`}
                      >
                        {tab.label}
                        <span className="ml-1.5 opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feedback cards by RF group */}
            {filteredSugerencias.length > 0 && (
              <div>
                <span className="text-[10px] text-text-hint font-medium tracking-widest uppercase mb-5 block">
                  Retroalimentación
                </span>
                <div className="flex flex-col gap-2">
                  {filteredSugerencias.map((s) => {
                    const meta = DIMENSION_META[s.dimension];
                    const Icon = meta.icon;
                    const isExpanded = expandedId === s.id;
                    const sevIcon = s.severidad === "error" ? "🔴" : s.severidad === "advertencia" ? "🟡" : "🟢";
                    const sevColor =
                      s.severidad === "error" ? "var(--danger)" :
                      s.severidad === "advertencia" ? "var(--warn)" :
                      "var(--text-hint)";
                    const sevLabel =
                      s.severidad === "error" ? "Crítico" :
                      s.severidad === "advertencia" ? "A corregir" :
                      "Sugerencia";
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleCardClick(s)}
                        className={`bg-bg2 rounded-sm p-5 text-left border-l-2 cursor-pointer transition-all ${
                          highlightedId === s.id ? "border-l-[3px] brightness-125" : "hover:brightness-110"
                        }`}
                        style={{ borderLeftColor: meta.color }}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Icon size={16} style={{ color: meta.color }} />
                          <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                            style={{ backgroundColor: sevColor + "12", color: sevColor }}
                          >
                            {sevIcon} {sevLabel}
                          </span>
                          <span className="text-[9px] text-text-hint ml-auto">{s.rf}</span>
                        </div>
                        <p className="text-body text-text-main leading-relaxed">{s.mensaje}</p>
                        {isExpanded && s.sugerencia && (
                          <div className="mt-3 pt-3 border-t border-border-main/50">
                            <p className="text-body text-text-muted leading-relaxed">
                              <span className="text-text-main font-medium">💡 Sugerencia:</span> {s.sugerencia}
                            </p>
                          </div>
                        )}
                        {isExpanded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatOnSugerencia(s);
                            }}
                            className="mt-3 text-body text-accent hover:text-accent-hover transition-colors underline underline-offset-4"
                          >
                            ¿Cómo corrijo esto?
                          </button>
                        )}
                        {isExpanded && s.sugerencia && (
                          <div className="mt-3 pt-3 border-t border-border-main/50">
                            <p className="text-[13px] text-text-muted leading-relaxed">
                              <span className="text-text-main font-medium">Sugerencia:</span> {s.sugerencia}
                            </p>
                          </div>
                        )}
                        {isExpanded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatOnSugerencia(s);
                            }}
                            className="mt-3 text-[11px] text-accent hover:text-accent-hover transition-colors underline underline-offset-4"
                          >
                            ¿Cómo corrijo esto?
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {status === "success" && filteredSugerencias.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20">
                <IconCircleCheck size={32} className="text-teal" />
                <p className="text-body text-text-muted">
                  No se encontraron problemas en esta dimensión.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};