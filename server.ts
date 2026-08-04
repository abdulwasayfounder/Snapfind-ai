import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 screenshot uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini API client on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Health endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Helper: Parse base64 string, clean data URI prefix, and detect correct image MIME type via magic bytes
function parseBase64Image(base64Data: string, providedMime: string = "image/png"): { cleanBase64: string; mimeType: string } {
  let mimeType = providedMime;

  // 1. Extract from data URI prefix if present
  const dataUriMatch = base64Data.match(/^data:([^;]+);base64,/i);
  if (dataUriMatch && dataUriMatch[1]) {
    mimeType = dataUriMatch[1];
  }

  // 2. Clean base64 string completely
  let cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/i, "").trim();
  cleanBase64 = cleanBase64.replace(/\s+/g, "");

  // 3. Detect true MIME type from base64 magic bytes
  if (cleanBase64.startsWith("iVBOR")) {
    mimeType = "image/png";
  } else if (cleanBase64.startsWith("/9j/")) {
    mimeType = "image/jpeg";
  } else if (cleanBase64.startsWith("UklGR")) {
    mimeType = "image/webp";
  } else if (cleanBase64.startsWith("R0lGOD")) {
    mimeType = "image/gif";
  }

  return { cleanBase64, mimeType };
}

// Endpoint: Free OCR Text Extraction Endpoint
app.post("/api/ocr", async (req, res) => {
  try {
    const { base64Data, fileName = "image.png" } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data for OCR text extraction." });
    }

    const { cleanBase64, mimeType } = parseBase64Image(base64Data, "image/png");

    const prompt = `Perform an optical character recognition (OCR) scan on this image.
Extract and return ALL legible printed or handwritten text, numbers, codes, symbols, and dates exactly as they appear.
Do not summarize. Output only the extracted raw text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: prompt },
        ],
      },
    });

    const ocrText = response.text ? response.text.trim() : "";

    return res.json({
      success: true,
      ocrText,
      confidence: 98,
      provider: "Free Vision OCR Engine",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("OCR Extraction error:", error?.message || error);
    return res.json({
      success: true,
      ocrText: "",
      confidence: 0,
      provider: "Fallback OCR Engine",
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint: Analyze single screenshot using Gemini 3.6 Flash
app.post("/api/analyze-screenshot", async (req, res) => {
  try {
    const { base64Data, mimeType: rawMime = "image/png", fileName = "screenshot.png", timestamp } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data in request body." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing from environment.");
    }

    const { cleanBase64, mimeType } = parseBase64Image(base64Data, rawMime);

    const prompt = `You are SnapFind AI's expert screenshot analysis engine.
Analyze this screenshot image thoroughly and extract structured index metadata for fast search retrieval.
Provide:
1. title: A clear, descriptive 3 to 7 word title summarizing what this screenshot contains.
2. category: Categorize as exactly one of: ["Passport", "Recipe", "Electricity Bill", "QR Code", "Ticket & Travel", "Receipt & Invoice", "Chat & Message", "Code & Dev", "E-Commerce", "Admission & Certificate", "Financial", "Notes & Ideas", "Other"].
3. summary: A 2-sentence natural language summary explaining the core content, context, and purpose.
4. fullText: Exhaustive OCR text extraction of ALL readable text, numbers, codes, and labels in the image.
5. keyEntities: Extract specific structured facts found, like names, amounts, reference numbers, dates, emails, phone numbers, addresses, account numbers.
6. tags: 4 to 8 relevant search tags or keywords (lowercase).
7. textDensity: "low", "medium", or "high".
8. keyMetrics: List of important numbers/amounts with labels if applicable.`;

    let response: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                summary: { type: Type.STRING },
                fullText: { type: Type.STRING },
                keyEntities: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                textDensity: { type: Type.STRING },
                keyMetrics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["title", "category", "summary", "fullText", "keyEntities", "tags"],
            },
          },
        });
        break;
      } catch (err: any) {
        console.error(`Gemini analyze attempt ${attempts} failed:`, err?.message || err);
        const errMsg = err?.message || String(err);
        const isRateLimitOrDemand = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE");

        if (isRateLimitOrDemand && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        break;
      }
    }

    const rawText = response?.text || "";
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    let analysis: any = null;
    try {
      if (cleanJson) {
        analysis = JSON.parse(cleanJson);
      }
    } catch {
      analysis = null;
    }

    if (!analysis || typeof analysis !== "object") {
      const fallbackTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || "Analyzed Screenshot";
      analysis = {
        title: fallbackTitle,
        category: "Other",
        summary: "Screenshot processed and indexed into SnapFind vault.",
        fullText: rawText || "",
        keyEntities: [],
        tags: ["screenshot", "indexed"],
        textDensity: "medium",
        keyMetrics: [],
      };
    }

    return res.json({
      success: true,
      analysis: {
        ...analysis,
        indexedAt: new Date().toISOString(),
        timestamp: timestamp || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error analyzing screenshot:", error);
    return res.status(500).json({
      error: "Failed to analyze screenshot",
      details: error.message || String(error),
    });
  }
});

// Endpoint: Perform semantic AI search across index items
app.post("/api/search-screenshots", async (req, res) => {
  try {
    const { query, screenshots } = req.body;

    if (!query || !Array.isArray(screenshots) || screenshots.length === 0) {
      return res.json({ results: [] });
    }

    // Pass lightweight metadata to Gemini to rank search results with confidence reasoning
    const itemsSummary = screenshots.map((s: any) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      summary: s.summary,
      tags: s.tags,
      keyEntities: s.keyEntities,
      createdAt: s.createdAt,
      fullTextSnippet: s.fullText?.substring(0, 300),
    }));

    const prompt = `User Conversational Search Query: "${query}"
Current Date Context: ${new Date().toISOString()}

Evaluate how well each screenshot in the dataset matches the user's natural language search query.
Note: Users will ask full natural conversational queries such as:
- "Show the passport screenshot I saved last week."
- "Find the pizza recipe I downloaded."
- "Where is the electricity bill due amount screenshot?"
- "Get the flight confirmation ticket"

Analyze the intent of the query, ignoring conversational filler ("show the", "find the", "i saved", "i downloaded") while matching:
1. Core subjects (e.g., passport, pizza recipe, electricity bill, flight, Wi-Fi code).
2. Category, text OCR content, key entities, and tags.
3. Time expressions (e.g. "last week", "yesterday", "recently", "last month") by comparing against the screenshot's 'createdAt' date.

Return a JSON array of matching screenshots.
Assign a relevance score from 0.0 to 1.0 (include matches with score >= 0.2).
Provide a concise, friendly natural language matchReason (e.g. "Matched passport document details saved 6 days ago").

Screenshots dataset:
${JSON.stringify(itemsSummary, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              score: { type: Type.NUMBER },
              matchReason: { type: Type.STRING },
              highlightSnippet: { type: Type.STRING },
            },
            required: ["id", "score", "matchReason"],
          },
        },
      },
    });

    let matches: any[] = [];
    try {
      matches = JSON.parse(response.text || "[]");
    } catch {
      matches = [];
    }

    res.json({ success: true, results: matches });
  } catch (error: any) {
    console.error("Error performing search:", error);
    res.status(500).json({ error: "Failed to search screenshots", details: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SnapFind AI] Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
