import Anthropic from "npm:@anthropic-ai/sdk@0.52.0";

export interface ExtractionResult {
  candidates: RawCandidate[];
  tokensIn: number;
  tokensOut: number;
  usdEstimate: number;
  partial: boolean; // true if input was truncated
}

export interface RawCandidate {
  title: string;
  due_at: string | null;
  kind: string | null;
  confidence: number;
  source_anchor: string | null;
}

/** ~100k chars ≈ 25k tokens — keeps prompt cost bounded */
const MAX_INPUT_CHARS = 100_000;

/** Pricing for claude-sonnet-4-6 (per token) */
const PRICE_IN_PER_M  = 3.00;   // $3.00 / 1M input tokens
const PRICE_OUT_PER_M = 15.00;  // $15.00 / 1M output tokens

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "extract_assignments",
  description:
    "Extract all graded assignments, exams, quizzes, projects, and other assessments " +
    "with their due dates from the provided syllabus text. " +
    "Return an empty array if no deadlines are found.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Name of the assignment or assessment",
            },
            due_at: {
              type: "string",
              description:
                "ISO 8601 datetime in the course timezone (e.g. 2025-09-15T23:59:00-07:00). " +
                "Null if no specific due date is mentioned.",
              nullable: true,
            },
            kind: {
              type: "string",
              description:
                "Category: homework, quiz, exam, project, paper, lab, or other. Null if unclear.",
              nullable: true,
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description:
                "How confident you are this is a real graded deadline (0 = guess, 1 = certain). " +
                "Use 0.9+ only when the date and assignment name are unambiguous.",
            },
            source_anchor: {
              type: "string",
              description:
                "Short verbatim quote (≤ 100 chars) from the syllabus that supports this item. " +
                "Null if no clear anchor exists.",
              nullable: true,
            },
          },
          required: ["title", "confidence"],
        },
      },
    },
    required: ["items"],
  },
};

export async function extractCandidates(
  syllabusText: string,
  courseTimezone: string = "America/Los_Angeles"
): Promise<ExtractionResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const partial = syllabusText.length > MAX_INPUT_CHARS;
  const inputText = partial
    ? syllabusText.slice(0, MAX_INPUT_CHARS)
    : syllabusText;

  const client = new Anthropic({ apiKey });

  const systemPrompt =
    `You are an academic assistant that reads course syllabi and extracts graded deadlines. ` +
    `The course timezone is ${courseTimezone}. ` +
    `When a due time is missing, assume 11:59 PM in the course timezone. ` +
    `Do not infer or fabricate dates that are not in the text. ` +
    `Only extract items that are assessments with grades or points.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: `Please extract all graded assignments and their due dates from this syllabus:\n\n${inputText}`,
      },
    ],
  });

  const tokensIn  = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;
  const usdEstimate =
    (tokensIn  / 1_000_000) * PRICE_IN_PER_M +
    (tokensOut / 1_000_000) * PRICE_OUT_PER_M;

  // Find the tool use block
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUseBlock) {
    // Model chose not to call the tool — no candidates found
    return { candidates: [], tokensIn, tokensOut, usdEstimate, partial };
  }

  const rawInput = toolUseBlock.input as { items?: unknown[] };
  const items = Array.isArray(rawInput?.items) ? rawInput.items : [];

  const candidates: RawCandidate[] = items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      title:         typeof item.title         === "string" ? item.title.trim()         : "Untitled",
      due_at:        typeof item.due_at        === "string" ? item.due_at               : null,
      kind:          typeof item.kind          === "string" ? item.kind.toLowerCase()   : null,
      confidence:    typeof item.confidence    === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      source_anchor: typeof item.source_anchor === "string" ? item.source_anchor.slice(0, 300) : null,
    }))
    .filter((c) => c.title.length > 0);

  return { candidates, tokensIn, tokensOut, usdEstimate, partial };
}
