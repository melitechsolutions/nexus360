import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Palette,
  Layout,
  Settings,
  Zap,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    id: "theme-customization",
    title: "Theme Customization",
    description: "Customize light & dark modes, card backgrounds, and theme presets for your application",
    icon: <Palette className="h-5 w-5" />,
    href: "/tools/theme-customization",
    borderColor: "border-l-purple-500",
    iconBg: "bg-purple-50 dark:bg-purple-950",
    iconColor: "text-purple-600 dark:text-purple-300",
    badge: "NEW",
  },
  {
    id: "brand-customization",
    title: "Brand Customization",
    description: "Set company branding, colors, typography, and visual guidelines that integrate with your theme",
    icon: <Zap className="h-5 w-5" />,
    href: "/tools/brand-customization",
    borderColor: "border-l-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-300",
  },
  {
    id: "homepage-builder",
    title: "Homepage Builder",
    description: "Customize your dashboard homepage with widgets and cards. Configure which modules appear on your dashboard",
    icon: <Layout className="h-5 w-5" />,
    href: "/tools/homepage-builder",
    borderColor: "border-l-green-500",
    iconBg: "bg-green-50 dark:bg-green-950",
    iconColor: "text-green-600 dark:text-green-300",
  },
  {
    id: "system-settings",
    title: "System Settings",
    description: "Configure application-wide settings, permissions, and system preferences",
    icon: <Settings className="h-5 w-5" />,
    href: "/tools/system-settings",
    borderColor: "border-l-orange-500",
    iconBg: "bg-orange-50 dark:bg-orange-950",
    iconColor: "text-orange-600 dark:text-orange-300",
  },
  {
    id: "integration-guides",
    title: "Integration Guides",
    description: "Documentation and guides for integrating brand settings into your codebase",
    icon: <BookOpen className="h-5 w-5" />,
    href: "/tools/integration-guides",
    borderColor: "border-l-red-500",
    iconBg: "bg-red-50 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-300",
  },
];

export default function Tools() {
  const [, navigate] = useLocation();

  return (
    <ModuleLayout
      title="Tools & Customization"
      description="Master control center for application customization, branding, and settings"
      icon={<Settings className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Tools" },
      ]}
    >
      <div className="space-y-8">
        {/* Overview Section */}
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl">Customize Your Application</CardTitle>
            <CardDescription className="text-base">
              Manage themes, branding, and application settings in one unified control center
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">🎨 Theme Engine</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Create and manage light/dark mode themes with multiple preset variations
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">🏢 Brand Guide</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Define your company brand identity and auto-apply colors throughout the app
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">⚙️ Unified Control</div>
                <p className="text-slate-600 dark:text-slate-400">
                  All theme and branding changes instantly applied across the entire application
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tools Grid - Unified Card Style */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Available Tools</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => !tool.disabled && navigate(tool.href)}
                disabled={tool.disabled}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-l-4 p-4 sm:p-5 text-left transition-all duration-300",
                  "bg-white dark:bg-slate-800/60 border-t border-r border-b border-slate-200 dark:border-slate-700",
                  "hover:shadow-xl hover:-translate-y-1 cursor-pointer",
                  tool.disabled && "opacity-60 cursor-not-allowed",
                  tool.borderColor
                )}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${tool.iconBg}`}>
                      <div className={tool.iconColor}>{tool.icon}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50">{tool.title}</h3>
                    {tool.badge && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded">{tool.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tool.description}</p>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Links Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common customization tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => navigate("/tools/theme-customization")}
              >
                <div className="text-left">
                  <div className="font-semibold">Switch Theme Preset</div>
                  <div className="text-xs text-muted-foreground">Choose from dark, light, or custom themes</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => navigate("/tools/brand-customization")}
              >
                <div className="text-left">
                  <div className="font-semibold">Update Brand Colors</div>
                  <div className="text-xs text-muted-foreground">Customize your company brand identity</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => navigate("/tools/homepage-builder")}
              >
                <div className="text-left">
                  <div className="font-semibold">Customize Dashboard</div>
                  <div className="text-xs text-muted-foreground">Enable/disable widgets and rearrange layout</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => {
                  const theme = document.documentElement.style.cssText;
                  const config = {
                    exportedAt: new Date().toISOString(),
                    cssVariables: theme,
                    source: "crm-platform",
                  };
                  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "theme-config.json";
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Theme configuration exported");
                }}
              >
                <div className="text-left">
                  <div className="font-semibold">Export Theme Configuration</div>
                  <div className="text-xs text-muted-foreground">Download your theme as JSON</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
