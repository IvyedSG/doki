import { renderAsync } from "docx-preview";

/**
 * Render FIEL del .docx dentro de `container`, usando docx-preview.
 * A diferencia de extractRawText (texto plano), esto respeta el formato real de Word:
 * centrado, negritas, fuentes, imágenes (el logo), tablas, márgenes y páginas con sus bordes.
 *
 * Es SOLO LECTURA (un visor): el .docx no se modifica. La edición se sigue haciendo en Word.
 */
export async function renderDocx(container: HTMLElement, buffer: ArrayBuffer): Promise<void> {
  // copia el buffer: docx-preview/jszip puede "consumir" el ArrayBuffer y dejarlo inutilizable
  // para un segundo render (al alternar vistas). Con una copia, el original queda intacto.
  const copia = buffer.slice(0);
  container.innerHTML = "";
  await renderAsync(copia, container, undefined, {
    className: "docx",        // prefijo de clases que aplica docx-preview
    inWrapper: true,          // envuelve las páginas en .docx-wrapper
    ignoreWidth: false,       // respeta el ancho real de la hoja (carta/A4)
    ignoreHeight: false,
    breakPages: true,         // separa por páginas reales del documento
    renderHeaders: true,      // encabezados/pies (es un visor fiel)
    renderFooters: true,
    renderFootnotes: true,
    useBase64URL: true,       // incrusta las imágenes (el logo) como data URI
    experimental: true,       // mejor soporte de tabuladores/algunos estilos
  });
}
