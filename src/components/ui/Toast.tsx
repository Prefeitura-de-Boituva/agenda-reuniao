"use client";

import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  show: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  autoHideMs?: number;
}

export function Toast({ show, onClose, children, className, autoHideMs = 3000 }: ToastProps) {
  const [domReady, setDomReady] = useState(false);

  useEffect(() => setDomReady(true), []);

  useEffect(() => {
    if (!show || autoHideMs <= 0) return;
    const id = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(id);
  }, [show, autoHideMs, onClose]);

  if (!show || !domReady) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-success-200 bg-white px-4 py-3 shadow-card",
        className
      )}
    >
      <CheckCircle2 className="size-5 shrink-0 text-success-600" />
      <span className="text-body font-medium text-neutral-900">{children}</span>
    </div>,
    document.body
  );
}

Toast.displayName = "Toast";