import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      style={
        {
          "--bg-size": "300%",
        } as CSSProperties
      }
      className={cn(
        "inline-block animate-gradient bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
