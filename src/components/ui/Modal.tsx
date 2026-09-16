"use client";

import { createContext, forwardRef, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import FocusLock from "react-focus-lock";

interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue>({
  onClose: () => {},
});

function useModal() {
  return useContext(ModalContext);
}

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open = false, onClose = () => {}, children, className }: ModalProps) {
  const [mounted, setMounted] = useState(true);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const firstFocusable = document.querySelector('[data-modal-focusable]') as HTMLElement;
      if (firstFocusable) firstFocusable.focus();
    } else {
      if (previousActiveElement.current) previousActiveElement.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <ModalContext.Provider value={{ onClose }}>
      {createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <FocusLock returnFocus>
            <div
              className={cn(
                "relative z-10 w-full max-w-full sm:max-w-lg max-h-[90vh] overflow-y-auto",
                className
              )}
              data-modal-focusable
            >
              {children}
            </div>
          </FocusLock>
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  );
}

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl bg-white p-4 sm:p-6 shadow-modal w-full max-w-full overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  )
);

ModalContent.displayName = "ModalContent";

export interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  const { onClose } = useModal();

  return (
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      <h2 id="modal-title" className="text-h3 font-semibold text-neutral-900">
        {children}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none"
        aria-label="Fechar"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}

export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn("text-body text-neutral-600", className)}>{children}</div>
  );
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("mt-6 flex items-center justify-end gap-3", className)}>
      {children}
    </div>
  );
}