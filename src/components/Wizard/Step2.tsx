import React from "react";
import { useProject, DetailLevel } from "../../context/ProjectContext";
import { Chip } from "../ui/Chip";

const levelDescriptions: Record<DetailLevel, string> = {
  basico: "Señalar Errores: El sistema resalta los fragmentos problemáticos por colores en el lector de forma silenciosa. Ideal para una corrección directa o de nivel experto sin explicaciones redundantes.",
  intermedio: "Reglas Académicas: Señala los fragmentos e inyecta la regla normativa infringida (ej. sintaxis, concordancia o jerarquía formal). Te enseña las convenciones básicas de la comunidad científica.",
  profundo: "Andamiaje Cognitivo Completo: Foco pedagógico riguroso. Explica el error en profundidad, justifica teóricamente la regla académica, brinda un ejemplo práctico de corrección y habilita el chat contextual para debatir offline.",
};

export const Step2: React.FC = () => {
  const { config, updateConfig } = useProject();

  const levels: { value: DetailLevel; label: string }[] = [
    { value: "basico", label: "Básico" },
    { value: "intermedio", label: "Intermedio" },
    { value: "profundo", label: "Profundo (Recomendado)" },
  ];

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* INPUT CARRERA / ESCUELA PROFESIONAL */}
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">
          3. Escuela Profesional / Carrera
        </label>
        <input
          type="text"
          value={config.carrera}
          onChange={(e) => updateConfig({ carrera: e.target.value })}
          placeholder="Ej. Ingeniería de Software"
          className="w-full bg-bg3 border border-border-main hover:border-border-active rounded-rad px-4 py-3 text-sm text-text-main font-mono outline-none focus:border-accent transition-all duration-150"
        />
        <p className="text-[10px] text-text-hint leading-relaxed font-mono">
          El contexto de tu carrera permite perfilar la terminología y las pautas estilísticas particulares de tu especialidad.
        </p>
      </div>

      {/* SELECCIÓN DE PROFUNDIDAD DEL FEEDBACK */}
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">
          4. Profundidad del Andamiaje Didáctico
        </label>
        <div className="flex flex-wrap gap-2.5">
          {levels.map((item) => (
            <Chip
              key={item.value}
              selected={config.detailLevel === item.value}
              onClick={() => updateConfig({ detailLevel: item.value })}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        {/* Descripción didáctica del nivel */}
        <div className="bg-bg3 border border-border-main rounded-rad p-3.5 mt-1.5 transition-all duration-200">
          <p className="text-xs text-text-muted leading-relaxed font-mono">
            <strong className="text-accent uppercase tracking-wider block mb-1 text-[10px]">Modelo Pedagógico:</strong>
            {levelDescriptions[config.detailLevel]}
          </p>
        </div>
      </div>
    </div>
  );
};
