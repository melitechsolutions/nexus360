import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useThemeCustomization } from "@/contexts/ThemeCustomizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Palette,
  Moon,
  Sun,
  RotateCcw,
  Check,
  Loader2,
  Eye,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

// Dark mode variations
const DARK_MODE_PRESETS = {
  total_dark: {
    name: "Total Dark",
    description: "Pure black background with bright accents",
    background: "#000000",
    surface: "#1a1a1a",
    text: "#ffffff",
    muted: "#404040",
  },
  grey_black: {
    name: "Grey & Black",
    description: "Dark grey with black accents",
    background: "#111111",
    surface: "#2a2a2a",
    text: "#e5e5e5",
    muted: "#666666",
  },
  navy_dark: {
    name: "Navy Blue & Dark",
    description: "Navy blue background with dark accents",
    background: "#0f1a3f",
    surface: "#1a2f5f",
    text: "#e3f2fd",
    muted: "#546e7a",
  },
  slate_dark: {
    name: "Slate Dark",
    description: "Slate grey background",
    background: "#1e293b",
    surface: "#334155",
    text: "#f1f5f9",
    muted: "#64748b",
  },
  forest_dark: {
    name: "Forest Dark",
    description: "Forest green accents on dark",
    background: "#0d1b1f",
    surface: "#1b2928",
    text: "#e0f2f1",
    muted: "#455a64",
  },
};

const CARD_BACKGROUND_STYLES = [
  {
    id: "solid",
    name: "Solid",
    light: "#ffffff",
    dark: "#1a1a1a",
  },
  {
    id: "gradient_subtle",
    name: "Subtle Gradient",
    light: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
    dark: "linear-gradient(135deg, #1a1a1a 0%, #252525 100%)",
  },
  {
    id: "gradient_soft",
    name: "Soft Gradient",
    light: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
    dark: "linear-gradient(135deg, #0f0f0f 0%, #2a2a2a 100%)",
  },
  {
    id: "gradient_bold",
    name: "Bold Gradient",
    light: "linear-gradient(135deg, #ffffff 0%, #e8e8e8 100%)",
    dark: "linear-gradient(135deg, #2a2a2a 0%, #0f0f0f 100%)",
  },
  {
    id: "frosted",
    name: "Frosted Glass",
    light: "rgba(255, 255, 255, 0.8)",
    dark: "rgba(30, 30, 30, 0.8)",
  },
];

const LIGHT_MODE_COLORS = {
  background: "#ffffff",
  surface: "#f9fafb",
  text: "#1f2937",
  muted: "#d1d5db",
};

interface ThemeConfig {
  darkModePreset: string;
  cardBackgroundStyle: string;
  customDarkBackground?: string;
  customDarkSurface?: string;
  customDarkText?: string;
  customCardBackground?: string;
  accentColor: string;
  
  // Font Colors - Light Mode
  h1ColorLight: string;
  h2ColorLight: string;
  h3ColorLight: string;
  h4ColorLight: string;
  h5ColorLight: string;
  h6ColorLight: string;
  bodyColorLight: string;
  mutedColorLight: string;
  
  // Font Colors - Dark Mode
  h1ColorDark: string;
  h2ColorDark: string;
  h3ColorDark: string;
  h4ColorDark: string;
  h5ColorDark: string;
  h6ColorDark: string;
  bodyColorDark: string;
  mutedColorDark: string;
}

export default function ThemeCustomization() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const [config, setConfig] = useState<ThemeConfig>({
    darkModePreset: "slate_dark",
    cardBackgroundStyle: "solid",
    accentColor: "#3b82f6",
    
    // Light mode font colors
    h1ColorLight: "#1f2937",
    h2ColorLight: "#374151",
    h3ColorLight: "#4b5563",
    h4ColorLight: "#6b7280",
    h5ColorLight: "#9ca3af",
    h6ColorLight: "#d1d5db",
    bodyColorLight: "#1f2937",
    mutedColorLight: "#9ca3af",
    
    // Dark mode font colors
    h1ColorDark: "#f3f4f6",
    h2ColorDark: "#e5e7eb",
    h3ColorDark: "#d1d5db",
    h4ColorDark: "#9ca3af",
    h5ColorDark: "#6b7280",
    h6ColorDark: "#4b5563",
    bodyColorDark: "#e5e7eb",
    mutedColorDark: "#9ca3af",
  });
  const [selectedPreset, setSelectedPreset] = useState("slate_dark");
  const [copied, setCopied] = useState(false);

  const currentDarkPreset = DARK_MODE_PRESETS[selectedPreset as keyof typeof DARK_MODE_PRESETS];
  const currentCardStyle = CARD_BACKGROUND_STYLES.find(s => s.id === config.cardBackgroundStyle);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setConfig((prev) => ({
      ...prev,
      darkModePreset: preset,
    }));
  };

  const handleCardStyleChange = (styleId: string) => {
    setConfig((prev) => ({
      ...prev,
      cardBackgroundStyle: styleId,
    }));
  };

  const handleAccentColorChange = (color: string) => {
    setConfig((prev) => ({
      ...prev,
      accentColor: color,
    }));
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const saveMutation = trpc.themeCustomization.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Theme configuration saved successfully!");
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
      setIsSaving(false);
    },
  });

  const resetMutation = trpc.themeCustomization.resetToDefault.useMutation({
    onSuccess: (data) => {
      setConfig(data.config);
      setSelectedPreset(data.config.darkModePreset || "slate_dark");
      toast.success(data.message);
      setIsResetting(false);
    },
    onError: (error) => {
      toast.error(`Failed to reset: ${error.message}`);
      setIsResetting(false);
    },
  });

  const { updateThemeConfig } = useThemeCustomization();

  const handleSave = () => {
    setIsSaving(true);
    updateThemeConfig(config);
    saveMutation.mutate(config);
  };

  const handleReset = () => {
    if (confirm("Reset theme settings to defaults? This cannot be undone.")) {
      setIsResetting(true);
      resetMutation.mutate();
    }
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    toast.success("Theme config copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCSSVariables = () => {
    const preset = currentDarkPreset;
    return `
/* Generated Theme Configuration */
:root {
  /* Light Mode */
  --light-bg: ${LIGHT_MODE_COLORS.background};
  --light-surface: ${LIGHT_MODE_COLORS.surface};
  --light-text: ${LIGHT_MODE_COLORS.text};
  --light-muted: ${LIGHT_MODE_COLORS.muted};
  
  /* Dark Mode - ${preset.name} */
  --dark-bg: ${preset.background};
  --dark-surface: ${preset.surface};
  --dark-text: ${preset.text};
  --dark-muted: ${preset.muted};
  
  /* Accent */
  --accent-color: ${config.accentColor};
  
  /* Card Styles */
  --card-background: ${currentCardStyle?.light};
  --card-background-dark: ${currentCardStyle?.dark};
}

@media (prefers-color-scheme: dark) {
  :root {
    --card-background: ${currentCardStyle?.dark};
  }
}
    `.trim();
  };

  return (
    <ModuleLayout
      title="Theme Customization"
      description="Configure light and dark mode themes, card styles, and color schemes"
      icon={<Palette className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "Theme Customization" },
      ]}
    >
      <div className="space-y-6 max-w-6xl">
        {/* Controls Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium">Current Mode:</span>
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-blue-500" />
              ) : (
                <Sun className="h-4 w-4 text-orange-500" />
              )}
              <span className="font-semibold capitalize">{theme}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dark-modes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dark-modes">Dark Mode Presets</TabsTrigger>
            <TabsTrigger value="card-styles">Card Styles</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Font Colors</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Dark Mode Presets */}
          <TabsContent value="dark-modes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dark Mode Variations</CardTitle>
                <CardDescription>
                  Choose a dark mode preset that best matches your brand aesthetic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(DARK_MODE_PRESETS).map(([key, preset]) => (
                    <div
                      key={key}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        selectedPreset === key
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      )}
                      onClick={() => handlePresetChange(key)}
                    >
                      {/* Color Preview */}
                      <div className="flex gap-2 mb-3">
                        <div
                          className="w-12 h-12 rounded border border-slate-300"
                          style={{ backgroundColor: preset.background }}
                          title="Background"
                        />
                        <div
                          className="w-12 h-12 rounded border border-slate-300"
                          style={{ backgroundColor: preset.surface }}
                          title="Surface"
                        />
                        <div
                          className="w-12 h-12 rounded border border-slate-300"
                          style={{
                            backgroundColor: preset.muted,
                          }}
                          title="Muted"
                        />
                      </div>
                      <h4 className="font-semibold text-sm">{preset.name}</h4>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                      {selectedPreset === key && (
                        <div className="mt-3 flex items-center text-xs text-blue-600 dark:text-blue-400">
                          <Check className="h-4 w-4 mr-1" />
                          Selected
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Card Styles */}
          <TabsContent value="card-styles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Card & Component Backgrounds</CardTitle>
                <CardDescription>
                  Choose how cards and components should be styled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CARD_BACKGROUND_STYLES.map((style) => (
                    <div
                      key={style.id}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        config.cardBackgroundStyle === style.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      )}
                      onClick={() => handleCardStyleChange(style.id)}
                    >
                      {/* Style Preview */}
                      <div
                        className="w-full h-16 rounded mb-3 border border-slate-300 dark:border-slate-600"
                        style={{
                          background:
                            theme === "dark" ? style.dark : style.light,
                        }}
                      />
                      <h4 className="font-semibold text-sm">{style.name}</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        {style.id === "solid" && "Clean and simple"}
                        {style.id === "gradient_subtle" && "Gentle gradient effect"}
                        {style.id === "gradient_soft" && "Soft, barely visible gradient"}
                        {style.id === "gradient_bold" && "Noticeable gradient contrast"}
                        {style.id === "frosted" && "Semi-transparent frosted glass"}
                      </p>
                      {config.cardBackgroundStyle === style.id && (
                        <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                          <Check className="h-4 w-4 mr-1" />
                          Active
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Colors */}
          <TabsContent value="colors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Colors</CardTitle>
                <CardDescription>
                  Customize accent colors that work across all theme modes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Primary Accent Color
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Used for buttons, links, and interactive elements
                    </p>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <input
                          type="color"
                          value={config.accentColor}
                          onChange={(e) => handleAccentColorChange(e.target.value)}
                          className="w-full h-12 rounded cursor-pointer border border-slate-300 dark:border-slate-600"
                        />
                      </div>
                      <code className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-sm">
                        {config.accentColor}
                      </code>
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Light Mode Palette</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: LIGHT_MODE_COLORS.background }}
                          />
                          <span className="text-sm">Background</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: LIGHT_MODE_COLORS.surface }}
                          />
                          <span className="text-sm">Surface</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: config.accentColor }}
                          />
                          <span className="text-sm">Accent</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Dark Mode Palette</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: currentDarkPreset.background }}
                          />
                          <span className="text-sm">Background</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: currentDarkPreset.surface }}
                          />
                          <span className="text-sm">Surface</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: config.accentColor }}
                          />
                          <span className="text-sm">Accent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Font Colors */}
          <TabsContent value="fonts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Font & Text Colors</CardTitle>
                <CardDescription>
                  Customize text colors for different heading levels and text styles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Light Mode Font Colors */}
                <div>
                  <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <Sun className="h-4 w-4 text-orange-500" />
                    Light Mode Font Colors
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: "h1ColorLight", label: "H1 Heading", example: "H1" },
                      { key: "h2ColorLight", label: "H2 Heading", example: "H2" },
                      { key: "h3ColorLight", label: "H3 Heading", example: "H3" },
                      { key: "h4ColorLight", label: "H4 Heading", example: "H4" },
                      { key: "h5ColorLight", label: "H5 Heading", example: "H5" },
                      { key: "h6ColorLight", label: "H6 Heading", example: "H6" },
                      { key: "bodyColorLight", label: "Body Text", example: "Body" },
                      { key: "mutedColorLight", label: "Muted Text", example: "Muted" },
                    ].map(({ key, label, example }) => (
                      <div key={key}className="space-y-2">
                        <Label className="text-sm">{label}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config[key as keyof ThemeConfig] as string}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-10 h-10 cursor-pointer rounded"
                          />
                          <div
                            className="flex-1 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center font-semibold"
                            style={{
                              color: config[key as keyof ThemeConfig] as string,
                              backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                            }}
                          >
                            {example}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dark Mode Font Colors */}
                <div>
                  <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <Moon className="h-4 w-4 text-blue-500" />
                    Dark Mode Font Colors
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: "h1ColorDark", label: "H1 Heading", example: "H1" },
                      { key: "h2ColorDark", label: "H2 Heading", example: "H2" },
                      { key: "h3ColorDark", label: "H3 Heading", example: "H3" },
                      { key: "h4ColorDark", label: "H4 Heading", example: "H4" },
                      { key: "h5ColorDark", label: "H5 Heading", example: "H5" },
                      { key: "h6ColorDark", label: "H6 Heading", example: "H6" },
                      { key: "bodyColorDark", label: "Body Text", example: "Body" },
                      { key: "mutedColorDark", label: "Muted Text", example: "Muted" },
                    ].map(({ key, label, example }) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-sm">{label}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config[key as keyof ThemeConfig] as string}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-10 h-10 cursor-pointer rounded"
                          />
                          <div
                            className="flex-1 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center font-semibold"
                            style={{
                              color: config[key as keyof ThemeConfig] as string,
                              backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
                            }}
                          >
                            {example}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview & Export */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Preview</CardTitle>
                <CardDescription>
                  See how your theme configuration will look
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Component Examples */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Button Examples */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Button Styles</h4>
                    <div className="space-y-2">
                      <button
                        className="px-4 py-2 rounded text-white w-full"
                        style={{ backgroundColor: config.accentColor }}
                      >
                        Primary Button
                      </button>
                      <button
                        className="px-4 py-2 rounded border w-full"
                        style={{
                          borderColor: config.accentColor,
                          color: config.accentColor,
                        }}
                      >
                        Secondary Button
                      </button>
                    </div>
                  </div>

                  {/* Card Example */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Card Styles</h4>
                    <div
                      className="p-4 rounded-lg border"
                      style={{
                        background:
                          theme === "dark"
                            ? currentCardStyle?.dark
                            : currentCardStyle?.light,
                        borderColor:
                          theme === "dark" ? "#444" : "#ddd",
                      }}
                    >
                      <div className="font-semibold mb-2">Sample Card</div>
                      <div className="text-sm text-muted-foreground">
                        This is how cards will appear with your selected style
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuration Export */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-sm mb-3">Configuration</h4>
                  <div className="bg-slate-100 dark:bg-slate-900 rounded p-4 font-mono text-xs overflow-auto max-h-48">
                    <pre>{generateCSSVariables()}</pre>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleCopyConfig}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? "Copied!" : "Copy Configuration"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
