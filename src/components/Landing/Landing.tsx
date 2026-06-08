import React, { useRef, useState } from "react";
import { useProject } from "../../context/ProjectContext";
import { convertirDocumento, detectarFormato, mensajeConversion } from "../../services/docx";
import { IconFileUpload, IconLoader2 } from "@tabler/icons-react";

export const Landing: React.FC = () => {
  const { setFileName, setDocumentText, setDocxBuffer, setInWorkspace } = useProject();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionMessage, setConversionMessage] = useState("");

  const handleFile = async (file: File) => {
    const formato = detectarFormato(file);
    if (formato === "desconocido") return;

    setFileName(file.name);
    setIsConverting(true);
    setConversionMessage(mensajeConversion(file));

    try {
      if (formato === "backend-fallback" || formato === "backend-only") {
        setDocxBuffer(await file.arrayBuffer());
      } else {
        setDocxBuffer(null);
      }

      const text = await convertirDocumento(file);
      setDocumentText(text.normalize("NFC"));
      setInWorkspace(true);
    } catch {
      setDocxBuffer(null);
      setDocumentText("[Error al leer el archivo]");
      setInWorkspace(true);
    } finally {
      setIsConverting(false);
      setConversionMessage("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    if (isConverting) return;
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
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

        {isConverting ? (
          <div className="w-full bg-bg2/30 rounded-sm px-12 py-24 text-center mt-12">
            <IconLoader2 size={48} className="mx-auto mb-6 text-accent animate-spin" />
            <p className="text-body font-medium text-text-main mb-2">
              {conversionMessage}
            </p>
            <p className="text-label text-text-hint">
              Esto puede tomar unos segundos dependiendo del archivo
            </p>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={handleClick}
            className="w-full bg-bg2/30 hover:bg-bg3 rounded-sm px-12 py-24 text-center cursor-pointer transition-all duration-200 group relative mt-12"
          >
            <input ref={inputRef} type="file" accept=".docx,.txt,.md,.pdf,.pptx,.xlsx,.html,.htm,.csv,.epub"
              className="hidden" onChange={handleInputChange}
            />
            <IconFileUpload size={56} className="mx-auto mb-6 text-text-hint group-hover:text-accent transition-colors" />
            <p className="text-body font-medium text-text-main mb-2">
              Arrastrá tu documento académico
            </p>
            <p className="text-label text-text-hint">
              o hacé clic para buscar &middot; compatible con .docx .pdf .txt .md .pptx .xlsx .html
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
