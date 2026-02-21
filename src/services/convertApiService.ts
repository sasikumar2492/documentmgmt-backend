import { config } from "../config/env";
import { AppError } from "../errors/AppError";

const BASE = config.convertApi.baseUrl.replace(/\/$/, "");

function getSecret(): string {
  const secret = config.convertApi.secret;
  if (!secret) {
    throw new AppError(
      503,
      "CONVERT_API_NOT_CONFIGURED",
      "CONVERT_API_SECRET is not set. Set it in .env for conversions."
    );
  }
  return secret;
}

/**
 * Convert .doc/.docx file to PDF using ConvertAPI (JSON API with base64).
 */
export async function docToPdf(
  fileBuffer: Buffer,
  extension: "doc" | "docx"
): Promise<Buffer> {
  const secret = getSecret();
  const endpoint =
    extension === "docx"
      ? `${BASE}/convert/docx/to/pdf`
      : `${BASE}/convert/doc/to/pdf`;

  const body = {
    Parameters: [
      {
        Name: "File",
        FileValue: {
          Name: `document.${extension}`,
          Data: fileBuffer.toString("base64"),
        },
      },
    ],
  };

  const res = await fetch(`${endpoint}?auth=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(
      502,
      "CONVERT_API_DOC_TO_PDF_FAILED",
      `ConvertAPI doc→PDF failed: ${res.status} ${text}`
    );
  }

  const data = (await res.json()) as { Files?: Array<{ FileData?: string }> };
  const files = data?.Files;
  if (!files?.length || !files[0].FileData) {
    throw new AppError(
      502,
      "CONVERT_API_INVALID_RESPONSE",
      "ConvertAPI did not return file data"
    );
  }

  return Buffer.from(files[0].FileData, "base64");
}

/**
 * Convert HTML string to .docx using ConvertAPI (JSON API with base64).
 * Throws if CONVERT_API_SECRET is not set.
 */
export async function htmlToDocx(htmlContent: string): Promise<Buffer> {
  getSecret();
  return htmlToDocxViaConvertAPI(htmlContent);
}

/**
 * Convert HTML to .docx via ConvertAPI. Internal use.
 */
async function htmlToDocxViaConvertAPI(htmlContent: string): Promise<Buffer> {
  const secret = config.convertApi.secret!;
  const endpoint = `${BASE}/convert/html/to/docx`;

  const body = {
    Parameters: [
      {
        Name: "File",
        FileValue: {
          Name: "content.html",
          Data: Buffer.from(htmlContent, "utf-8").toString("base64"),
        },
      },
    ],
  };

  const res = await fetch(`${endpoint}?auth=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(
      502,
      "CONVERT_API_HTML_TO_DOCX_FAILED",
      `ConvertAPI HTML→docx failed: ${res.status} ${text}`
    );
  }

  const data = (await res.json()) as { Files?: Array<{ FileData?: string }> };
  const files = data?.Files;
  if (!files?.length || !files[0].FileData) {
    throw new AppError(
      502,
      "CONVERT_API_INVALID_RESPONSE",
      "ConvertAPI did not return file data for HTML→docx"
    );
  }

  return Buffer.from(files[0].FileData, "base64");
}

/**
 * Convert HTML to .docx using local library (html-to-docx). Used when ConvertAPI is unavailable or fails.
 */
async function htmlToDocxLocal(htmlContent: string): Promise<Buffer> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const HTMLtoDOCX = require("html-to-docx");
    const result = await HTMLtoDOCX(htmlContent, null, {}, null);
    return Buffer.isBuffer(result) ? result : Buffer.from(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Cannot find module") || msg.includes("html-to-docx")) {
      throw new AppError(
        503,
        "HTML_TO_DOCX_UNAVAILABLE",
        "HTML→DOCX conversion failed. Set CONVERT_API_SECRET in .env or run: npm install html-to-docx"
      );
    }
    throw new AppError(
      502,
      "HTML_TO_DOCX_FAILED",
      `Local HTML→docx conversion failed: ${msg}`
    );
  }
}

/**
 * Convert HTML to .docx for Save flow: try ConvertAPI first, then local library. Ensures Save works with or without ConvertAPI.
 */
export async function htmlToDocxWithFallback(htmlContent: string): Promise<Buffer> {
  if (config.convertApi.secret) {
    try {
      return await htmlToDocxViaConvertAPI(htmlContent);
    } catch {
      // Fallback to local conversion (e.g. ConvertAPI rate limit or network error)
    }
  }
  return htmlToDocxLocal(htmlContent);
}
