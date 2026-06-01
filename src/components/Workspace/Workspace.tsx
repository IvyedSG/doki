import React from "react";
import { useProject } from "../../context/ProjectContext";
import {
  IconFileText,
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
  const { config, fileName } = useProject();

  return (
    <div className="flex h-full flex-col bg-bg overflow-hidden">

      {/* Toolbar */}
      <header className="flex h-14 items-center justify-between border-b border-border-main bg-bg2 px-6 shrink-0">
        <div className="flex items-center gap-3">
          <IconFileText size={22} className="text-text-hint shrink-0" />
          <span className="text-body text-text-muted truncate">
            {fileName ?? "Sin documento"}
          </span>
          <div className="w-px h-5 bg-border-main" />
        </div>
        <div className="flex items-center gap-4">
          <button className="text-body text-text-hint hover:text-text-muted transition-colors">
            Exportar
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal" />
            <span className="text-label text-teal">Activo</span>
          </div>
        </div>
      </header>

      {/* Main area: Chat + Document */}
      <div className="flex flex-1 overflow-hidden">

        {/* CHAT */}
        <aside className="w-80 border-r border-border-main bg-bg2 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <div className="bg-bg3 border border-border-main rounded-sm p-5 text-left">
              <p className="text-label text-accent tracking-widest mb-3">
                Doki AI
              </p>
              <p className="text-body text-text-muted leading-relaxed">
                Hola. Identifiqué 2 deficiencias en las dimensiones de Organización y Gramática. ¿Sobre cuál te gustaría profundizar y aprender la normativa?
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border-main p-5 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Preguntale al modelo local..."
                className="flex-1 bg-bg3 border border-border-main rounded-sm px-4 py-3 text-body text-text-main font-mono outline-none focus:border-accent transition-all placeholder:text-text-hint"
              />
              <button className="bg-accent text-bg px-3.5 rounded-sm flex items-center justify-center hover:bg-accent-hover shrink-0 transition-colors">
                <IconArrowUp size={20} />
              </button>
            </div>
          </div>
        </aside>

        {/* DOCUMENT */}
        <main className="flex-1 overflow-y-auto bg-bg">
          <div className="max-w-[640px] w-full mx-auto py-12 px-10">
            {/* Norm badge */}
            <div className="mb-10">
              <span className="inline-block text-label text-accent border border-accent/20 bg-accent/5 px-4 py-2 rounded-sm">
                {config.norm === "apa7" ? "APA 7" : config.norm === "ieee" ? "IEEE" : config.norm} · {config.carrera}
              </span>
            </div>

            {/* Document title */}
            <h1 className="text-body font-medium text-text-main leading-tight mb-10">
              APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL Y SU EFECTO EN LA NORMALIZACIÓN DE DOCUMENTOS ACADÉMICOS
            </h1>

            {/* Document body */}
            <p className="text-body text-text-muted leading-relaxed mb-6">
              La escritura académica constituye una competencia central en la formación universitaria, dado que articula el pensamiento crítico, la apropiación del conocimiento disciplinar y la comunicación científica entre pares.
            </p>
            <p className="text-body text-text-muted leading-relaxed mb-12">
              Su dominio en estudiantes universitarios influye directamente en la calidad de informes, ensayos, monografías y trabajos de fin de carrera, y representa una habilidad cuya consolidación define la transición entre el aprendizaje superior y el ejercicio profesional.
            </p>

            {/* Feedback cards */}
            <div className="border-t border-border-main pt-10 mt-10">
              <span className="label-section mb-5">
                Retroalimentación
              </span>
              <div className="flex flex-col gap-4">
                {feedbackData.map((item) => (
                  <div
                    key={item.dimension}
                    className={`border border-border-main bg-bg3 rounded-sm p-5 text-left border-l-2 ${item.border}`}
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
                    <div className="border-t border-border-main/50 pt-3 mt-3">
                      <p className="text-body text-text-muted leading-relaxed">
                        <strong className="text-text-main">Regla:</strong> {item.rule}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
};
