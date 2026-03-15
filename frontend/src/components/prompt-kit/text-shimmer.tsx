"use client";

import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  duration?: number;
  spread?: number;
  children: React.ReactNode;
  className?: string;
};

export function TextShimmer({
  className,
  duration = 4,
  spread = 20,
  children,
}: TextShimmerProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 45);

  return (
    <span
      className={cn(
        "bg-clip-text text-transparent bg-[length:200%_100%] bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.8)_50%,transparent_75%)]",
        className
      )}
      style={{
        animation: `shimmer ${duration}s linear infinite`,
        backgroundPosition: `${dynamicSpread}% 50%`,
      }}
    >
      {children}
    </span>
  );
}
