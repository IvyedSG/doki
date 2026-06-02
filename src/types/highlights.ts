import type { Sugerencia } from "./api";

export interface TextSegment {
  text: string;
  type: "normal" | "organizacion" | "coherencia" | "gramatica";
  sugerenciaId?: string;
}

export function segmentText(text: string, sugerencias: Sugerencia[]): TextSegment[] {
  const withRanges = sugerencias
    .filter((s) => s.rango !== null)
    .sort((a, b) => a.rango!.inicio - b.rango!.inicio);

  if (withRanges.length === 0) {
    return [{ text, type: "normal" }];
  }

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const s of withRanges) {
    const { inicio, fin } = s.rango!;
    if (inicio < cursor) continue;

    if (inicio > cursor) {
      segments.push({ text: text.slice(cursor, inicio), type: "normal" });
    }

    segments.push({
      text: text.slice(inicio, fin),
      type: s.dimension,
      sugerenciaId: s.id,
    });
    cursor = fin;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), type: "normal" });
  }

  return segments;
}
