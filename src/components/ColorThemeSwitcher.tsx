"use client";

import { useState, useEffect } from "react";

interface ColorTheme {
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
}

const colorThemes: ColorTheme[] = [
  {
    name: "Indigo",
    primary: "#6366f1",
    primaryHover: "#4f46e5",
    primaryLight: "#e0e7ff",
  },
  {
    name: "Blue",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    primaryLight: "#dbeafe",
  },
  {
    name: "Purple",
    primary: "#a855f7",
    primaryHover: "#9333ea",
    primaryLight: "#f3e8ff",
  },
  {
    name: "Pink",
    primary: "#ec4899",
    primaryHover: "#db2777",
    primaryLight: "#fce7f3",
  },
  {
    name: "Green",
    primary: "#10b981",
    primaryHover: "#059669",
    primaryLight: "#d1fae5",
  },
  {
    name: "Orange",
    primary: "#f97316",
    primaryHover: "#ea580c",
    primaryLight: "#fed7aa",
  },
  {
    name: "Red",
    primary: "#ef4444",
    primaryHover: "#dc2626",
    primaryLight: "#fee2e2",
  },
  {
    name: "Teal",
    primary: "#14b8a6",
    primaryHover: "#0d9488",
    primaryLight: "#ccfbf1",
  },
];

export default function ColorThemeSwitcher() {
  const [currentColor, setCurrentColor] = useState(colorThemes[0]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved color theme
    const savedTheme = localStorage.getItem("colorTheme");
    if (savedTheme) {
      const theme = colorThemes.find((t) => t.name === savedTheme);
      if (theme) {
        setCurrentColor(theme);
        applyColorTheme(theme);
      }
    }
  }, []);

  const applyColorTheme = (theme: ColorTheme) => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primary);
    root.style.setProperty("--color-primary-hover", theme.primaryHover);
    root.style.setProperty("--color-primary-light", theme.primaryLight);
  };

  const handleColorChange = (theme: ColorTheme) => {
    setCurrentColor(theme);
    applyColorTheme(theme);
    localStorage.setItem("colorTheme", theme.name);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Change color theme"
      >
        <div
          className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: currentColor.primary }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Theme Color
            </p>
            <div className="grid grid-cols-4 gap-2">
              {colorThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleColorChange(theme)}
                  className={`relative h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
                    currentColor.name === theme.name
                      ? "border-gray-900 dark:border-white"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  style={{ backgroundColor: theme.primary }}
                  title={theme.name}
                >
                  {currentColor.name === theme.name && (
                    <svg
                      className="absolute inset-0 h-full w-full text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}