// src/components/Modal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, size = "md", children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);

    const html = document.documentElement;
    const update = () => setIsDark(html.classList.contains("dark"));
    update();

    // keep in sync if you toggle themes at runtime
    const obs = new MutationObserver(update);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (!mounted || !isOpen) return null;

  // NOTE: we wrap the portal contents in a div that conditionally has `dark`
  return createPortal(
    <div className={isDark ? "dark" : ""}>
      {/* overlay */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
          onClick={onClose}
        />

        {/* panel */}
        <div
          className={[
            "relative z-10 w-full rounded-2xl shadow-xl",
            "bg-white dark:bg-gray-900 dark:text-gray-100", // <- now respects dark
            size === "sm" && "max-w-sm",
            size === "md" && "max-w-lg",
            size === "lg" && "max-w-2xl",
            size === "xl" && "max-w-3xl",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* body */}
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
