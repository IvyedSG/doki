import React, { useState, useRef, useEffect, useCallback } from "react";
import { useProject } from "../../context/ProjectContext";
import {
  IconArrowUp,
  IconInfoCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";

const feedbackData = [
  {
    dimension: "Organización" as const,
    color: "var(--color-info)",
    border: "border-l-info",
    text: "El título principal está en mayúsculas sostenidas.",
    rule: "Los títulos no deben ir en mayúsculas sostenidas. Utilizá mayúscula únicamente al inicio y en nombres propios.",
  },
  {
    dimension: "Gramática" as const,
    color: "var(--color-danger)",
    border: "border-l-danger",
    text: "Deficiencia ortográfica en la sección inicial.",
    rule: "Se observó una falta menor de concordancia nominal en el primer párrafo del texto analizado.",
  },
];

export const Workspace: React.FC = () => {
  const { config } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatPct, setChatPct] = useState(50);
  const [dragging, setDragging] = useState(false);

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
      pct = Math.max(20, Math.min(80, pct));
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

  return (
    <div ref={containerRef} className="flex h-full">

      {/* CHAT PANEL */}
      <div
        className="flex flex-col bg-bg overflow-hidden"
        style={{ width: `${chatPct}%` }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto flex flex-col-reverse items-center px-3 py-6 gap-5">
          {/* Model message */}
          <div className="w-full max-w-[800px]">
            <div className="text-body text-text-muted leading-relaxed">
              Hola. Identifiqué 2 deficiencias en las dimensiones de Organización y Gramática. ¿Sobre cuál te gustaría profundizar y aprender la normativa?
            </div>
          </div>

          {/* User message */}
          <div className="w-full max-w-[800px] flex justify-end">
            <div className="bg-accent/10 rounded-xl p-5 text-body text-text-main leading-relaxed max-w-[65%]">
              Decime más sobre el problema de organización.
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-3 py-4 shrink-0">
          <div className="max-w-[800px] mx-auto flex gap-2 items-stretch">
            <input
              type="text"
              placeholder="Preguntale al modelo local..."
              className="flex-1 bg-bg3 rounded-sm px-4 py-3 text-body text-text-main font-mono outline-none focus:bg-bg4 transition-all placeholder:text-text-hint"
            />
            <button className="bg-accent hover:bg-accent-hover text-bg rounded-sm flex items-center justify-center shrink-0 transition-colors w-12">
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

      {/* DOCUMENT PANEL */}
      <div
        className="flex flex-col bg-bg3 overflow-hidden"
        style={{ width: `${100 - chatPct}%` }}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="py-10 px-3 max-w-[800px] mx-auto">
            <div className="mb-10">
              <span className="inline-block text-label text-accent bg-accent/5 px-4 py-2 rounded-sm">
                {config.norm === "apa7" ? "APA 7" : config.norm === "ieee" ? "IEEE" : config.norm} · {config.carrera}
              </span>
            </div>

            <h1 className="text-body font-medium text-text-main leading-tight mb-10">
              APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL Y SU EFECTO EN LA NORMALIZACIÓN DE DOCUMENTOS ACADÉMICOS
            </h1>

            <p className="text-body text-text-muted leading-relaxed mb-6">
              La escritura académica constituye una competencia central en la formación universitaria, dado que articula el pensamiento crítico, la apropiación del conocimiento disciplinar y la comunicación científica entre pares.
            </p>
            <p className="text-body text-text-muted leading-relaxed mb-12">
              Su dominio en estudiantes universitarios influye directamente en la calidad de informes, ensayos, monografías y trabajos de fin de carrera, y representa una habilidad cuya consolidación define la transición entre el aprendizaje superior y el ejercicio profesional.
            </p>

            <div className="mt-16">
              <span className="label-section mb-5">Retroalimentación</span>
              <div className="flex flex-col gap-3">
                {feedbackData.map((item) => (
                  <div
                    key={item.dimension}
                    className={`bg-bg2 rounded-sm p-5 text-left border-l-2 ${item.border}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {item.dimension === "Organización" ? (
                        <IconInfoCircle size={18} style={{ color: item.color }} />
                      ) : (
                        <IconAlertTriangle size={18} style={{ color: item.color }} />
                      )}
                      <span className="text-label tracking-widest" style={{ color: item.color }}>
                        {item.dimension}
                      </span>
                    </div>
                    <p className="text-body text-text-main font-medium leading-relaxed mb-3">
                      {item.text}
                    </p>
                    <p className="text-body text-text-muted leading-relaxed">
                      <strong className="text-text-main">Regla:</strong> {item.rule}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
