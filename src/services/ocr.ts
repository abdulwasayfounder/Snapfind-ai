import { createWorker } from "tesseract.js";

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  lines: string[];
  words: string[];
  provider: string;
}

/**
 * Free client-side OCR text extraction using Tesseract.js
 */
export async function extractTextClientOCR(
  imageSource: string | File | Blob,
  onProgress?: (progress: number, status: string) => void
): Promise<OCRResult> {
  try {
    if (onProgress) onProgress(10, "Initializing Tesseract OCR Engine...");

    const worker = await createWorker("eng");
    
    if (onProgress) onProgress(40, "Scanning image and recognizing text...");

    const ret = await worker.recognize(imageSource);
    
    if (onProgress) onProgress(90, "Finalizing extracted text...");

    const text = ret.data.text || "";
    const confidence = ret.data.confidence || 0;
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.trim().length > 0);

    await worker.terminate();

    return {
      success: true,
      text: text.trim(),
      confidence: Math.round(confidence),
      lines,
      words,
      provider: "Tesseract.js (Free Open Source)",
    };
  } catch (err: any) {
    console.error("Client OCR error:", err);
    return {
      success: false,
      text: "",
      confidence: 0,
      lines: [],
      words: [],
      provider: "Tesseract.js",
    };
  }
}

/**
 * Extract OCR text via Server API (combines free OCR & Vision model)
 */
export async function extractTextServerOCR(
  base64Data: string,
  fileName: string = "screenshot.png"
): Promise<OCRResult> {
  try {
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Data, fileName }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      text: data.ocrText || "",
      confidence: data.confidence || 95,
      lines: (data.ocrText || "").split("\n").filter((l: string) => l.trim()),
      words: (data.ocrText || "").split(/\s+/).filter((w: string) => w.trim()),
      provider: data.provider || "Free Server Vision OCR",
    };
  } catch (error: any) {
    console.warn("Server OCR error, falling back to Tesseract client OCR:", error);
    return extractTextClientOCR(base64Data);
  }
}
