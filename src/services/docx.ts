import { api } from "./api";

/**
 * Markdown del .docx para vista + análisis. PRIMERO pandoc (en el back): texto limpio y estable
 * que el modelo holístico evalúa bien. Si el back no está disponible, cae a mammoth en el navegador
 * (markdown más sucio: blockquotes, párrafos partidos finos -> el modelo tiende a "resumir").
 */
export async function docxToMarkdown(file: File): Promise<string> {
  try {
    return (await api.convertir(file)).normalize("NFC");
  } catch {
    return await extractTextFromDocx(file);
  }
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  // Convertir a Markdown: preserva headers, negritas, listas, etc.
  // Mammoth soporta convertToMarkdown desde v1.6+ pero los tipos TS no lo incluyen.
  type MdResult = { value: string };
  const result = await (mammoth as unknown as { convertToMarkdown: (input: { arrayBuffer: ArrayBuffer }) => Promise<MdResult> })
    .convertToMarkdown({ arrayBuffer });
  return result.value.normalize("NFC");
}

/**
 * Versión texto plano (sin formato) para búsquedas/resúmenes rápidos.
 * No afecta el análisis principal que trabaja sobre Markdown.
 */
export async function extractRawTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.normalize("NFC");
}
