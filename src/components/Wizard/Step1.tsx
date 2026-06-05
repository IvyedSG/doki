import React from "react";
import { useProject, DocType, NormType } from "../../context/ProjectContext";
import { Chip } from "../ui/Chip";

const docDescriptions: Record<DocType, string> = {
  tesis: "Trabajo de investigación formal, riguroso y exhaustivo estructurado bajo un método científico para optar por un título profesional o grado académico.",
  proyecto: "Propuesta de investigación (plan de tesis): tiene introducción, método y aspectos administrativos, pero todavía NO tiene resultados ni conclusiones.",
  informe: "Documento técnico descriptivo que reporta de manera objetiva los resultados, diagnóstico o el estado de avance de un proyecto de ingeniería.",
  ensayo: "Texto crítico, argumentativo y reflexivo centrado en analizar, debatir y defender una postura teórica o metodológica personal fundamentada.",
  monografia: "Estudio analítico de carácter bibliográfico enfocado en la recopilación, revisión y síntesis crítica de un tema académico específico.",
};

const normDescriptions: Record<NormType, string> = {
  apa7: "Estilo estándar de la American Psychological Association (7.ª ed.). Foco en citación autor-fecha, estructura jerárquica clara de secciones, márgenes y rigor de fuentes. Recomendado para Ingeniería de Software y Ciencias Sociales.",
  ieee: "Estándar del Institute of Electrical and Electronics Engineers. Sistema de citación numérica en corchetes [1] y pautas estrictas para ingeniería de sistemas, telecomunicaciones y artículos científicos.",
  vancouver: "Estilo numérico consecutivo utilizado principalmente en Ciencias de la Salud. Las citas en el texto se marcan con números según su orden de aparición cronológica.",
  chicago: "Normativa versátil que soporta sistemas de Notas y Bibliografía (foco en pie de página) o Autor-Fecha. Ideal para humanidades y ciencias físicas y sociales.",
};

export const Step1: React.FC = () => {
  const { config, updateConfig } = useProject();

  const docTypes: { value: DocType; label: string }[] = [
    { value: "tesis", label: "Tesis" },
    { value: "proyecto", label: "Proyecto de investigación" },
    { value: "informe", label: "Informe" },
    { value: "ensayo", label: "Ensayo" },
    { value: "monografia", label: "Monografía" },
  ];

  const normTypes: { value: NormType; label: string }[] = [
    { value: "apa7", label: "APA 7" },
    { value: "ieee", label: "IEEE" },
    { value: "vancouver", label: "Vancouver" },
    { value: "chicago", label: "Chicago" },
  ];

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* SELECCIÓN TIPO DE DOCUMENTO */}
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">
          tipo de documento
        </label>
        <div className="flex flex-wrap gap-2.5">
          {docTypes.map((item) => (
            <Chip
              key={item.value}
              selected={config.docType === item.value}
              onClick={() => updateConfig({ docType: item.value })}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        {/* Descripción didáctica del documento */}
        <div className="bg-bg3 border border-border-main rounded-rad p-3.5 mt-1.5 transition-all duration-200">
          <p className="text-xs text-text-muted leading-relaxed font-mono">
            {docDescriptions[config.docType]}
          </p>
        </div>
      </div>

      {/* SELECCIÓN DE NORMATIVA */}
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">
          normativa a aplicar
        </label>
        <div className="flex flex-wrap gap-2.5">
          {normTypes.map((item) => (
            <Chip
              key={item.value}
              selected={config.norm === item.value}
              onClick={() => updateConfig({ norm: item.value })}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        {/* Descripción didáctica de la norma */}
        <div className="bg-bg3 border border-border-main rounded-rad p-3.5 mt-1.5 transition-all duration-200">
          <p className="text-xs text-text-muted leading-relaxed font-mono">
            <strong className="text-accent uppercase tracking-wider block mb-1 text-[10px]">Pautas del Estilo:</strong>
            {normDescriptions[config.norm]}
          </p>
        </div>
      </div>
    </div>
  );
};
