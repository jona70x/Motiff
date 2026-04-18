// @ts-nocheck — unpdf ships ESM types that don't resolve cleanly in Deno strict mode
import { extractText } from "npm:unpdf@0.11.0";

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  isTextBased: boolean; // false when no selectable text was found (image-only PDF)
}

export async function extractPdfText(pdfBytes: Uint8Array): Promise<PdfExtractResult> {
  const { text, totalPages } = await extractText(pdfBytes, { mergePages: true });

  const cleaned = text.replace(/\s+/g, " ").trim();
  const isTextBased = cleaned.length > 50;

  return {
    text: cleaned,
    pageCount: totalPages,
    isTextBased,
  };
}
