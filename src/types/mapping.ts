import type { DocType, NormType } from "../context/ProjectContext";

const DOC_TYPE_MAP: Record<DocType, string> = {
  tesis: "tesis",
  proyecto: "proyecto_investigacion",
  informe: "informe",
  ensayo: "ensayo_argumentativo",
  monografia: "monografia",
};

export function mapDocType(docType: DocType): string {
  return DOC_TYPE_MAP[docType];
}

const NORM_MAP: Record<NormType, string> = {
  apa7: "APA 7",
  ieee: "IEEE",
  vancouver: "Vancouver",
  chicago: "Chicago",
};

export function mapNorm(norm: NormType): string {
  return NORM_MAP[norm];
}
