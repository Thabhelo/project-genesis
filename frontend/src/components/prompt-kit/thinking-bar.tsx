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
        <Sparkles size={16} className="text-[#CC785C] shrink-0 animate-pulse" />
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#CC785C]/35 rounded-lg"
          >
            <TextShimmer className="text-[#1C1B19] text-[15px] font-medium font-display">
              {text}
            </TextShimmer>
          </button>
        ) : (
          <TextShimmer className="text-[#1C1B19] text-[15px] font-medium font-display">
            {text}
          </TextShimmer>
        )}
      </div>
      {onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="text-[13px] text-[#6E6B65] hover:text-[#1C1B19] px-3 py-1.5 rounded-xl transition-all duration-200
            border border-[#E7E5E0] bg-[#F7F6F3] hover:border-[#CC785C]/45
            shrink-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#CC785C]/35"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}
