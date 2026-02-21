import JSZip from "jszip";
import { AppError } from "../errors/AppError";

const DOCUMENT_XML_PATH = "word/document.xml";

/**
 * Extract inner content and the last w:sectPr (section properties) from body XML.
 * Section properties define page margins, size, etc. We keep the original's.
 */
function extractBodyAndSectPr(bodyXml: string): { contentWithoutSectPr: string; sectPr: string } {
  // Last element in body is typically w:sectPr (section properties).
  // It can be <w:sectPr>...</w:sectPr> or <w:sectPr ... />.
  const sectPrStart = bodyXml.lastIndexOf("<w:sectPr");
  if (sectPrStart === -1) {
    return { contentWithoutSectPr: bodyXml.trim(), sectPr: "" };
  }
  let sectPrEnd: number;
  const selfClose = bodyXml.indexOf("/>", sectPrStart);
  const closeTag = bodyXml.indexOf("</w:sectPr>", sectPrStart);
  if (selfClose !== -1 && (closeTag === -1 || selfClose < closeTag)) {
    sectPrEnd = selfClose + 2;
  } else if (closeTag !== -1) {
    sectPrEnd = closeTag + "</w:sectPr>".length;
  } else {
    return { contentWithoutSectPr: bodyXml.trim(), sectPr: "" };
  }
  const sectPr = bodyXml.substring(sectPrStart, sectPrEnd);
  const contentWithoutSectPr = bodyXml.substring(0, sectPrStart).trim();
  return { contentWithoutSectPr, sectPr };
}

/**
 * Get body inner XML from document.xml string (between <w:body> and </w:body>).
 */
function getBodyInnerXml(documentXml: string): string | null {
  const bodyStart = documentXml.indexOf("<w:body");
  if (bodyStart === -1) return null;
  const bodyContentStart = documentXml.indexOf(">", bodyStart) + 1;
  const bodyEnd = documentXml.indexOf("</w:body>", bodyContentStart);
  if (bodyEnd === -1) return null;
  return documentXml.substring(bodyContentStart, bodyEnd);
}

/**
 * Replace body content in document.xml with new inner content.
 */
function replaceBodyContent(documentXml: string, newBodyInner: string): string {
  const bodyStart = documentXml.indexOf("<w:body");
  if (bodyStart === -1) return documentXml;
  const bodyContentStart = documentXml.indexOf(">", bodyStart) + 1;
  const bodyEnd = documentXml.indexOf("</w:body>", bodyContentStart);
  if (bodyEnd === -1) return documentXml;
  const before = documentXml.substring(0, bodyContentStart);
  const after = documentXml.substring(bodyEnd);
  return before + newBodyInner + after;
}

/**
 * Merge new DOCX body content into the original DOCX so that layout, styles, and
 * section properties (margins, page size) come from the original document.
 * - Original: provides styles, themes, settings, and section properties.
 * - New (from HTML): provides the main body content (paragraphs, tables).
 */
export async function mergeHtmlDocxIntoOriginal(
  originalDocxBuffer: Buffer,
  newDocxFromHtmlBuffer: Buffer
): Promise<Buffer> {
  let originalZip: JSZip;
  let newZip: JSZip;

  try {
    originalZip = await JSZip.loadAsync(originalDocxBuffer);
    newZip = await JSZip.loadAsync(newDocxFromHtmlBuffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError(
      502,
      "DOCX_MERGE_INVALID_ZIP",
      `Invalid DOCX (ZIP) structure: ${msg}`
    );
  }

  const originalDocumentFile = originalZip.file(DOCUMENT_XML_PATH);
  const newDocumentFile = newZip.file(DOCUMENT_XML_PATH);

  if (!originalDocumentFile || !newDocumentFile) {
    throw new AppError(
      502,
      "DOCX_MERGE_MISSING_DOCUMENT",
      "DOCX is missing word/document.xml"
    );
  }

  const originalDocumentXml = await originalDocumentFile.async("string");
  const newDocumentXml = await newDocumentFile.async("string");

  const originalBodyInner = getBodyInnerXml(originalDocumentXml);
  const newBodyInner = getBodyInnerXml(newDocumentXml);

  if (originalBodyInner === null || newBodyInner === null) {
    throw new AppError(
      502,
      "DOCX_MERGE_INVALID_BODY",
      "Could not find w:body in document.xml"
    );
  }

  const { sectPr: originalSectPr } = extractBodyAndSectPr(originalBodyInner);
  const { contentWithoutSectPr: newContent } = extractBodyAndSectPr(newBodyInner);

  const mergedBodyInner =
    newContent + (originalSectPr ? originalSectPr : "");

  const mergedDocumentXml = replaceBodyContent(originalDocumentXml, mergedBodyInner);

  originalZip.file(DOCUMENT_XML_PATH, mergedDocumentXml);

  const mergedBuffer = await originalZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  return Buffer.from(mergedBuffer);
}
