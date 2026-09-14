"use client";

import { createContext, forwardRef, useContext } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue>({
  onClose: () => {},
});

function useModal() {
  return useContext(ModalContext);
}

// -- Modal (wrapper) --

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open = false, onClose = () => {}, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <ModalContext.Provider value={{ onClose }}>
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className={cn("relative z-10 w-full max-w-lg", className)}>
            {children}
          </div>
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  );
}

// -- ModalContent --

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ children, className }, ref) => (
    <div ref={ref} className={cn("rounded-xl bg-white p-6 shadow-modal", className)}>
      {children}
    </div>
  )
);

ModalContent.displayName = "ModalContent";

// -- ModalHeader --

export interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  const { onClose } = useModal();

  return (
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      <h2 className="text-h3 font-semibold text-neutral-900">{children}</h2>
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors duration-150"
        aria-label="Fechar"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}

// -- ModalBody --

export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn("text-body text-neutral-600", className)}>{children}</div>;
}

// -- ModalFooter --

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