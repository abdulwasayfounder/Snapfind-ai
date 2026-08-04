import { ScreenshotItem, SearchResultMatch, CategoryType } from "../types";
import { loadSearchHistory, saveSearchHistory } from "./storage";

export interface SearchFilters {
  type?: "all" | "screenshots_only" | "photos_only";
  isFavorite?: boolean;
  category?: CategoryType | "All" | string;
  folder?: string;
  dateRange?: {
    startDate?: string | number;
    endDate?: string | number;
  };
}

export interface SearchOptions {
  filters?: SearchFilters;
  limit?: number;
  minScore?: number;
}

export interface SearchSuggestion {
  text: string;
  type: "history" | "tag" | "category" | "intent";
  category?: CategoryType;
}

const SEARCH_HISTORY_KEY = "snapfind_search_history_v1";

/**
 * Tokenize text into lowercase alphanumeric words
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Parsed Natural Language Search Intent
 */
interface QueryIntent {
  rawQuery: string;
  tokens: string[];
  cleanText: string;
  targetApp?: string; // e.g. "whatsapp", "instagram"
  targetFormat?: string; // e.g. "pdf", "otp", "tracking number", "recipe", "bill"
  personName?: string; // e.g. "ali", "john"
  colorDescriptor?: string; // e.g. "blue", "red"
  timeFilter?: "last_month" | "last_week" | "yesterday" | "today" | "recent";
  isFavoriteIntent?: boolean;
  isScreenshotIntent?: boolean;
}

/**
 * Natural Language Query Parser
 */
function parseQueryIntent(rawQuery: string): QueryIntent {
  const lower = rawQuery.toLowerCase().trim();
  const tokens = tokenize(rawQuery);

  let targetApp: string | undefined;
  let targetFormat: string | undefined;
  let personName: string | undefined;
  let colorDescriptor: string | undefined;
  let timeFilter: QueryIntent["timeFilter"];
  let isFavoriteIntent = false;
  let isScreenshotIntent = false;

  // App detection
  const apps = ["whatsapp", "instagram", "twitter", "telegram", "slack", "gmail", "chrome", "youtube", "facebook", "linkedin"];
  for (const app of apps) {
    if (lower.includes(app)) {
      targetApp = app;
      break;
    }
  }

  // Person entity detection (e.g. "ali sent", "from john", "where ali")
  const personMatch = lower.match(/(?:sent by|from|where|with)\s+([a-z]+)/i) || lower.match(/\b(ali|john|sarah|mike|alex|david|emma)\b/i);
  if (personMatch) {
    personName = personMatch[1].toLowerCase();
  }

  // Document/Format/Pattern detection
  if (lower.includes("pdf")) targetFormat = "pdf";
  else if (lower.includes("otp") || lower.includes("verification code") || lower.includes("passcode")) targetFormat = "otp";
  else if (lower.includes("tracking") || lower.includes("tracking number") || lower.includes("fedex") || lower.includes("dhl") || lower.includes("ups") || lower.includes("courier")) targetFormat = "tracking_number";
  else if (lower.includes("receipt") || lower.includes("bill") || lower.includes("invoice") || lower.includes("payment")) targetFormat = "receipt";
  else if (lower.includes("recipe") || lower.includes("pizza") || lower.includes("dish") || lower.includes("food")) targetFormat = "recipe";
  else if (lower.includes("reel") || lower.includes("post") || lower.includes("story")) targetFormat = "reel";
  else if (lower.includes("passport") || lower.includes("visa") || lower.includes("id card") || lower.includes("license")) targetFormat = "passport";
  else if (lower.includes("car") || lower.includes("vehicle") || lower.includes("auto")) targetFormat = "car";

  // Color detection
  const colors = ["blue", "red", "green", "black", "white", "yellow", "purple", "dark"];
  for (const color of colors) {
    if (tokens.includes(color)) {
      colorDescriptor = color;
      break;
    }
  }

  // Time filter intent
  if (lower.includes("last month")) timeFilter = "last_month";
  else if (lower.includes("last week")) timeFilter = "last_week";
  else if (lower.includes("yesterday")) timeFilter = "yesterday";
  else if (lower.includes("today")) timeFilter = "today";
  else if (lower.includes("recent") || lower.includes("latest")) timeFilter = "recent";

  // Favorite / Screenshot intent
  if (lower.includes("favorite") || lower.includes("starred")) isFavoriteIntent = true;
  if (lower.includes("screenshot")) isScreenshotIntent = true;

  // Clean text by stripping conversational filler words
  const cleanText = lower
    .replace(/\b(show me|find my|get me|where|the|a|an|screenshot|image|photo|picture|containing|with|that has|sent|sent by|from|last month|last week|yesterday|today|recent)\b/gi, "")
    .trim();

  return {
    rawQuery,
    tokens,
    cleanText,
    targetApp,
    targetFormat,
    personName,
    colorDescriptor,
    timeFilter,
    isFavoriteIntent,
    isScreenshotIntent,
  };
}

/**
 * High-Performance Inverted Search Index (<100ms execution target)
 */
class InvertedSearchIndex {
  private index: Map<string, Set<string>> = new Map();
  private itemsMap: Map<string, ScreenshotItem> = new Map();
  private isBuilt: boolean = false;

  public buildIndex(items: ScreenshotItem[]): void {
    const startTime = performance.now();
    this.index.clear();
    this.itemsMap.clear();

    for (const item of items) {
      this.itemsMap.set(item.id, item);
      const textToTokenize = [
        item.title,
        item.summary,
        item.ai_description,
        item.fullText,
        item.ocr_text,
        item.category,
        item.fileName,
        item.file_name,
        item.folder,
        ...(item.tags || []),
        ...(item.keyEntities || []),
        ...(item.keywords || []),
      ]
        .filter(Boolean)
        .join(" ");

      const tokens = tokenize(textToTokenize);
      for (const token of tokens) {
        if (!this.index.has(token)) {
          this.index.set(token, new Set());
        }
        this.index.get(token)!.add(item.id);
      }
    }

    this.isBuilt = true;
    const duration = performance.now() - startTime;
    if (duration > 50) {
      console.log(`Inverted search index built in ${duration.toFixed(2)}ms for ${items.length} items.`);
    }
  }

  public updateItem(item: ScreenshotItem): void {
    this.itemsMap.set(item.id, item);
    // Indexing single item update
    const textToTokenize = [
      item.title,
      item.summary,
      item.fullText,
      item.category,
      item.fileName,
      item.folder,
      ...(item.tags || []),
      ...(item.keyEntities || []),
    ]
      .filter(Boolean)
      .join(" ");

    const tokens = tokenize(textToTokenize);
    for (const token of tokens) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token)!.add(item.id);
    }
  }

  public getCandidateIds(tokens: string[]): Set<string> {
    const candidateIds = new Set<string>();
    if (tokens.length === 0) return candidateIds;

    for (const token of tokens) {
      // Direct token match
      const ids = this.index.get(token);
      if (ids) {
        ids.forEach((id) => candidateIds.add(id));
      }

      // Partial prefix token match
      if (token.length >= 3) {
        for (const [keyToken, keyIds] of this.index.entries()) {
          if (keyToken.startsWith(token) || token.startsWith(keyToken)) {
            keyIds.forEach((id) => candidateIds.add(id));
          }
        }
      }
    }

    return candidateIds;
  }
}

/**
 * SnapFind AI Search Engine
 */
export class SnapFindSearchEngine {
  private invertedIndex: InvertedSearchIndex = new InvertedSearchIndex();
  private cachedItems: ScreenshotItem[] = [];

  /**
   * Initialize or update index with dataset
   */
  public updateIndex(items: ScreenshotItem[]): void {
    this.cachedItems = items;
    this.invertedIndex.buildIndex(items);
  }

  /**
   * Update or add a single item in the search index
   */
  public updateItem(item: ScreenshotItem): void {
    const existingIndex = this.cachedItems.findIndex((s) => s.id === item.id);
    if (existingIndex >= 0) {
      this.cachedItems[existingIndex] = item;
    } else {
      this.cachedItems.unshift(item);
    }
    this.invertedIndex.updateItem(item);
  }

  /**
   * Execute Hybrid Natural Language Search
   */
  public search(
    query: string,
    items: ScreenshotItem[],
    options: SearchOptions = {}
  ): SearchResultMatch[] {
    const startTime = performance.now();
    if (!query || !query.trim()) return [];

    // Ensure index is synchronized
    if (this.cachedItems !== items) {
      this.updateIndex(items);
    }

    const intent = parseQueryIntent(query);
    const filters = options.filters || {};

    // 1. Filter candidates by structural rules (Screenshots vs Photos, Category, Folder, Date Range)
    let candidates = items.filter((item) => {
      // Type Filter
      if (filters.type === "screenshots_only" && !item.isScreenshot && !item.is_screenshot) return false;
      if (filters.type === "photos_only" && (item.isScreenshot || item.is_screenshot)) return false;

      // Favorites Filter
      if (filters.isFavorite && !item.isFavorite && !item.favorite) return false;

      // Category Filter
      if (filters.category && filters.category !== "All") {
        if (item.category.toLowerCase() !== String(filters.category).toLowerCase()) return false;
      }

      // Folder Filter
      if (filters.folder && item.folder) {
        if (item.folder.toLowerCase() !== filters.folder.toLowerCase()) return false;
      }

      // Date Range Filter
      if (filters.dateRange) {
        const itemTime = new Date(item.createdAt || item.date_created || 0).getTime();
        if (filters.dateRange.startDate) {
          const startMs = new Date(filters.dateRange.startDate).getTime();
          if (itemTime < startMs) return false;
        }
        if (filters.dateRange.endDate) {
          const endMs = new Date(filters.dateRange.endDate).getTime();
          if (itemTime > endMs) return false;
        }
      }

      // Intent Temporal Filters
      if (intent.timeFilter) {
        const itemTime = new Date(item.createdAt || item.date_created || 0).getTime();
        const nowMs = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        if (intent.timeFilter === "today" && nowMs - itemTime > dayMs) return false;
        if (intent.timeFilter === "yesterday" && (nowMs - itemTime > 2 * dayMs || nowMs - itemTime < dayMs)) return false;
        if (intent.timeFilter === "last_week" && nowMs - itemTime > 7 * dayMs) return false;
        if (intent.timeFilter === "last_month" && nowMs - itemTime > 30 * dayMs) return false;
      }

      return true;
    });

    // 2. Score and Rank candidates
    const results: SearchResultMatch[] = candidates
      .map((item) => this.scoreItem(item, intent))
      .filter((res) => res.score >= (options.minScore ?? 0.15))
      .sort((a, b) => b.score - a.score);

    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(`Search execution took ${duration.toFixed(2)}ms (target <100ms)`);
    }

    // Save query to recent search history asynchronously
    if (results.length > 0) {
      this.saveSearchHistory(query, results.length, filters.category as CategoryType);
    }

    return options.limit ? results.slice(0, options.limit) : results;
  }

  /**
   * Scoring Algorithm incorporating Keyword, OCR, AI Semantic, Tags, Recency, Favorites
   */
  private scoreItem(item: ScreenshotItem, intent: QueryIntent): SearchResultMatch {
    let score = 0;
    const matchReasons: string[] = [];

    const titleLower = (item.title || "").toLowerCase();
    const summaryLower = (item.summary || item.ai_description || "").toLowerCase();
    const ocrLower = (item.fullText || item.ocr_text || "").toLowerCase();
    const fileNameLower = (item.fileName || item.file_name || "").toLowerCase();
    const folderLower = (item.folder || "").toLowerCase();
    const categoryLower = (item.category || "").toLowerCase();
    const tagsLower = (item.tags || []).map((t) => t.toLowerCase());
    const keywordsLower = [...(item.keyEntities || []), ...(item.keywords || [])].map((k) => k.toLowerCase());

    const isFav = Boolean(item.isFavorite || item.favorite);

    // Factor A: Intent-based Semantic Matching
    if (intent.targetApp) {
      if (
        titleLower.includes(intent.targetApp) ||
        summaryLower.includes(intent.targetApp) ||
        ocrLower.includes(intent.targetApp) ||
        categoryLower.includes(intent.targetApp) ||
        tagsLower.includes(intent.targetApp)
      ) {
        score += 0.40;
        matchReasons.push(`App match (${intent.targetApp})`);
      }
    }

    if (intent.targetFormat) {
      let formatMatched = false;
      if (intent.targetFormat === "pdf" && (ocrLower.includes("pdf") || titleLower.includes("pdf") || fileNameLower.includes("pdf"))) {
        formatMatched = true;
      } else if (intent.targetFormat === "otp") {
        // Detect OTP patterns (e.g. 4-6 digit codes, verification text)
        if (
          ocrLower.includes("otp") ||
          ocrLower.includes("verification code") ||
          ocrLower.includes("passcode") ||
          /\b\d{4,6}\b/.test(ocrLower)
        ) {
          formatMatched = true;
        }
      } else if (intent.targetFormat === "tracking_number") {
        if (
          ocrLower.includes("tracking") ||
          ocrLower.includes("waybill") ||
          ocrLower.includes("shipment") ||
          tagsLower.some((t) => t.includes("tracking")) ||
          /\b[A-Z0-9]{10,20}\b/.test(ocrLower)
        ) {
          formatMatched = true;
        }
      } else if (intent.targetFormat === "receipt" && (categoryLower.includes("bill") || tagsLower.includes("receipt") || ocrLower.includes("total") || ocrLower.includes("amount"))) {
        formatMatched = true;
      } else if (intent.targetFormat === "recipe" && (categoryLower.includes("recipe") || tagsLower.includes("food") || summaryLower.includes("recipe") || ocrLower.includes("ingredients"))) {
        formatMatched = true;
      } else if (intent.targetFormat === "passport" && (categoryLower.includes("passport") || ocrLower.includes("republic") || ocrLower.includes("passport"))) {
        formatMatched = true;
      } else if (intent.targetFormat === "car" && (tagsLower.some((t) => t.includes("car") || t.includes("auto") || t.includes("vehicle")) || summaryLower.includes("car"))) {
        formatMatched = true;
      }

      if (formatMatched) {
        score += 0.35;
        matchReasons.push(`Format match (${intent.targetFormat})`);
      }
    }

    if (intent.personName) {
      if (
        ocrLower.includes(intent.personName) ||
        summaryLower.includes(intent.personName) ||
        titleLower.includes(intent.personName)
      ) {
        score += 0.35;
        matchReasons.push(`Entity match (${intent.personName})`);
      }
    }

    if (intent.colorDescriptor) {
      if (
        tagsLower.includes(intent.colorDescriptor) ||
        summaryLower.includes(intent.colorDescriptor) ||
        titleLower.includes(intent.colorDescriptor)
      ) {
        score += 0.25;
        matchReasons.push(`Color tag (${intent.colorDescriptor})`);
      }
    }

    // Factor B: Exact & Partial Keyword Token Matching
    let tokenMatches = 0;
    const cleanTokens = intent.tokens.filter((t) => !["show", "me", "the", "a", "an", "image", "screenshot", "photo"].includes(t));
    const tokenCount = Math.max(1, cleanTokens.length);

    for (const token of cleanTokens) {
      let matchedToken = false;

      // Title & File Name
      if (titleLower.includes(token) || fileNameLower.includes(token)) {
        score += 0.25;
        matchedToken = true;
      }

      // Category & Folder
      if (categoryLower.includes(token) || folderLower.includes(token)) {
        score += 0.20;
        matchedToken = true;
      }

      // Tags & Keywords
      if (tagsLower.some((t) => t.includes(token)) || keywordsLower.some((k) => k.includes(token))) {
        score += 0.20;
        matchedToken = true;
      }

      // OCR Text
      if (ocrLower.includes(token)) {
        score += 0.18;
        matchedToken = true;
      }

      // AI Summary
      if (summaryLower.includes(token)) {
        score += 0.15;
        matchedToken = true;
      }

      if (matchedToken) tokenMatches++;
    }

    // Token Coverage Ratio Boost
    const tokenCoverage = tokenMatches / tokenCount;
    score += tokenCoverage * 0.30;

    // Factor C: Recency Boost (exponential decay over 60 days)
    const itemTimeMs = new Date(item.createdAt || item.date_created || 0).getTime();
    if (itemTimeMs > 0) {
      const daysOld = (Date.now() - itemTimeMs) / (1000 * 60 * 60 * 24);
      if (daysOld >= 0 && daysOld <= 60) {
        const recencyBoost = 0.15 * Math.exp(-daysOld / 20);
        score += recencyBoost;
      }
    }

    // Factor D: Favorites Boost
    if (isFav) {
      score += 0.15;
      matchReasons.push("Starred Favorite");
    }

    // Normalize final score [0.0 - 1.0]
    const finalScore = Math.min(1.0, Math.round(score * 100) / 100);

    const snippetText = item.summary || item.fullText?.slice(0, 140) || item.title;
    const primaryReason = matchReasons.length > 0 ? matchReasons.join(" • ") : "Matched keywords in OCR & metadata";

    return {
      id: item.id,
      score: finalScore,
      matchReason: primaryReason,
      highlightSnippet: snippetText,
    };
  }

  /**
   * Search Suggestions Engine (Recent Searches, Popular Tags, Categories)
   */
  public getSuggestions(queryPrefix: string, items: ScreenshotItem[] = []): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const prefixLower = queryPrefix.toLowerCase().trim();

    // 1. Recent Search History
    const history = this.getSearchHistory();
    const historyMatches = history
      .filter((h) => !prefixLower || h.query.toLowerCase().includes(prefixLower))
      .slice(0, 3)
      .map((h) => ({
        text: h.query,
        type: "history" as const,
        category: h.categoryFilter,
      }));
    suggestions.push(...historyMatches);

    // 2. Popular Tags
    const tagCounts = new Map<string, number>();
    items.forEach((item) => {
      (item.tags || []).forEach((tag) => {
        if (!prefixLower || tag.toLowerCase().includes(prefixLower)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    const popularTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => ({
        text: tag,
        type: "tag" as const,
      }));

    suggestions.push(...popularTags);

    // 3. Categories
    const categories: CategoryType[] = [
      "Passport",
      "Electricity Bill",
      "Recipe",
      "QR Code",
      "Admission & Certificate",
      "E-Commerce",
      "Ticket & Travel",
      "Receipt & Invoice",
      "Financial",
      "Notes & Ideas",
    ];

    const categoryMatches = categories
      .filter((cat) => !prefixLower || cat.toLowerCase().includes(prefixLower))
      .slice(0, 3)
      .map((cat) => ({
        text: cat,
        type: "category" as const,
        category: cat,
      }));

    suggestions.push(...categoryMatches);

    // Deduplicate suggestions by text
    const uniqueMap = new Map<string, SearchSuggestion>();
    suggestions.forEach((s) => {
      if (!uniqueMap.has(s.text.toLowerCase())) {
        uniqueMap.set(s.text.toLowerCase(), s);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 7);
  }

  /**
   * Save search to persistent history
   */
  private saveSearchHistory(query: string, resultCount: number, categoryFilter?: CategoryType): void {
    if (!query || query.trim().length < 2) return;
    try {
      const history = this.getSearchHistory();
      const filtered = history.filter((h) => h.query.toLowerCase() !== query.toLowerCase().trim());
      filtered.unshift({
        id: `sh_${Date.now()}`,
        query: query.trim(),
        timestamp: new Date().toISOString(),
        resultCount,
        categoryFilter,
      });
      saveSearchHistory(filtered.slice(0, 20));
    } catch (err) {
      console.warn("Failed to save search history:", err);
    }
  }

  /**
   * Get persistent search history
   */
  public getSearchHistory(): Array<{
    id: string;
    query: string;
    timestamp: string;
    resultCount: number;
    categoryFilter?: CategoryType;
  }> {
    return loadSearchHistory();
  }

  /**
   * Clear search history
   */
  public clearSearchHistory(): void {
    try {
      saveSearchHistory([]);
    } catch (err) {
      console.warn("Failed to clear search history:", err);
    }
  }
}

export const searchEngine = new SnapFindSearchEngine();
