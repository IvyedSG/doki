import React, { useState } from "react";
import logoUrl from "../../assets/doki_source_logo.png";
import { useProject } from "../../context/ProjectContext";
import { Button } from "../ui/Button";
import { Step1 } from "./Step1";
import { Step2 } from "./Step2";
import { Step3 } from "./Step3";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export const Wizard: React.FC = () => {
  const { setInWorkspace } = useProject();
  const [step, setStep] = useState(1);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleNextStep = () => {
    if (step < 3) {
      setStep((prev) => prev + 1);
    } else {
      setIsInitializing(true);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleFinishInit = () => {
    setIsInitializing(false);
    setInWorkspace(true);
  };

  // Títulos dinámicos basados en el paso actual del wizard (idéntico al mockup)
  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "¿Qué tipo de documento vas a trabajar?";
      case 2:
        return "Definí tu contexto y profundidad";
      case 3:
        return "¿Confirmamos el entorno de análisis?";
      default:
        return "";
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return "Esto permite que el análisis sea específico para tu contexto académico.";
      case 2:
        return "La carrera y el nivel de detalle estructuran el andamiaje didáctico local.";
      case 3:
        return "Revisá los parámetros seleccionados antes de instanciar el monorepo local.";
      default:
        return "";
    }
  };

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-rad-xl border border-border-main bg-bg2 p-10 shadow-2xl flex flex-col gap-8">
      {/* Glow de precisión */}
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      {/* WIZARD HEADER */}
      {!isInitializing && (
        <div className="relative z-10 flex flex-col items-start text-left">
          {/* Logo y Eyebrow */}
          <div className="flex justify-between items-center w-full mb-6">
            <span className="text-xs font-bold text-accent tracking-widest uppercase">
              nuevo proyecto
            </span>
            <img 
              src={logoUrl} 
              alt="Doki Logo" 
              className="h-12 w-12 object-contain shadow-lg rounded-rad border border-border-main bg-bg" 
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-main leading-snug">
            {getStepTitle()}
          </h1>
          <p className="text-xs text-text-muted mt-2 leading-relaxed">
            {getStepSubtitle()}
          </p>
        </div>
      )}

      {/* PROGRESS PIPS */}
      {!isInitializing && (
        <div className="flex gap-2">
          <div className={`step-pip ${step >= 1 ? "done" : ""} ${step === 1 ? "active" : ""}`} />
          <div className={`step-pip ${step >= 2 ? "done" : ""} ${step === 2 ? "active" : ""}`} />
          <div className={`step-pip ${step >= 3 ? "done" : ""} ${step === 3 ? "active" : ""}`} />
        </div>
      )}

      {/* WIZARD CONTENT FOR STEPS */}
      <div className={isInitializing ? "" : "min-h-[220px] flex flex-col justify-center py-2"}>
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && (
          <Step3 
            isInitializing={isInitializing} 
            onFinishInit={handleFinishInit} 
          />
        )}
      </div>

      {/* WIZARD ACTIONS */}
      {!isInitializing && (
        <div className="flex justify-between items-center border-t border-border-main pt-6 mt-2">
          {step > 1 ? (
            <Button 
              variant="ghost"
              onClick={handlePrevStep}
              className="flex items-center gap-2 font-bold"
            >
              <IconChevronLeft size={16} />
              Atrás
            </Button>
          ) : (
            <div className="w-10"></div>
          )}

          <div className="flex items-center gap-6">
            <span className="text-xs text-text-hint font-bold">
              paso {step} de 3
            </span>
            <Button 
              onClick={handleNextStep}
              className="flex items-center gap-2 font-bold"
            >
              {step === 3 ? "Inicializar" : "Siguiente"}
              {step < 3 && <IconChevronRight size={16} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
