import { useState, useEffect, useRef } from "react";
import { api } from "./api";

export interface HealthState {
  ok: boolean;
  ollamaOk: boolean;
  modeloListo: boolean;
  mensaje: string;
  color: string;
}

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthState>({
    ok: false, ollamaOk: false, modeloListo: false,
    mensaje: "Iniciando...", color: "bg-text-hint",
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let delay = 500;

    const check = async () => {
      try {
        const res = await api.salud();
        if (cancelled) return;
        delay = 8_000;

        if (!res.ollama_ok || !res.modelo_listo) {
          setHealth({ ok: true, ollamaOk: false, modeloListo: false,
            mensaje: "Iniciando...", color: "bg-accent" });
        } else {
          setHealth({ ok: true, ollamaOk: true, modeloListo: true,
            mensaje: "Listo", color: "bg-teal" });
        }
      } catch {
        if (cancelled) return;
        delay = Math.min(delay * 2, 15_000);
        setHealth({ ok: false, ollamaOk: false, modeloListo: false,
          mensaje: "Conectando...", color: "bg-danger" });
      }
      if (!cancelled) timer.current = setTimeout(check, delay);
    };

    timer.current = setTimeout(check, delay);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return health;
}
