import React, { useState, useRef } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  UploadCloud,
  FileImage,
  FolderPlus,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Layers,
  Zap,
} from "lucide-react";
import { ScreenshotItem } from "../types";
import { analyzeScreenshotImage } from "../services/api";
import { INITIAL_SAMPLE_SCREENSHOTS } from "../data/sampleScreenshots";
import { searchEngine } from "../services/searchEngine";
import { processingQueue } from "../services/processingQueue";

interface BatchImporterProps {
  onAddScreenshots: (newItems: ScreenshotItem[]) => void;
  isDark: boolean;
  onFinishImport: () => void;
  addToast: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

interface ProcessingQueueItem {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "success" | "error";
  errorMessage?: string;
  previewUrl: string;
  resultTitle?: string;
}

export const BatchImporter: React.FC<BatchImporterProps> = ({
  onAddScreenshots,
  isDark,
  onFinishImport,
  addToast,
}) => {
  const [queue, setQueue] = useState<ProcessingQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Create queue items
    const newQueueItems: ProcessingQueueItem[] = files.map((f, idx) => ({
      id: `queue-${Date.now()}-${idx}`,
      fileName: f.name,
      status: "pending",
      previewUrl: URL.createObjectURL(f),
    }));

    setQueue((prev) => [...prev, ...newQueueItems]);
    setIsProcessing(true);

    const createdScreenshots: ScreenshotItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const qItem = newQueueItems[i];

      // Update item status to processing
      setQueue((prev) =>
        prev.map((item) => (item.id === qItem.id ? { ...item, status: "processing" } : item))
      );

      try {
        const base64 = await fileToBase64(file);
        const res = await analyzeScreenshotImage(base64, file.name, file.type || "image/png");

        if (res.success && res.analysis) {
          const newItem: ScreenshotItem = {
            id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: res.analysis.title || file.name.replace(/\.[^/.]+$/, ""),
            category: res.analysis.category || "Other",
            summary: res.analysis.summary || "Imported screenshot.",
            fullText: res.analysis.fullText || "",
            keyEntities: res.analysis.keyEntities || [],
            tags: res.analysis.tags || ["screenshot"],
            textDensity: res.analysis.textDensity || "medium",
            keyMetrics: res.analysis.keyMetrics || [],
            imageUrl: base64,
            createdAt: new Date().toISOString(),
            indexedAt: new Date().toISOString(),
            fileSizeKB: Math.round(file.size / 1024),
          };

          createdScreenshots.push(newItem);

          setQueue((prev) =>
            prev.map((item) =>
              item.id === qItem.id
                ? { ...item, status: "success", resultTitle: newItem.title }
                : item
            )
          );
        } else {
          throw new Error(res.error || "Failed to analyze screenshot");
        }
      } catch (error: any) {
        console.error("Error processing file:", file.name, error);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === qItem.id
              ? { ...item, status: "error", errorMessage: error.message }
              : item
          )
        );
      }
    }

    if (createdScreenshots.length > 0) {
      onAddScreenshots(createdScreenshots);
      // Immediately register in search engine index and processing queue
      createdScreenshots.forEach((item) => {
        searchEngine.updateItem(item);
        if (!processingQueue.isDuplicate(item.id, item.imageUrl)) {
          processingQueue.enqueue({
            id: item.id,
            imageUri: item.imageUrl,
            fileName: item.fileName || "screenshot.png",
            folder: item.folder,
            base64Data: item.imageUrl,
          });
        }
      });
      addToast({
        title: `Indexed ${createdScreenshots.length} Screenshot${createdScreenshots.length > 1 ? "s" : ""}`,
        description: "Gemini Vision OCR extraction complete & search index updated.",
        type: "success",
      });
    }

    setIsProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = (Array.from(e.dataTransfer.files) as File[]).filter((f) => f.type.startsWith("image/"));
      processFiles(fileList);
    }
  };

  const handleImportSamplePack = () => {
    onAddScreenshots(INITIAL_SAMPLE_SCREENSHOTS);
    addToast({
      title: "Sample Screenshots Pack Loaded",
      description: "Added 6 sample screenshots (Passport, Bill, Recipe, QR Code, Admission, MacBook).",
      type: "success",
    });
    onFinishImport();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Importer Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SnapFindLogo className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20 bg-slate-900 shrink-0" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Import & Auto-Index Screenshots</h2>
            <p className="text-xs opacity-70 mt-0.5">
              Drop screenshots or load sample files. Gemini 3.6 Flash automatically extracts text, documents, & entities.
            </p>
          </div>
        </div>

        <button
          onClick={handleImportSamplePack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load 6 Sample Screenshots</span>
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
          isDark
            ? "bg-slate-900/40 border-slate-750 hover:border-blue-500 hover:bg-slate-900/70"
            : "bg-slate-50 border-slate-300 hover:border-blue-400 hover:bg-slate-100"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              processFiles(Array.from(e.target.files));
            }
          }}
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <p className="text-sm font-semibold">Click to upload or drag & drop screenshots</p>
          <p className="text-xs opacity-60 mt-1">Supports PNG, JPG, WEBP, HEIC, SVG (Max 50MB per batch)</p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-medium text-indigo-400 pt-2">
          <Zap className="w-3.5 h-3.5" />
          <span>Automatic Screenshot Detection & Vision OCR</span>
        </div>
      </div>

      {/* Processing Queue Status */}
      {queue.length > 0 && (
        <div
          className={`p-5 rounded-3xl border space-y-4 ${
            isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Processing Queue ({queue.filter((q) => q.status === "success").length}/{queue.length})
            </h3>

            {isProcessing && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Gemini OCR Analysis in progress...
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  isDark ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={item.previewUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <p className="font-semibold">{item.resultTitle || item.fileName}</p>
                    <p className="text-[10px] opacity-60">Status: {item.status}</p>
                  </div>
                </div>

                <div>
                  {item.status === "pending" && <span className="text-slate-400">Waiting...</span>}
                  {item.status === "processing" && (
                    <span className="flex items-center gap-1 text-blue-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                    </span>
                  )}
                  {item.status === "success" && (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle className="w-4 h-4" /> Indexed
                    </span>
                  )}
                  {item.status === "error" && (
                    <span className="flex items-center gap-1 text-rose-400 font-semibold">
                      <AlertCircle className="w-4 h-4" /> Error
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isProcessing && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onFinishImport}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
              >
                View Indexed Screenshots in Gallery
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
