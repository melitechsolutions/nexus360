import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye,
  X,
  Volume2,
  Type,
  Maximize2,
  Contrast,
  Zap,
  Accessibility,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: "normal" | "large" | "larger";
  reducedMotion: boolean;
  screenReaderMode: boolean;
  darkMode: boolean;
  textSpacing: boolean;
}

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === "undefined") {
      return {
        highContrast: false,
        fontSize: "normal",
        reducedMotion: false,
        screenReaderMode: false,
        darkMode: false,
        textSpacing: false,
      };
    }

    const stored = localStorage.getItem("accessibilitySettings");
    return stored
      ? JSON.parse(stored)
      : {
          highContrast: false,
          fontSize: "normal",
          reducedMotion: false,
          screenReaderMode: false,
          darkMode: false,
          textSpacing: false,
        };
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Apply accessibility settings to document
  useEffect(() => {
    localStorage.setItem("accessibilitySettings", JSON.stringify(settings));

    const html = document.documentElement;
    const body = document.body;

    // Apply high contrast
    if (settings.highContrast) {
      html.classList.add("high-contrast");
      body.style.filter = "contrast(1.2)";
    } else {
      html.classList.remove("high-contrast");
      body.style.filter = "";
    }

    // Apply font size
    const sizeMap = {
      normal: "16px",
      large: "18px",
      larger: "20px",
    };
    body.style.fontSize = sizeMap[settings.fontSize];

    // Apply reduced motion
    if (settings.reducedMotion) {
      html.classList.add("reduce-motion");
      html.style.setProperty("--animation-duration", "0s");
    } else {
      html.classList.remove("reduce-motion");
      html.style.setProperty("--animation-duration", "0.3s");
    }

    // Apply dark mode
    if (settings.darkMode) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }

    // Apply text spacing
    if (settings.textSpacing) {
      body.style.lineHeight = "1.8";
      body.style.letterSpacing = "0.15em";
    } else {
      body.style.lineHeight = "";
      body.style.letterSpacing = "";
    }

    // Screen reader mode
    if (settings.screenReaderMode) {
      html.setAttribute("aria-label", "Screen reader mode enabled");
    }
  }, [settings]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleSetting = (key: keyof AccessibilitySettings) => {
    if (key === "fontSize" || key === "fontSize") {
      // Handle font size cycle
      const sizes: Array<"normal" | "large" | "larger"> = ["normal", "large", "larger"];
      const currentIndex = sizes.indexOf(settings[key] as "normal" | "large" | "larger");
      const nextIndex = (currentIndex + 1) % sizes.length;
      setSettings((prev) => ({
        ...prev,
        [key]: sizes[nextIndex],
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const resetSettings = () => {
    setSettings({
      highContrast: false,
      fontSize: "normal",
      reducedMotion: false,
      screenReaderMode: false,
      darkMode: false,
      textSpacing: false,
    });
  };

  return (
    <div ref={containerRef} className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
      {/* Main Icon Button */}
      <div
        className={cn(
          "transition-all duration-300",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          className={cn(
            "rounded-full h-12 w-12",
            "border-gray-300 hover:border-gray-400",
            "shadow-lg hover:shadow-xl",
            "transition-all duration-200",
            "bg-white hover:bg-gray-50",
            "dark:bg-gray-800 dark:hover:bg-gray-700",
            "dark:border-gray-600"
          )}
          title="Open accessibility options"
          aria-label="Accessibility Menu"
        >
          <Accessibility className="h-5 w-5" />
        </Button>
      </div>

      {/* Expanded Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2",
            "bg-white dark:bg-gray-800",
            "rounded-lg shadow-2xl",
            "border border-gray-200 dark:border-gray-700",
            "p-4 w-64",
            "space-y-4",
            "animate-in fade-in zoom-in-95",
            "duration-200"
          )}
        >
          {/* Close Button */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Accessibility
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
              title="Close accessibility menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Settings */}
          <div className="space-y-3">
            {/* High Contrast Toggle */}
            <AccessibilityOption
              icon={<Contrast className="h-4 w-4" />}
              label="High Contrast"
              value={settings.highContrast}
              onChange={() => toggleSetting("highContrast")}
            />

            {/* Font Size */}
            <AccessibilityOption
              icon={<Type className="h-4 w-4" />}
              label={`Font Size: ${settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)}`}
              value={true}
              onChange={() => toggleSetting("fontSize")}
              isCycle
            />

            {/* Reduced Motion */}
            <AccessibilityOption
              icon={<Zap className="h-4 w-4" />}
              label="Reduce Motion"
              value={settings.reducedMotion}
              onChange={() => toggleSetting("reducedMotion")}
            />

            {/* Screen Reader Mode */}
            <AccessibilityOption
              icon={<Volume2 className="h-4 w-4" />}
              label="Screen Reader Mode"
              value={settings.screenReaderMode}
              onChange={() => toggleSetting("screenReaderMode")}
            />

            {/* Dark Mode */}
            <AccessibilityOption
              icon={<Moon className="h-4 w-4" />}
              label="Dark Mode"
              value={settings.darkMode}
              onChange={() => toggleSetting("darkMode")}
            />

            {/* Text Spacing */}
            <AccessibilityOption
              icon={<Maximize2 className="h-4 w-4" />}
              label="Increase Text Spacing"
              value={settings.textSpacing}
              onChange={() => toggleSetting("textSpacing")}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetSettings}
            className="w-full text-xs"
          >
            Reset to Defaults
          </Button>

          {/* Help Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            These settings are saved locally and applied across the entire app.
          </p>
        </div>
      )}
    </div>
  );
}

interface AccessibilityOptionProps {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: () => void;
  isCycle?: boolean;
}

function AccessibilityOption({
  icon,
  label,
  value,
  onChange,
  isCycle,
}: AccessibilityOptionProps) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "flex items-center justify-between w-full",
        "px-3 py-2 rounded-md",
        "text-sm text-left",
        "transition-colors duration-200",
        value
          ? "bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
        "hover:bg-gray-200 dark:hover:bg-gray-600"
      )}
      title={`Toggle ${label}`}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex-shrink-0", value && "text-blue-600 dark:text-blue-400")}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      {!isCycle && (
        <span
          className={cn(
            "h-4 w-4 rounded border transition-colors",
            value
              ? "bg-blue-600 border-blue-600"
              : "border-gray-300 dark:border-gray-500"
          )}
        >
          {value && <span className="text-white text-xs flex items-center justify-center h-full">✓</span>}
        </span>
      )}
    </button>
  );
}
