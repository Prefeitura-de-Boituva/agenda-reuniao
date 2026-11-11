import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </main>
  );
}