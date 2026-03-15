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
      className="animate-spin h-5 w-5 text-[#818cf8]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
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
      className={`bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden flex flex-col ${className}`}
      style={{ minHeight: "320px" }}
    >
      <div className="p-4 border-b border-[#27272a] flex items-center gap-3 shrink-0">
        {spinner && (
          <div className="shrink-0">
            <SpinnerIcon />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span
            className="text-[#f4f4f5] text-[14px] font-medium"
            style={{
              background: "linear-gradient(110deg, #404040 35%, #fff 50%, #404040 75%, #404040)",
              backgroundSize: "200% 100%",
              animation: "shimmer 5s linear infinite",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {headerLabel}
          </span>
          <span className="text-[#71717a] text-[12px] ml-2">{timer}s</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[240px] overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#09090b] from-30% to-transparent pointer-events-none z-10"
          style={{ height: "80px" }}
        />
        <div
          ref={contentRef}
          className="absolute inset-0 overflow-y-auto p-4 pt-6 text-[14px] text-[#a1a1aa] leading-relaxed whitespace-pre-wrap custom-scrollbar"
          style={{ paddingTop: "1.5rem" }}
        >
          {message}
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#09090b]/80 from-50% to-transparent pointer-events-none z-10"
          style={{ height: "40px" }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="shimmer"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
