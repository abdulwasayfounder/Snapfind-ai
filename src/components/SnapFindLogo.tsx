import React, { useState } from "react";
import snapFindLogo from "../assets/images/logo.png";
import { Search, Sparkles } from "lucide-react";

interface SnapFindLogoProps {
  className?: string;
  alt?: string;
}

export const SnapFindLogo: React.FC<SnapFindLogoProps> = ({
  className = "w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-500/25 border-2 border-blue-500/40 bg-slate-900",
  alt = "SnapFind Logo",
}) => {
  const [errorLevel, setErrorLevel] = useState<number>(0);

  if (errorLevel >= 1) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold relative overflow-hidden shrink-0`}
        title={alt}
      >
        <Search className="w-1/2 h-1/2 text-white" />
        <Sparkles className="w-1/3 h-1/3 text-cyan-300 absolute top-0.5 right-0.5 animate-pulse" />
      </div>
    );
  }

  return (
    <img
      src={snapFindLogo}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        setErrorLevel((prev) => prev + 1);
      }}
      className={`${className} shrink-0`}
    />
  );
};
export default SnapFindLogo;
