import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/env";
import { AppError } from "../errors/AppError";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!config.gemini.apiKey) {
    throw new AppError(
      503,
      "GEMINI_NOT_CONFIGURED",
      "GEMINI_API_KEY is not set. Set it in .env for PDF→HTML conversion."
    );
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

/** Fallback models if primary returns 404 or 429 (e.g. free-tier limit 0). One request per model only—no retries on 429 to avoid "too many requests". */
const MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
];

function getModelsToTry(): string[] {
  const configured = config.gemini.model;
  const list = [configured, ...MODEL_FALLBACKS.filter((m) => m !== configured)];
  return [...new Set(list)];
}

/**
 * Convert PDF buffer to HTML using Gemini.
 * One upload = one call per model until one succeeds. On 429 we do NOT retry the same model (that would cause multiple requests and worsen 429).
 */
export async function pdfToHtml(pdfBuffer: Buffer): Promise<string> {
  const client = getClient();
  const pdfBase64 = pdfBuffer.toString("base64");
  const parts = [
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    },
    {
      text: `You are a document converter. Convert the attached PDF document to clean, well-structured HTML.
Rules:
- Preserve headings (h1, h2, h3), paragraphs (p), lists (ul, ol, li), and tables (table, tr, td, th).
- Use semantic HTML. Do not include <html>, <head>, or <body> tags—only the inner content (e.g. start with a div or the first heading).
- Preserve order and structure. Use simple CSS where helpful (e.g. table borders) but keep markup minimal.
- Do not add commentary or explanations—output only the HTML.`,
    },
  ];

  const modelsToTry = getModelsToTry();
  let lastError: unknown;

  for (const modelId of modelsToTry) {
    try {
      const model = client.getGenerativeModel({ model: modelId });
      const result = await model.generateContent(parts);
      const response = result.response;
      if (!response.text) {
        throw new AppError(
          502,
          "GEMINI_NO_RESPONSE",
          "Gemini did not return HTML content."
        );
      }
      let html = response.text().trim();
      if (html.startsWith("```html")) html = html.slice(7);
      if (html.startsWith("```")) html = html.slice(3);
      if (html.endsWith("```")) html = html.slice(0, -3);
      return html.trim();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const msg = (err as Error)?.message ?? "";
      const is429 = status === 429 || msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota");
      const is404 = status === 404 || msg.includes("404") || msg.includes("not found");
      // Do NOT retry same model on 429: quota/limit is per model, retrying would send more requests and trigger more 429s.
      if (is404 || is429) continue; // try next model (one request per model only)
      throw err;
    }
  }

  throw new AppError(
    503,
    "GEMINI_UNAVAILABLE",
    "Gemini API failed for all tried models (404 or quota exceeded). Try setting GEMINI_MODEL in .env to a model with free-tier quota. See https://aistudio.google.com/usage"
  );
}
