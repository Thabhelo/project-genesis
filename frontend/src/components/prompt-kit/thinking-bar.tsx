"use client";

import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

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
        "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#18181b] border border-[#27272a]",
        className
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
        >
          <TextShimmer className="text-[#f4f4f5] text-[13px] font-medium">
            {text}
          </TextShimmer>
          <ChevronRight size={14} className="text-[#71717a] shrink-0" />
        </button>
      ) : (
        <TextShimmer className="text-[#f4f4f5] text-[13px] font-medium">
          {text}
        </TextShimmer>
      )}
      {onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="text-[11px] text-[#71717a] hover:text-[#f4f4f5] px-2 py-1 rounded hover:bg-[#27272a] transition-colors shrink-0"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}
