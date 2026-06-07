"use client";

import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type ThinkingBarProps = {
  className?: string;
  text?: string;
  onStop?: () => void;
  stopLabel?: string;
  onClick?: () => void;
};

export function ThinkingBar({
  className,
  text = "Thinking",
  onStop,
  stopLabel = "Answer now",
  onClick,
}: ThinkingBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-6 py-4 rounded-2xl glass-panel",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Sparkles size={16} className="text-[#9A5B2F] shrink-0 animate-pulse" />
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9A5B2F]/35 rounded-lg"
          >
            <TextShimmer className="text-[#1F241F] text-[15px] font-medium font-display">
              {text}
            </TextShimmer>
          </button>
        ) : (
          <TextShimmer className="text-[#1F241F] text-[15px] font-medium font-display">
            {text}
          </TextShimmer>
        )}
      </div>
      {onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="text-[13px] text-[#6B6258] hover:text-[#1F241F] px-3 py-1.5 rounded-xl transition-all duration-200
            border border-[#D8CBB7] bg-[#F8F2E8] hover:border-[#9A5B2F]/45
            shrink-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9A5B2F]/35"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}
