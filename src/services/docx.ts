import { api } from "./api";

const FORMATOS_LOCALES = new Set(["txt", "md"]);
const FORMATOS_CON_FALLBACK = new Set(["docx"]);

export type FormatoDocumento = "local" | "backend-fallback" | "backend-only" | "desconocido";

export function detectarFormato(file: File): FormatoDocumento {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (FORMATOS_LOCALES.has(ext)) return "local";
  if (FORMATOS_CON_FALLBACK.has(ext)) return "backend-fallback";
  if (ext) return "backend-only";
  return "desconocido";
}

export function mensajeConversion(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const nombre = file.name;
  switch (ext) {
    case "pdf":
      return `Convirtiendo PDF a Markdown… (${nombre})`;
    case "docx":
      return `Convirtiendo documento Word a Markdown… (${nombre})`;
    case "pptx":
      return `Convirtiendo presentación a Markdown… (${nombre})`;
    case "xlsx":
    case "xls":
      return `Convirtiendo planilla a Markdown… (${nombre})`;
    case "html":
    case "htm":
      return `Convirtiendo HTML a Markdown… (${nombre})`;
    case "txt":
    case "md":
      return `Leyendo documento… (${nombre})`;
    default:
      return `Convirtiendo archivo a Markdown… (${nombre})`;
  }
}

/**
 * Convierte un archivo a Markdown para vista + análisis.
 *
 * - .txt / .md: lectura local directa (instantánea).
 * - .docx: PRIMERO backend (MarkItDown/pandoc), si falla → mammoth en el navegador.
 * - Otros (.pdf, .pptx, .xlsx, .html, etc.): backend obligatorio.
 */
export async function convertirDocumento(file: File): Promise<string> {
  const formato = detectarFormato(file);

  if (formato === "local") {
    return (await file.text()).normalize("NFC");
  }

  if (formato === "backend-fallback") {
    try {
      return (await api.convertir(file)).normalize("NFC");
    } catch {
      return await extractTextFromDocx(file);
    }
  }

  if (formato === "backend-only") {
    return (await api.convertir(file)).normalize("NFC");
  }

  throw new Error(`Formato de archivo no soportado: ${file.name}`);
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  type MdResult = { value: string };
  const result = await (
    mammoth as unknown as { convertToMarkdown: (input: { arrayBuffer: ArrayBuffer }) => Promise<MdResult> }
  ).convertToMarkdown({ arrayBuffer });
  return result.value.normalize("NFC");
}

export async function extractRawTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.normalize("NFC");
}
