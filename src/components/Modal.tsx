// src/components/Modal.tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Size = "sm" | "md" | "lg" | "xl";
const sizeToWidth: Record<Size, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  contentClassName = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: Size;
  /** extra classes for the scrollable panel body (i.e. where your form lives) */
  contentClassName?: string;
  children: React.ReactNode;
}) {
  // lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const node = (
    <div
      className="fixed inset-0 z-[1000]"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Container that enables viewport scrolling when panel is taller than screen */}
      <div className="absolute inset-0 overflow-y-auto">
        {/* Centering rail */}
        <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
          {/* Panel */}
          <div
            className={`w-full ${sizeToWidth[size]} rounded-xl bg-[var(--bg-card)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[var(--border-color)]`}
          >
            {/* Header (sticky so actions always visible) */}
            <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 id="modal-title" className="text-base font-semibold">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-sm btn-default text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Body: cap max height and allow scrolling */}
            <div className={`max-h-[80vh] overflow-y-auto ${contentClassName}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render in body to avoid stacking/context issues
  if (typeof window !== "undefined") {
    return createPortal(node, document.body);
  }
  return node;
}
