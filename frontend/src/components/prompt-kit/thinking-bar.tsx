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
        <Sparkles size={16} className="text-[#6C63FF] shrink-0 animate-pulse" />
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 text-left hover:opacity-75 transition-opacity"
          >
            <TextShimmer className="text-[#3D4852] text-[15px] font-medium font-display">
              {text}
            </TextShimmer>
          </button>
        ) : (
          <TextShimmer className="text-[#3D4852] text-[15px] font-medium font-display">
            {text}
          </TextShimmer>
        )}
      </div>
      {onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="text-[13px] text-[#6B7280] hover:text-[#3D4852] px-3 py-1.5 rounded-xl transition-all duration-200
            shadow-[3px_3px_6px_rgb(163,177,198,0.5),-3px_-3px_6px_rgba(255,255,255,0.5)]
            hover:shadow-[4px_4px_8px_rgb(163,177,198,0.6),-4px_-4px_8px_rgba(255,255,255,0.55)]
            active:shadow-[inset_2px_2px_4px_rgb(163,177,198,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]
            shrink-0 font-medium"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}
