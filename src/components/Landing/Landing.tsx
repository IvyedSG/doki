import React, { useRef } from "react";
import { useProject } from "../../context/ProjectContext";
import { extractTextFromDocx } from "../../services/docx";
import { IconFileUpload } from "@tabler/icons-react";

export const Landing: React.FC = () => {
  const { setFileName, setDocumentText, setDocxBuffer, setShowWizard } = useProject();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".md") && !file.name.endsWith(".docx")) return;

    setFileName(file.name);

    try {
      let text: string;
      if (file.name.endsWith(".docx")) {
        // guardamos los bytes para el render fiel (docx-preview), además del texto para analizar
        setDocxBuffer(await file.arrayBuffer());
        text = await extractTextFromDocx(file);
      } else {
        setDocxBuffer(null); // .txt/.md no tienen formato Word
        text = await file.text();
      }
      setDocumentText(text.normalize("NFC"));
      setShowWizard(true);
    } catch {
      setDocxBuffer(null);
      setDocumentText("[Error al leer el archivo]");
      setShowWizard(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const loadDemo = () => {
    setFileName("tesis_investigacion_final_v3.txt");
    setDocxBuffer(null);
    setDocumentText(
      "APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL Y SU EFECTO EN LA NORMALIZACIÓN DE DOCUMENTOS ACADÉMICOS\n\n"
      + "1. INTRODUCCIÓN\n\n"
      + "La escritura académica constituye una competencia central en la formación universitaria, dado que articula el pensamiento crítico, la apropiación del conocimiento disciplinar y la comunicación científica entre pares.\n\n"
      + "Su dominio en estudiantes universitarios influye directamente en la calidad de informes, ensayos, monografías y trabajos de fin de carrera, y representa una habilidad cuya consolidación define la transición entre el aprendizaje superior y el ejercicio profesional.\n\n"
      + "El conjunto de variables propuestas fueron analizadas mediante el software estadístico. Los resultados son bien interesantes para la investigación porque muestran un montón de información relevante.\n\n"
      + "2.1. Marco Teórico\n2.1.1 Antecedentes\n2.1.2 Bases teóricas\n2.2 Metodología"
    );
    setShowWizard(true);
  };

  return (
    <div className="flex items-center justify-center h-full w-full px-12">
      <div className="flex flex-col items-center text-center max-w-[640px] w-full relative">

        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <span className="text-6xl font-medium tracking-tight leading-none text-accent relative">
          Doki
        </span>
        <p className="text-body text-text-muted leading-relaxed mt-6 max-w-[480px] relative">
          Subí tu trabajo y nosotros nos encargamos del formato.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleClick}
          className="w-full bg-bg2/30 hover:bg-bg3 rounded-sm px-12 py-24 text-center cursor-pointer transition-all duration-200 group relative mt-12"
        >
          <input ref={inputRef} type="file" accept=".docx,.txt,.md"
            className="hidden" onChange={handleInputChange}
          />
          <IconFileUpload size={56} className="mx-auto mb-6 text-text-hint group-hover:text-accent transition-colors" />
          <p className="text-body font-medium text-text-main mb-2">
            Arrastrá tu documento académico
          </p>
          <p className="text-label text-text-hint">
            o hacé clic para buscar &middot; compatible con .docx .txt .md
          </p>
        </div>

        <button onClick={loadDemo}
          className="text-label text-text-muted hover:text-accent transition-colors underline underline-offset-4 decoration-border-active hover:decoration-accent mt-10 relative"
        >
          Cargar documento de demostración
        </button>

      </div>
    </div>
  );
};
