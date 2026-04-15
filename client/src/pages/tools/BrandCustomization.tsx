import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Palette,
  Type,
  Zap,
  Download,
  RotateCcw,
  Copy,
  Check,
  Eye,
  Loader2,
  Building2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const DEFAULT_BRAND = {
  // Primary Colors
  primaryColor: "#3B82F6",
  secondaryColor: "#10B981",
  accentColor: "#F59E0B",
  
  // Dark Mode Colors
  darkPrimaryColor: "#60A5FA",
  darkSecondaryColor: "#34D399",
  darkAccentColor: "#FBBF24",
  
  // Neutral Colors
  lightGray: "#F3F4F6",
  darkGray: "#374151",
  lightText: "#FFFFFF",
  darkText: "#1F2937",
  
  // Typography
  fontFamily: "Inter",
  headingFontSize: "32",
  bodyFontSize: "14",
  
  // Button Styles
  buttonBorderRadius: "8",
  buttonPadding: "12",
  buttonFontWeight: "500",
};

interface BrandConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkPrimaryColor: string;
  darkSecondaryColor: string;
  darkAccentColor: string;
  lightGray: string;
  darkGray: string;
  lightText: string;
  darkText: string;
  fontFamily: string;
  headingFontSize: string;
  bodyFontSize: string;
  buttonBorderRadius: string;
  buttonPadding: string;
  buttonFontWeight: string;
}

interface CompanyBrandGuide {
  companyName: string;
  companyDescription: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  logoUrl?: string;
  tagline: string;
  missionStatement: string;
  primaryBrandColor: string;
  secondaryBrandColor: string;
  accentBrandColor: string;
  fontFamilyBrand: string;
  brandVoice: "professional" | "friendly" | "creative" | "corporate";
}

// Utility functions for color validation and formatting
const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-F]{6}$/i.test(color);
};

const normalizeHexColor = (color: string): string => {
  // Remove any spaces and convert to uppercase
  color = color.trim().toUpperCase();
  
  // If it doesn't start with #, add it
  if (!color.startsWith('#')) {
    color = '#' + color;
  }
  
  // Extract only hex characters
  const hexMatch = color.match(/#?([0-9A-F]{6})/i);
  if (hexMatch) {
    return '#' + hexMatch[1].toUpperCase();
  }
  
  // If invalid, return default
  return '#3B82F6';
};

const formatBrandConfig = (config: BrandConfig): BrandConfig => {
  // Ensure all color fields are valid hex colors
  return {
    primaryColor: isValidHexColor(config.primaryColor) ? config.primaryColor : normalizeHexColor(config.primaryColor),
    secondaryColor: isValidHexColor(config.secondaryColor) ? config.secondaryColor : normalizeHexColor(config.secondaryColor),
    accentColor: isValidHexColor(config.accentColor) ? config.accentColor : normalizeHexColor(config.accentColor),
    darkPrimaryColor: isValidHexColor(config.darkPrimaryColor) ? config.darkPrimaryColor : normalizeHexColor(config.darkPrimaryColor),
    darkSecondaryColor: isValidHexColor(config.darkSecondaryColor) ? config.darkSecondaryColor : normalizeHexColor(config.darkSecondaryColor),
    darkAccentColor: isValidHexColor(config.darkAccentColor) ? config.darkAccentColor : normalizeHexColor(config.darkAccentColor),
    lightGray: isValidHexColor(config.lightGray) ? config.lightGray : normalizeHexColor(config.lightGray),
    darkGray: isValidHexColor(config.darkGray) ? config.darkGray : normalizeHexColor(config.darkGray),
    lightText: isValidHexColor(config.lightText) ? config.lightText : normalizeHexColor(config.lightText),
    darkText: isValidHexColor(config.darkText) ? config.darkText : normalizeHexColor(config.darkText),
    fontFamily: config.fontFamily,
    headingFontSize: config.headingFontSize,
    bodyFontSize: config.bodyFontSize,
    buttonBorderRadius: config.buttonBorderRadius,
    buttonPadding: config.buttonPadding,
    buttonFontWeight: config.buttonFontWeight,
  };
};

export default function BrandCustomization() {
  const [, navigate] = useLocation();
  const { updateBrandConfig } = useBrand();
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND);
  const [companyGuide, setCompanyGuide] = useState<CompanyBrandGuide>({
    companyName: "",
    companyDescription: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    tagline: "",
    missionStatement: "",
    primaryBrandColor: "#3B82F6",
    secondaryBrandColor: "#10B981",
    accentBrandColor: "#F59E0B",
    fontFamilyBrand: "Inter",
    brandVoice: "professional",
  });
  const [darkMode, setDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load brand config from API
  const { data: brandConfig, isLoading: isLoadingConfig } =
    trpc.brandCustomization.getConfig.useQuery();

  const saveMutation = trpc.brandCustomization.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Brand settings saved successfully!");
    },
    onError: (error) => {
      console.error("Brand save error:", error);
      const errorMessage = error?.message || "Failed to save brand settings";
      toast.error(errorMessage);
    },
  });

  const resetMutation = trpc.brandCustomization.resetToDefault.useMutation({
    onSuccess: (data) => {
      setBrand(data.config);
      toast.success(data.message);
    },
    onError: (error) => {
      console.error("Brand reset error:", error);
      const errorMessage = error?.message || "Failed to reset brand settings";
      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    if (brandConfig) {
      setBrand(brandConfig);
    }
    setIsLoading(false);
  }, [brandConfig]);

  if (isLoading || isLoadingConfig) {
    return (
      <ModuleLayout
        title="Brand Customization"
        description="Design and customize your application's visual identity"
        icon={<Palette className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Settings", href: "/settings" },
          { label: "Brand Customization" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  const handleBrandChange = (key: keyof BrandConfig, value: string) => {
    // Normalize color values if the key is a color field
    const colorFields = [
      'primaryColor', 'secondaryColor', 'accentColor',
      'darkPrimaryColor', 'darkSecondaryColor', 'darkAccentColor',
      'lightGray', 'darkGray', 'lightText', 'darkText'
    ];

    const normalizedValue = colorFields.includes(key) 
      ? normalizeHexColor(value)
      : value;

    setBrand((prev) => ({
      ...prev,
      [key]: normalizedValue,
    }));
  };

  const handleSave = () => {
    try {
      // Format and validate the entire brand config before saving
      const formattedBrand = formatBrandConfig(brand);
      
      // Validate all colors before sending
      const colorFields = [
        'primaryColor', 'secondaryColor', 'accentColor',
        'darkPrimaryColor', 'darkSecondaryColor', 'darkAccentColor',
        'lightGray', 'darkGray', 'lightText', 'darkText'
      ] as (keyof BrandConfig)[];
      
      const invalidColors = colorFields.filter(
        field => !isValidHexColor(formattedBrand[field] as string)
      );

      if (invalidColors.length > 0) {
        toast.error(`Invalid color values: ${invalidColors.join(', ')}`);
        return;
      }

      // Validate numeric fields
      const numericFields = ['headingFontSize', 'bodyFontSize', 'buttonBorderRadius', 'buttonPadding', 'buttonFontWeight'];
      const invalidNumbers = numericFields.filter(
        field => !formattedBrand[field as keyof BrandConfig] || isNaN(Number(formattedBrand[field as keyof BrandConfig]))
      );

      if (invalidNumbers.length > 0) {
        toast.error(`Invalid numeric values: ${invalidNumbers.join(', ')}`);
        return;
      }

      updateBrandConfig(formattedBrand);
      saveMutation.mutate(formattedBrand);
    } catch (err: any) {
      console.error("Save validation error:", err);
      toast.error(err?.message || "Failed to validate brand settings");
    }
  };

  const handleReset = () => {
    if (confirm("Reset brand settings to defaults?")) {
      resetMutation.mutate();
    }
  };

  const handleDownloadCSS = () => {
    const css = `/* Generated Brand Customization CSS */
:root {
  /* Light Mode Colors */
  --primary-color: ${brand.primaryColor};
  --secondary-color: ${brand.secondaryColor};
  --accent-color: ${brand.accentColor};
  --light-gray: ${brand.lightGray};
  --dark-gray: ${brand.darkGray};
  --light-text: ${brand.lightText};
  --dark-text: ${brand.darkText};
  
  /* Typography */
  --font-family: "${brand.fontFamily}", sans-serif;
  --heading-font-size: ${brand.headingFontSize}px;
  --body-font-size: ${brand.bodyFontSize}px;
  
  /* Button Styles */
  --button-border-radius: ${brand.buttonBorderRadius}px;
  --button-padding: ${brand.buttonPadding}px;
  --button-font-weight: ${brand.buttonFontWeight};
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: ${brand.darkPrimaryColor};
    --secondary-color: ${brand.darkSecondaryColor};
    --accent-color: ${brand.darkAccentColor};
  }
}

/* Component Styles */
button, .button {
  font-family: var(--font-family);
  border-radius: var(--button-border-radius);
  padding: var(--button-padding);
  font-weight: var(--button-font-weight);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-family);
  font-size: var(--heading-font-size);
  color: var(--dark-text);
}

@media (prefers-color-scheme: dark) {
  h1, h2, h3, h4, h5, h6 {
    color: var(--light-text);
  }
}

body {
  font-family: var(--font-family);
  font-size: var(--body-font-size);
  color: var(--dark-text);
  background-color: var(--light-gray);
}

@media (prefers-color-scheme: dark) {
  body {
    color: var(--light-text);
    background-color: var(--dark-gray);
  }
}
`;

    const blob = new Blob([css], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand-customization.css";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSS file downloaded");
  };

  const handleCopyJSON = () => {
    const json = JSON.stringify(brand, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      toast.success("Brand config copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadJSON = () => {
    const json = JSON.stringify(brand, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("JSON file downloaded");
  };

  const primaryColor = darkMode ? brand.darkPrimaryColor : brand.primaryColor;
  const secondaryColor = darkMode ? brand.darkSecondaryColor : brand.secondaryColor;
  const accentColor = darkMode ? brand.darkAccentColor : brand.accentColor;

  return (
    <ModuleLayout
      title="Brand Customization"
      description="Design and customize your application's visual identity"
      icon={<Palette className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "Brand Customization" },
      ]}
    >
      <div className="space-y-6 max-w-7xl">
        {/* Controls Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Preview Mode:</span>
            <Button
              variant={darkMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "🌙 Dark" : "☀️ Light"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Brand Configuration</CardTitle>
                <CardDescription>Customize your brand appearance</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="colors" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="colors">Colors</TabsTrigger>
                    <TabsTrigger value="typography">Typography</TabsTrigger>
                    <TabsTrigger value="buttons">Buttons</TabsTrigger>
                    <TabsTrigger value="company">Company</TabsTrigger>
                  </TabsList>

                  <TabsContent value="colors" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Primary Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={brand.primaryColor}
                            onChange={(e) =>
                              handleBrandChange("primaryColor", e.target.value)
                            }
                            className="w-12 h-10 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={brand.primaryColor}
                            onChange={(e) =>
                              handleBrandChange("primaryColor", e.target.value)
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Secondary Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={brand.secondaryColor}
                            onChange={(e) =>
                              handleBrandChange("secondaryColor", e.target.value)
                            }
                            className="w-12 h-10 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={brand.secondaryColor}
                            onChange={(e) =>
                              handleBrandChange("secondaryColor", e.target.value)
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Accent Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={brand.accentColor}
                            onChange={(e) =>
                              handleBrandChange("accentColor", e.target.value)
                            }
                            className="w-12 h-10 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={brand.accentColor}
                            onChange={(e) =>
                              handleBrandChange("accentColor", e.target.value)
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <Separator className="my-2" />

                      <Label className="text-xs font-semibold">Dark Mode</Label>

                      <div>
                        <Label className="text-sm">Dark Primary</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={brand.darkPrimaryColor}
                            onChange={(e) =>
                              handleBrandChange("darkPrimaryColor", e.target.value)
                            }
                            className="w-12 h-10 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={brand.darkPrimaryColor}
                            onChange={(e) =>
                              handleBrandChange("darkPrimaryColor", e.target.value)
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Dark Secondary</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={brand.darkSecondaryColor}
                            onChange={(e) =>
                              handleBrandChange("darkSecondaryColor", e.target.value)
                            }
                            className="w-12 h-10 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={brand.darkSecondaryColor}
                            onChange={(e) =>
                              handleBrandChange("darkSecondaryColor", e.target.value)
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Dark Accent</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={brand.darkAccentColor}
                            onChange={(e) =>
                              handleBrandChange("darkAccentColor", e.target.value)
                            }
                            className="w-12 h-10 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={brand.darkAccentColor}
                            onChange={(e) =>
                              handleBrandChange("darkAccentColor", e.target.value)
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="typography" className="space-y-3">
                    <div>
                      <Label className="text-sm">Font Family</Label>
                      <Select
                        value={brand.fontFamily}
                        onValueChange={(value) =>
                          handleBrandChange("fontFamily", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Poppins">Poppins</SelectItem>
                          <SelectItem value="DM Sans">DM Sans</SelectItem>
                          <SelectItem value="Outfit">Outfit</SelectItem>
                          <SelectItem value="Raleway">Raleway</SelectItem>
                          <SelectItem value="Ubuntu">Ubuntu</SelectItem>
                          <SelectItem value="Lato">Lato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Heading Font Size (px)</Label>
                      <Input
                        type="number"
                        min="14"
                        max="96"
                        value={brand.headingFontSize}
                        onChange={(e) =>
                          handleBrandChange("headingFontSize", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Body Font Size (px)</Label>
                      <Input
                        type="number"
                        min="10"
                        max="24"
                        value={brand.bodyFontSize}
                        onChange={(e) =>
                          handleBrandChange("bodyFontSize", e.target.value)
                        }
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="buttons" className="space-y-3">
                    <div>
                      <Label className="text-sm">Border Radius (px)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="32"
                        value={brand.buttonBorderRadius}
                        onChange={(e) =>
                          handleBrandChange("buttonBorderRadius", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Padding (px)</Label>
                      <Input
                        type="number"
                        min="4"
                        max="24"
                        value={brand.buttonPadding}
                        onChange={(e) =>
                          handleBrandChange("buttonPadding", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Font Weight</Label>
                      <Select
                        value={brand.buttonFontWeight}
                        onValueChange={(value) =>
                          handleBrandChange("buttonFontWeight", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="400">Regular (400)</SelectItem>
                          <SelectItem value="500">Medium (500)</SelectItem>
                          <SelectItem value="600">Semibold (600)</SelectItem>
                          <SelectItem value="700">Bold (700)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="company" className="space-y-3">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Company Name</Label>
                        <Input
                          placeholder="e.g., Your Company"
                          value={companyGuide.companyName}
                          onChange={(e) =>
                            setCompanyGuide({
                              ...companyGuide,
                              companyName: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Tagline</Label>
                        <Input
                          placeholder="e.g., Smart CRM Solutions"
                          value={companyGuide.tagline}
                          onChange={(e) =>
                            setCompanyGuide({
                              ...companyGuide,
                              tagline: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Brand Voice</Label>
                        <Select
                          value={companyGuide.brandVoice}
                          onValueChange={(value: any) =>
                            setCompanyGuide({
                              ...companyGuide,
                              brandVoice: value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="creative">Creative</SelectItem>
                            <SelectItem value="corporate">Corporate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Primary Brand Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={companyGuide.primaryBrandColor}
                            onChange={(e) =>
                              setCompanyGuide({
                                ...companyGuide,
                                primaryBrandColor: normalizeHexColor(e.target.value),
                              })
                            }
                            className="w-12 h-10 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={companyGuide.primaryBrandColor}
                            onChange={(e) =>
                              setCompanyGuide({
                                ...companyGuide,
                                primaryBrandColor: normalizeHexColor(e.target.value),
                              })
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Button onClick={handleCopyJSON} className="w-full" variant="outline">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                  <Button onClick={handleDownloadJSON} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                  <Button onClick={handleDownloadCSS} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSS
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Color Palette */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Color Palette Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Primary
                    </p>
                    <div
                      className="h-24 rounded-lg border transition-all"
                      style={{
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{primaryColor}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Secondary
                    </p>
                    <div
                      className="h-24 rounded-lg border transition-all"
                      style={{
                        backgroundColor: secondaryColor,
                        borderColor: secondaryColor,
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{secondaryColor}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Accent
                    </p>
                    <div
                      className="h-24 rounded-lg border transition-all"
                      style={{
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{accentColor}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Button Styles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Button Styles Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Solid Buttons
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        style={{
                          backgroundColor: primaryColor,
                          color: "#fff",
                          borderRadius: `${brand.buttonBorderRadius}px`,
                          padding: `${brand.buttonPadding}px ${brand.buttonPadding * 2}px`,
                          fontWeight: brand.buttonFontWeight,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Primary
                      </button>
                      <button
                        style={{
                          backgroundColor: secondaryColor,
                          color: "#fff",
                          borderRadius: `${brand.buttonBorderRadius}px`,
                          padding: `${brand.buttonPadding}px ${brand.buttonPadding * 2}px`,
                          fontWeight: brand.buttonFontWeight,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Secondary
                      </button>
                      <button
                        style={{
                          backgroundColor: accentColor,
                          color: "#000",
                          borderRadius: `${brand.buttonBorderRadius}px`,
                          padding: `${brand.buttonPadding}px ${brand.buttonPadding * 2}px`,
                          fontWeight: brand.buttonFontWeight,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Accent
                      </button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Outline Buttons
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        style={{
                          backgroundColor: "transparent",
                          color: primaryColor,
                          borderRadius: `${brand.buttonBorderRadius}px`,
                          padding: `${brand.buttonPadding}px ${brand.buttonPadding * 2}px`,
                          fontWeight: brand.buttonFontWeight,
                          border: `2px solid ${primaryColor}`,
                          cursor: "pointer",
                        }}
                      >
                        Primary
                      </button>
                      <button
                        style={{
                          backgroundColor: "transparent",
                          color: secondaryColor,
                          borderRadius: `${brand.buttonBorderRadius}px`,
                          padding: `${brand.buttonPadding}px ${brand.buttonPadding * 2}px`,
                          fontWeight: brand.buttonFontWeight,
                          border: `2px solid ${secondaryColor}`,
                          cursor: "pointer",
                        }}
                      >
                        Secondary
                      </button>
                      <button
                        style={{
                          backgroundColor: "transparent",
                          color: accentColor,
                          borderRadius: `${brand.buttonBorderRadius}px`,
                          padding: `${brand.buttonPadding}px ${brand.buttonPadding * 2}px`,
                          fontWeight: brand.buttonFontWeight,
                          border: `2px solid ${accentColor}`,
                          cursor: "pointer",
                        }}
                      >
                        Accent
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div
                    style={{
                      fontFamily: `"${brand.fontFamily}", sans-serif`,
                      fontSize: `${brand.headingFontSize}px`,
                      fontWeight: brand.buttonFontWeight,
                    }}
                  >
                    Heading Text (H1)
                  </div>
                  <div
                    style={{
                      fontFamily: `"${brand.fontFamily}", sans-serif`,
                      fontSize: `${Math.round(Number(brand.headingFontSize) * 0.75)}px`,
                      fontWeight: brand.buttonFontWeight,
                    }}
                  >
                    Subheading Text (H3)
                  </div>
                  <div
                    style={{
                      fontFamily: `"${brand.fontFamily}", sans-serif`,
                      fontSize: `${brand.bodyFontSize}px`,
                    }}
                  >
                    Body text with regular font weight. This is how your content will
                    appear to users. The font family is set to {brand.fontFamily}.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
