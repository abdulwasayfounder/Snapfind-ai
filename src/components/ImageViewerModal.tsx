import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  Star,
  Trash2,
  Sparkles,
  FileText,
  Tag,
  Calendar,
  Layers,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { ScreenshotItem } from "../types";

interface ImageViewerModalProps {
  item: ScreenshotItem | null;
  onClose: () => void;
  isDark: boolean;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onReindex?: (id: string) => void;
  onSearchTag: (tag: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  item,
  onClose,
  isDark,
  onToggleFavorite,
  onDelete,
  onReindex,
  onSearchTag,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [ocrFilter, setOcrFilter] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isReindexing, setIsReindexing] = useState(false);

  if (!item) return null;

  const handleCopyOCR = () => {
    navigator.clipboard.writeText(item.fullText || item.summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = item.imageUrl;
    a.download = `${item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_screenshot.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formattedDate = new Date(item.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const ocrLines = (item.fullText || "").split("\n");
  const filteredOcrLines = ocrFilter
    ? ocrLines.filter((line) => line.toLowerCase().includes(ocrFilter.toLowerCase()))
    : ocrLines;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-6xl h-[90vh] rounded-3xl border flex flex-col lg:flex-row overflow-hidden shadow-2xl ${
          isDark
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Close button top right */}
        <button
          onClick={onClose}
          id="close-lightbox-btn"
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 backdrop-blur-md transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: High-Res Image View & Controls */}
        <div className="flex-1 bg-slate-950 flex flex-col relative min-h-[350px] lg:min-h-full">
          {/* Zoom controls */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="p-1.5 hover:bg-slate-800 rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-medium">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1.5 hover:bg-slate-800 rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-[10px] font-bold"
              title="Reset Zoom"
            >
              RESET
            </button>
          </div>

          {/* Image Display */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            <div
              className="transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
              />
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="p-4 border-t border-slate-850 bg-slate-900/60 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {formattedDate}
              </span>
              <span>•</span>
              <span>{item.fileSizeKB || 350} KB</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium transition-all ${
                  item.isFavorite
                    ? "bg-amber-500 text-white border-amber-400"
                    : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-current" : ""}`} />
                <span>{item.isFavorite ? "Favorited" : "Favorite"}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              <button
                onClick={() => onDelete(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Extracted Metadata & OCR Inspector */}
        <div className="w-full lg:w-[480px] flex flex-col h-full overflow-y-auto p-6 space-y-5 border-t lg:border-t-0 lg:border-l border-slate-800">
          {/* Header & Title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {item.category}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Indexed by Gemini
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">{item.title}</h2>
          </div>

          {/* AI Summary Card */}
          <div
            className={`p-4 rounded-2xl border space-y-2 ${
              isDark
                ? "bg-slate-900/80 border-slate-800 text-slate-200"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-blue-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Content Summary
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{item.summary}</p>
          </div>

          {/* Extracted Key Entities */}
          {item.keyEntities && item.keyEntities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted Key Entities
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {item.keyEntities.map((entity, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      isDark
                        ? "bg-slate-900 border-slate-800 text-blue-300"
                        : "bg-blue-50/50 border-blue-100 text-blue-900"
                    }`}
                  >
                    <span>{entity}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(entity)}
                      className="p-1 text-slate-400 hover:text-blue-400"
                      title="Copy entity"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Search Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      onSearchTag(tag);
                      onClose();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-blue-500"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:border-blue-400"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exhaustive OCR Text Inspector */}
          <div className="flex-1 flex flex-col space-y-2 min-h-[220px]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Raw OCR Text
              </h3>
              <button
                onClick={handleCopyOCR}
                className="flex items-center gap-1 text-xs text-blue-400 hover:underline font-medium"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied All</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All Text</span>
                  </>
                )}
              </button>
            </div>

            {/* OCR Text Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter OCR text..."
                value={ocrFilter}
                onChange={(e) => setOcrFilter(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500"
                    : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>

            {/* OCR Text View */}
            <div
              className={`flex-1 p-3.5 rounded-2xl border font-mono text-xs overflow-y-auto max-h-[220px] whitespace-pre-wrap leading-relaxed select-text ${
                isDark
                  ? "bg-slate-900/60 border-slate-800 text-slate-300"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              {filteredOcrLines.length > 0 ? (
                filteredOcrLines.join("\n")
              ) : (
                <span className="text-slate-500 italic">No matching OCR text lines found.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
