import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useThemeCustomization } from "@/contexts/ThemeCustomizationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrandCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Brand Customization Modal
 * 
 * Allows users (with proper permissions) to customize:
 * - Primary brand color
 * - Secondary accent color
 * - Border radius
 * - Logo/branding assets
 * 
 * Changes apply immediately across the application
 */
export const BrandCustomizationModal: React.FC<BrandCustomizationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { primaryColor, secondaryColor, borderRadius, updateTheme } = useThemeCustomization();
  const [formData, setFormData] = useState({
    primaryColor: primaryColor || "#3b82f6",
    secondaryColor: secondaryColor || "#6366f1",
    borderRadius: borderRadius || "0.5rem",
  });

  useEffect(() => {
    setFormData({
      primaryColor: primaryColor || "#3b82f6",
      secondaryColor: secondaryColor || "#6366f1",
      borderRadius: borderRadius || "0.5rem",
    });
  }, [primaryColor, secondaryColor, borderRadius, isOpen]);

  const handleSave = () => {
    try {
      updateTheme({
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        borderRadius: formData.borderRadius,
      });
      toast.success("Brand customization applied successfully!");
      onClose();
    } catch (error: any) {
      toast.error(`Failed to apply customization: ${error.message}`);
    }
  };

  const handleReset = () => {
    setFormData({
      primaryColor: "#3b82f6",
      secondaryColor: "#6366f1",
      borderRadius: "0.5rem",
    });
    updateTheme({
      primaryColor: "#3b82f6",
      secondaryColor: "#6366f1",
      borderRadius: "0.5rem",
    });
    toast.success("Brand customization reset to defaults");
  };

  const presetThemes = [
    { name: "Blue", primary: "#3b82f6", secondary: "#6366f1" },
    { name: "Green", primary: "#10b981", secondary: "#34d399" },
    { name: "Purple", primary: "#8b5cf6", secondary: "#d8b4fe" },
    { name: "Red", primary: "#ef4444", secondary: "#fca5a5" },
    { name: "Slate", primary: "#64748b", secondary: "#cbd5e1" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Brand Customization</DialogTitle>
          <DialogDescription>
            Customize the brand colors and styling for your application. Changes apply instantly.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="styling">Styling</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 mt-4">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Brand Color</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryColor: e.target.value })
                    }
                    className="h-10 w-full cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Accent Color</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      setFormData({ ...formData, secondaryColor: e.target.value })
                    }
                    className="h-10 w-full cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryColor: e.target.value })
                  }
                  className="flex-1"
                  placeholder="#6366f1"
                />
              </div>
            </div>

            {/* Preset Themes */}
            <div className="space-y-2">
              <Label>Preset Themes</Label>
              <div className="grid grid-cols-5 gap-2">
                {presetThemes.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        primaryColor: theme.primary,
                        secondaryColor: theme.secondary,
                      })
                    }
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={theme.name}
                  >
                    <div className="flex gap-1">
                      <div
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <div
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: theme.secondary }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="styling" className="space-y-4 mt-4">
            {/* Border Radius */}
            <div className="space-y-2">
              <Label htmlFor="borderRadius">Border Radius</Label>
              <Select value={formData.borderRadius} onValueChange={(value) => setFormData({ ...formData, borderRadius: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0px">Sharp (0px)</SelectItem>
                  <SelectItem value="0.25rem">Extra Small (4px)</SelectItem>
                  <SelectItem value="0.375rem">Small (6px)</SelectItem>
                  <SelectItem value="0.5rem">Medium (8px)</SelectItem>
                  <SelectItem value="0.75rem">Large (12px)</SelectItem>
                  <SelectItem value="1rem">Extra Large (16px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-4 border rounded-lg space-y-3">
                <div
                  className="p-3 text-white font-semibold"
                  style={{
                    backgroundColor: formData.primaryColor,
                    borderRadius: formData.borderRadius,
                  }}
                >
                  Primary Button
                </div>
                <div
                  className="p-3 text-white font-semibold"
                  style={{
                    backgroundColor: formData.secondaryColor,
                    borderRadius: formData.borderRadius,
                  }}
                >
                  Secondary Button
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Apply Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandCustomizationModal;
