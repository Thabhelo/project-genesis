"use client";

import { useEffect, useRef, useState } from "react";

const TIMER_INTERVAL = 1000;

interface AIThinkingProps {
  spinner?: boolean;
  message?: string;
  agentName?: string;
  className?: string;
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-[#6C63FF]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function AIThinking({
  spinner = true,
  message = "Let me think of the best answer...",
  agentName,
  className = "",
}: AIThinkingProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, TIMER_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [message]);

  const headerLabel = agentName ? `${agentName} is thinking...` : "Thinking...";

  return (
    <div
      className={`glass-panel rounded-2xl overflow-hidden flex flex-col h-full min-h-[120px] ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/30 flex items-center gap-3 shrink-0">
        {spinner && (
          <div className="shrink-0 animate-pulse-ring rounded-full p-1">
            <SpinnerIcon />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span
            className="font-display text-[16px] font-semibold"
            style={{
              background: "linear-gradient(110deg, #6B7280 25%, #6C63FF 50%, #38B2AC 65%, #6B7280 80%)",
              backgroundSize: "250% 100%",
              animation: "shimmer 4s linear infinite",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {headerLabel}
          </span>
        </div>
        <span className="text-[#6B7280] text-[13px] tabular-nums shrink-0">
          {timer}s
        </span>
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-[240px] overflow-hidden">
        {/* Top fade */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none z-10"
          style={{
            height: "48px",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)",
          }}
        />
        <div
          ref={contentRef}
          className="absolute inset-0 overflow-y-auto p-4 pt-6 text-[15px] text-[#6B7280] leading-relaxed whitespace-pre-wrap"
        >
          {message}
        </div>
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
          style={{
            height: "36px",
            background: "linear-gradient(to top, rgba(255,255,255,0.5), transparent)",
          }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="shimmer"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
