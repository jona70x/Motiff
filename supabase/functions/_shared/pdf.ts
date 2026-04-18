// Pure Deno PDF text extractor.
//
// Handles CID fonts with hex-encoded glyph IDs (decoded via ToUnicode CMaps)
// and classic literal-string Tj operators. FlateDecode streams are decompressed
// via pako (pure JS zlib) — DecompressionStream hangs silently on invalid data
// in supabase-edge-runtime and cannot be used reliably.

import { inflate as pakoInflate, inflateRaw } from "npm:pako@2.1.0";

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  isTextBased: boolean;
}

type CMapTable  = Map<number, string>;          // glyph_id → Unicode char
type FontCmapMap = Map<string, CMapTable>;      // "F1" → CMapTable

// ─── Public entry point ──────────────────────────────────────────────────────

export function extractPdfText(pdfBytes: Uint8Array): PdfExtractResult {
  // MUST use String.fromCharCode, not TextDecoder("latin1").
  // The Web API spec aliases "latin1" to windows-1252, which remaps bytes
  // 0x80–0x9F to multi-byte Unicode code points. Those would then be truncated
  // back to the wrong byte values when reconstructing Uint8Arrays.
  const raw = bytesToString(pdfBytes);

  const pageCount = Math.max(1, (raw.match(/\/Type\s*\/Page(?![sS])/g) ?? []).length);

  // Build a map of every PDF object: objNum → { dict, streamBody? }
  const objects = parseObjects(raw);

  // Build font-name → ToUnicode CMap lookup.
  const fontCmaps = buildFontCmaps(raw, objects);

  // Extract text from all content streams.
  const texts: string[] = [];
  for (const [, obj] of objects) {
    if (!obj.streamText) continue;
    if (!obj.streamText.includes("Tj") && !obj.streamText.includes("TJ")) continue;
    extractTextOps(obj.streamText, fontCmaps, texts);
  }

  const text = texts.join(" ").replace(/\s+/g, " ").trim();

  return { text, pageCount, isTextBased: text.length > 50 };
}

// ─── Object parser ────────────────────────────────────────────────────────────

interface PdfObject {
  dict: string;          // raw dict text (between << and >>)
  streamText?: string;   // decompressed stream content (if any)
}

function parseObjects(raw: string): Map<number, PdfObject> {
  const result = new Map<number, PdfObject>();

  // Match: NNN 0 obj ... endobj
  const objRe = /(\d+)\s+0\s+obj\s*([\s\S]*?)\s*endobj/g;
  let m: RegExpExecArray | null;

  while ((m = objRe.exec(raw)) !== null) {
    const objNum = parseInt(m[1]);
    const body = m[2];

    // Extract the stream body (raw bytes as latin1 string).
    const streamMatch = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!streamMatch) {
      result.set(objNum, { dict: body });
      continue;
    }

    // IMPORTANT: only inspect text BEFORE the stream keyword for filter/type
    // detection. Binary stream content can contain ">>" and "/Filter" byte
    // sequences that would confuse a greedy dict regex.
    const streamKwIdx = body.indexOf("stream");
    const dictArea = streamKwIdx >= 0 ? body.slice(0, streamKwIdx) : body.slice(0, 400);

    // Skip image streams — they don't contain text operators.
    if (/\/Subtype\s*\/Image/.test(dictArea)) {
      result.set(objNum, { dict: dictArea });
      continue;
    }

    const streamStr = streamMatch[1];
    const isFlate = /\/FlateDecode/.test(dictArea);
    const hasUnknownFilter = /\/Filter/.test(dictArea) && !isFlate;

    if (hasUnknownFilter) {
      // Skip LZW, DCT, etc.
      result.set(objNum, { dict: dictArea });
      continue;
    }

    if (isFlate) {
      const bytes = Uint8Array.from(streamStr, (c) => c.charCodeAt(0));
      const dec = inflate(bytes);
      result.set(objNum, { dict: dictArea, streamText: dec && dec.length > 0 ? bytesToString(dec) : undefined });
    } else {
      // Uncompressed stream — use as-is.
      result.set(objNum, { dict: dictArea, streamText: streamStr });
    }
  }

  return result;
}

// ─── Font / CMap discovery ───────────────────────────────────────────────────

function buildFontCmaps(raw: string, objects: Map<number, PdfObject>): FontCmapMap {
  const result: FontCmapMap = new Map();

  // Find every /Fx NNN 0 R reference → font object number.
  const fontObjMap = new Map<string, number>();
  const fontRefRe = /\/F(\d+)\s+(\d+)\s+0\s+R/g;
  let m: RegExpExecArray | null;
  while ((m = fontRefRe.exec(raw)) !== null) {
    fontObjMap.set(`F${m[1]}`, parseInt(m[2]));
  }

  for (const [fontName, fontObjNum] of fontObjMap) {
    const fontObj = objects.get(fontObjNum);
    if (!fontObj) continue;

    const tuMatch = fontObj.dict.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (!tuMatch) continue;

    const tuObjNum = parseInt(tuMatch[1]);
    const tuObj = objects.get(tuObjNum);
    if (!tuObj?.streamText) continue;

    const cmap = parseCMap(tuObj.streamText);
    if (cmap.size > 0) result.set(fontName, cmap);
  }

  return result;
}

function parseCMap(cmapText: string): CMapTable {
  const table: CMapTable = new Map();

  const bfcharRe = /<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = bfcharRe.exec(cmapText)) !== null) {
    const glyphId = parseInt(m[1], 16);
    const ucp = m[2];
    // Multi-codepoint entries like <00660069> = "fi" ligature
    if (ucp.length <= 4) {
      table.set(glyphId, String.fromCodePoint(parseInt(ucp, 16)));
    } else {
      const chars = [];
      for (let i = 0; i < ucp.length; i += 4) {
        chars.push(String.fromCodePoint(parseInt(ucp.substring(i, i + 4), 16)));
      }
      table.set(glyphId, chars.join(""));
    }
  }

  const bfrangeRe = /<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g;
  while ((m = bfrangeRe.exec(cmapText)) !== null) {
    const start = parseInt(m[1], 16);
    const end   = parseInt(m[2], 16);
    const base  = parseInt(m[3], 16);
    for (let i = start; i <= end; i++) {
      table.set(i, String.fromCodePoint(base + (i - start)));
    }
  }

  return table;
}

// ─── Content stream extraction ────────────────────────────────────────────────

function extractTextOps(content: string, fontCmaps: FontCmapMap, out: string[]): void {
  let currentFont = "";

  // Single pass regex matches all three token types in document order:
  //   1. Font switch   /Fx <size> Tf
  //   2. TJ array      [...] TJ
  //   3. Literal Tj    (string) Tj | ' | "
  const tokenRe =
    /\/F(\d+)\s+[\d.]+\s+Tf|\[([^\]]*)\]\s*TJ|\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(content)) !== null) {
    if (m[1] !== undefined) {
      currentFont = `F${m[1]}`;
    } else if (m[2] !== undefined) {
      const cmap = fontCmaps.get(currentFont);
      const decoded = decodeTJArray(m[2], cmap);
      if (decoded) out.push(decoded);
    } else if (m[3] !== undefined) {
      const s = unescapePdf(m[3]).replace(/[^\x20-\x7e\n\r\t]/g, " ").trim();
      if (s) out.push(s);
    }
  }
}

function decodeTJArray(inner: string, cmap: CMapTable | undefined): string | null {
  let decoded = "";
  const tokenRe = /<([0-9a-fA-F]*)>|\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(inner)) !== null) {
    if (m[1] !== undefined) {
      // Hex-encoded glyph IDs (1 byte per glyph for single-byte CMaps)
      for (let i = 0; i < m[1].length; i += 2) {
        const glyphId = parseInt(m[1].substring(i, i + 2), 16);
        if (cmap) decoded += cmap.get(glyphId) ?? "";
      }
    } else if (m[2] !== undefined) {
      decoded += unescapePdf(m[2]).replace(/[^\x20-\x7e\n\r\t]/g, " ");
    }
  }

  return decoded.trim() || null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Inflate zlib/deflate data using pako (pure JS, no DecompressionStream).
// Tries zlib-wrapped first, then raw DEFLATE, then strip-header variants.
function inflate(bytes: Uint8Array): Uint8Array | null {
  // Strategy 1: zlib-wrapped (RFC 1950, 0x78 header)
  try {
    const out = pakoInflate(bytes);
    if (out.length > 0) return out;
  } catch { /* try next */ }

  // Strategy 2: raw DEFLATE (RFC 1951)
  try {
    const out = inflateRaw(bytes);
    if (out.length > 0) return out;
  } catch { /* try next */ }

  // Strategy 3: strip 2-byte zlib header then raw DEFLATE
  if (bytes.length >= 6 && bytes[0] === 0x78) {
    try {
      const out = inflateRaw(bytes.slice(2));
      if (out.length > 0) return out;
    } catch { /* try next */ }

    // Strategy 4: also strip trailing Adler-32 checksum
    try {
      const out = inflateRaw(bytes.slice(2, bytes.length - 4));
      if (out.length > 0) return out;
    } catch { /* give up */ }
  }

  return null;
}

// Converts raw bytes to a JS string where each code point equals the byte value
// (true ISO 8859-1 semantics). Must NOT use TextDecoder("latin1") because the
// Web API treats "latin1" as windows-1252, remapping bytes 0x80–0x9F.
function bytesToString(bytes: Uint8Array): string {
  let out = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function unescapePdf(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}
