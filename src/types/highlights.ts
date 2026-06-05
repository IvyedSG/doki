import type { Sugerencia } from "./api";

export interface TextSegment {
  text: string;
  type: "normal" | "organizacion" | "coherencia" | "gramatica";
  sugerenciaId?: string;
}

export function segmentText(text: string, sugerencias: Sugerencia[]): TextSegment[] {
  // Rangos válidos (no vacíos). RF-01/03/06 no traen rango -> no se marcan inline (solo tarjeta).
  const ranges = sugerencias
    .filter((s) => s.rango !== null && s.rango!.fin > s.rango!.inicio)
    .map((s) => ({ inicio: s.rango!.inicio, fin: s.rango!.fin, s }));

  if (ranges.length === 0) {
    return [{ text, type: "normal" }];
  }

  // Cortamos en CADA límite de rango -> tramos donde la cobertura no cambia. Así, cuando una
  // marca de palabra (RF-07) cae DENTRO de un párrafo señalado (RF-02), no se descarta: el
  // párrafo se parte alrededor de la palabra y ambas marcas se ven (antes se perdía la de adentro).
  const cortes = new Set<number>([0, text.length]);
  for (const r of ranges) {
    if (r.inicio > 0 && r.inicio < text.length) cortes.add(r.inicio);
    if (r.fin > 0 && r.fin < text.length) cortes.add(r.fin);
  }
  const puntos = [...cortes].sort((a, b) => a - b);

  const segments: TextSegment[] = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    if (a >= b) continue;
    // De los rangos que cubren este tramo gana el MÁS CHICO (palabra) sobre el grande (párrafo).
    let top: (typeof ranges)[number] | null = null;
    for (const r of ranges) {
      if (r.inicio <= a && r.fin >= b && (!top || r.fin - r.inicio < top.fin - top.inicio)) {
        top = r;
      }
    }
    segments.push(
      top
        ? { text: text.slice(a, b), type: top.s.dimension, sugerenciaId: top.s.id }
        : { text: text.slice(a, b), type: "normal" },
    );
  }

  return segments;
}
