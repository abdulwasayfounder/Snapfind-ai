import React, { useState, useRef, useEffect } from "react";
import {
  Maximize2,
  Copy,
  Star,
  Trash2,
  Sparkles,
  Calendar,
  Check,
  Image as ImageIcon,
  FolderInput,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem, SearchResultMatch, CategoryType } from "../types";
import { FALLBACK_IMAGE_PLACEHOLDER, markImageFailed } from "../services/imageCache";

const ALL_CATEGORIES: CategoryType[] = [
  "Passport",
  "Electricity Bill",
  "Recipe",
  "QR Code",
  "Ticket & Travel",
  "Receipt & Invoice",
  "Notes & Ideas",
  "Chat & Message",
  "Code & Dev",
  "E-Commerce",
  "Admission & Certificate",
  "Financial",
  "Other",
];

interface ScreenshotCardProps {
  item: ScreenshotItem;
  matchInfo?: SearchResultMatch;
  isDark: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onSelect: (item: ScreenshotItem) => void;
  onToggleSelect?: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onMoveCategory?: (id: string, newCategory: CategoryType) => void;
  onDelete: (id: string) => void;
  onCopyText: (text: string) => void;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  item,
  matchInfo,
  isDark,
  isSelected = false,
  isSelectionMode = false,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  onMoveCategory,
  onDelete,
  onCopyText,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.imageUrl || FALLBACK_IMAGE_PLACEHOLDER);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Close move dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    };
    if (showMoveMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoveMenu]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyText(item.fullText || item.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageError = () => {
    markImageFailed(item.imageUrl);
    setImgSrc(FALLBACK_IMAGE_PLACEHOLDER);
    setImgLoaded(true);
  };

  const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleCardClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(item.id);
    } else {
      onSelect(item);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleCardClick}
      className={`group relative rounded-3xl border overflow-hidden cursor-pointer transition-all duration-300 ${
        isSelected
          ? isDark
            ? "bg-slate-900 border-blue-500 ring-2 ring-blue-500/50 shadow-xl shadow-blue-500/10"
            : "bg-blue-50/30 border-blue-500 ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10"
          : isDark
          ? "bg-slate-900/90 border-slate-800/80 text-slate-100 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-black/60 shadow-black/40"
          : "bg-white border-slate-200/90 text-slate-900 hover:border-blue-300/80 hover:shadow-2xl hover:shadow-slate-300/60 shadow-slate-200/60"
      }`}
    >
      {/* Top Image Thumbnail Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950/90">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-slate-800/60 animate-pulse flex items-center justify-center text-slate-500">
            <ImageIcon className="w-9 h-9 opacity-40 animate-bounce" />
          </div>
        )}

        <img
          src={imgSrc}
          alt={item.title}
          onLoad={() => setImgLoaded(true)}
          onError={handleImageError}
          className={`w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110 ${
            imgLoaded ? "opacity-90 group-hover:opacity-100" : "opacity-0"
          }`}
          loading="lazy"
        />

        {/* Selection Checkbox (Top Left) */}
        <div className="absolute top-3 left-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(item.id);
            }}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-md backdrop-blur-md border ${
              isSelected
                ? "bg-blue-600 border-blue-400 text-white scale-105"
                : isSelectionMode
                ? "bg-slate-950/70 border-slate-400/50 text-slate-300 hover:bg-blue-600/80 hover:border-blue-400"
                : "opacity-0 group-hover:opacity-100 bg-slate-950/70 border-white/20 text-slate-300 hover:bg-blue-600/80 hover:border-blue-400"
            }`}
            title={isSelected ? "Deselect item" : "Select item"}
          >
            {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-2.5 h-2.5 rounded-sm border border-slate-300" />}
          </button>
        </div>

        {/* Category & Match Score Badges (Top Right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none z-10">
          {/* Interactive Category Badge with Move Dropdown Trigger */}
          <div className="relative pointer-events-auto" ref={moveMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(!showMoveMenu);
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-950/80 backdrop-blur-md text-slate-200 border border-white/10 shadow-sm flex items-center gap-1 hover:bg-slate-900 hover:border-blue-400/50 transition-all"
              title="Click to move category"
            >
              <span>{item.category}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Category Selector Popover Menu */}
            <AnimatePresence>
              {showMoveMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 mt-2 w-48 py-1.5 rounded-2xl shadow-2xl border z-50 overflow-hidden backdrop-blur-xl ${
                    isDark ? "bg-slate-900/95 border-slate-700 text-slate-200" : "bg-white/95 border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/40 flex items-center gap-1">
                    <FolderInput className="w-3 h-3 text-blue-400" /> Move to Category
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1 scrollbar-none">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveCategory?.(item.id, cat);
                          setShowMoveMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between transition-colors ${
                          item.category === cat
                            ? "bg-blue-600/20 text-blue-400 font-bold"
                            : isDark
                            ? "hover:bg-slate-800 text-slate-300"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span>{cat}</span>
                        {item.category === cat && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Match Score Badge (if search active) */}
          {matchInfo && matchInfo.score > 0 && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-md flex items-center gap-1.5 pointer-events-auto ${
                matchInfo.score >= 0.75
                  ? "bg-emerald-500/90 text-white shadow-emerald-500/20"
                  : "bg-blue-600/90 text-white shadow-blue-500/20"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              {Math.round(matchInfo.score * 100)}%
            </span>
          )}
        </div>

        {/* Hover Gradient Overlay with Action Buttons */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4 pointer-events-auto z-10">
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id);
              }}
              title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              className={`p-2.5 rounded-2xl backdrop-blur-md border transition-all ${
                item.isFavorite
                  ? "bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30"
                  : "bg-slate-900/80 text-slate-200 border-white/10 hover:bg-slate-800"
              }`}
            >
              <Star className={`w-4 h-4 ${item.isFavorite ? "fill-current" : ""}`} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleCopy}
              title="Copy OCR Text"
              className="p-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-200 hover:bg-slate-800 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </motion.button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-all"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Inspect</span>
          </button>
        </div>
      </div>

      {/* Card Body Details with Apple-style Spacing */}
      <div className="p-6 sm:p-7 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base sm:text-lg tracking-tight line-clamp-1 group-hover:text-blue-400 transition-colors">
            {item.title}
          </h3>
          {item.isFavorite && (
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
          )}
        </div>

        {/* Match Reason or Summary */}
        <p className="text-xs sm:text-sm opacity-80 line-clamp-2 leading-relaxed">
          {matchInfo?.matchReason || item.summary}
        </p>

        {/* Entities / Tags Preview */}
        {item.keyEntities && item.keyEntities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.keyEntities.slice(0, 2).map((entity, i) => (
              <span
                key={i}
                className={`text-xs px-3 py-1 rounded-full border font-mono truncate max-w-[200px] ${
                  isDark
                    ? "bg-slate-800/80 border-slate-700/60 text-blue-300"
                    : "bg-slate-100 border-slate-200 text-blue-700"
                }`}
              >
                {entity}
              </span>
            ))}
          </div>
        )}

        {/* Footer info: Date & Delete button */}
        <div className="pt-3.5 flex items-center justify-between text-xs opacity-60 border-t border-slate-800/40 dark:border-slate-800/80">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>

          {/* Delete Action with Inline Confirmation Prompt */}
          <div className="relative">
            {showConfirmDelete ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-rose-950/90 text-rose-200 p-1 rounded-xl border border-rose-800 animate-in fade-in"
              >
                <span className="text-[10px] font-bold px-1">Delete?</span>
                <button
                  onClick={() => onDelete(item.id)}
                  className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-500"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-1.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmDelete(true);
                }}
                className="hover:text-rose-400 p-1.5 rounded-xl transition-colors hover:bg-rose-500/10"
                title="Delete screenshot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
