import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ExternalLink,
  Code,
  Copy,
  Check,
  AlertCircle,
  Zap,
  Palette,
  Layout,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IntegrationGuide {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "theme" | "brand" | "homepage" | "api";
  difficulty: "beginner" | "intermediate" | "advanced";
  steps: {
    title: string;
    code?: string;
    description: string;
  }[];
  links: {
    label: string;
    url: string;
  }[];
}

const INTEGRATION_GUIDES: IntegrationGuide[] = [
  {
    id: "theme-integration",
    title: "Integrate Theme Customization",
    description: "Learn how to programmatically apply custom theme settings in your codebase",
    icon: <Palette className="h-6 w-6" />,
    category: "theme",
    difficulty: "beginner",
    steps: [
      {
        title: "Import Theme Hook",
        description: "Import the useTheme hook from the contexts directory",
        code: "import { useTheme } from '@/contexts/ThemeContext';",
      },
      {
        title: "Access Theme Config",
        description: "Use the hook in your component to get current theme settings",
        code: `const { theme, setTheme } = useTheme();`,
      },
      {
        title: "Apply Theme Classes",
        description: "Apply theme classes to your components",
        code: `<div className={theme.darkMode ? 'bg-slate-900' : 'bg-white'}>
  Your content here
</div>`,
      },
    ],
    links: [
      { label: "Theme Context Documentation", url: "#" },
      { label: "Color Palette Reference", url: "#" },
      { label: "Theme Examples", url: "#" },
    ],
  },
  {
    id: "brand-integration",
    title: "Integrate Brand Customization",
    description: "Apply brand colors and typography across your application",
    icon: <Zap className="h-6 w-6" />,
    category: "brand",
    difficulty: "beginner",
    steps: [
      {
        title: "Fetch Brand Config",
        description: "Query the brand customization API to get current branding",
        code: `const { data: brandConfig } = trpc.brandCustomization.getConfig.useQuery();`,
      },
      {
        title: "Create CSS Variables",
        description: "Create root CSS variables for brand colors",
        code: `:root {
  --primary-color: ${"{brandConfig.primaryColor}"};
  --secondary-color: ${"{brandConfig.secondaryColor}"};
  --accent-color: ${"{brandConfig.accentColor}"};
}`,
      },
      {
        title: "Apply in Stylesheets",
        description: "Use CSS variables in your styles",
        code: `.button {
  background-color: var(--primary-color);
  color: var(--lightText);
}`,
      },
    ],
    links: [
      { label: "Brand Guidelines", url: "#" },
      { label: "API Reference", url: "#" },
      { label: "Component Examples", url: "#" },
    ],
  },
  {
    id: "homepage-integration",
    title: "Build Custom Homepage Widgets",
    description: "Create and integrate custom widgets for the homepage builder",
    icon: <Layout className="h-6 w-6" />,
    category: "homepage",
    difficulty: "intermediate",
    steps: [
      {
        title: "Create Widget Component",
        description: "Create a new widget component that extends the Widget interface",
        code: `interface Widget {
  id: string;
  title: string;
  category: 'finance' | 'hr' | 'sales';
  enabled: boolean;
  size: 'small' | 'medium' | 'large';
}`,
      },
      {
        title: "Implement Widget Logic",
        description: "Implement the widget's data fetching and rendering logic",
        code: `export function CustomWidget() {
  const { data } = trpc.module.getData.useQuery();
  return <div>{/* Your widget content */}</div>;
}`,
      },
      {
        title: "Register Widget",
        description: "Add the widget to the AVAILABLE_WIDGETS object",
        code: `AVAILABLE_WIDGETS.customWidget = {
  id: 'custom',
  title: 'Your Widget',
  // ... other properties
};`,
      },
    ],
    links: [
      { label: "Widget Architecture", url: "#" },
      { label: "Component Library", url: "#" },
      { label: "Widget Examples", url: "#" },
    ],
  },
  {
    id: "api-integration",
    title: "API Integration Guide",
    description: "Integrate CRM APIs into your external systems",
    icon: <Code className="h-6 w-6" />,
    category: "api",
    difficulty: "advanced",
    steps: [
      {
        title: "Authentication",
        description: "Set up API authentication with bearer tokens",
        code: `const headers = {
  'Authorization': 'Bearer YOUR_API_TOKEN',
  'Content-Type': 'application/json'
};`,
      },
      {
        title: "Make API Request",
        description: "Make API requests to the tRPC endpoint",
        code: `fetch('/api/trpc/items.list', {
  method: 'GET',
  headers: headers,
})
  .then(res => res.json())
  .then(data => console.log(data));`,
      },
      {
        title: "Handle Responses",
        description: "Properly handle API responses and errors",
        code: `if (response.ok) {
  const data = await response.json();
  // Process data
} else {
  console.error('API Error:', response.statusText);
}`,
      },
    ],
    links: [
      { label: "API Documentation", url: "#" },
      { label: "Authentication Methods", url: "#" },
      { label: "Code Examples", url: "#" },
    ],
  },
];

export default function IntegrationGuides() {
  const [, navigate] = useLocation();
  const [selectedGuide, setSelectedGuide] = useState<IntegrationGuide | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGuides = INTEGRATION_GUIDES.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ModuleLayout
      title="Integration Guides"
      description="Complete documentation for integrating brand and theme customization into your applications"
      icon={<BookOpen className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "Integration Guides" },
      ]}
    >
      <div className="space-y-8 max-w-7xl">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Guides</Label>
          <Input
            id="search"
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Two-Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Guides List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Available Guides</h2>
            <div className="space-y-2">
              {filteredGuides.length === 0 ? (
                <Card className="p-4 text-center text-muted-foreground">
                  No guides found matching your search
                </Card>
              ) : (
                filteredGuides.map((guide) => (
                  <Card
                    key={guide.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedGuide?.id === guide.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : ""
                    )}
                    onClick={() => setSelectedGuide(guide)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="text-slate-600 dark:text-slate-400 mt-1">
                          {guide.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm line-clamp-2">
                            {guide.title}
                          </CardTitle>
                          <Badge
                            className={cn("mt-2", getDifficultyColor(guide.difficulty))}
                          >
                            {guide.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Guide Details */}
          <div className="lg:col-span-2">
            {selectedGuide ? (
              <div className="space-y-6">
                {/* Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="text-blue-600 dark:text-blue-400">
                        {selectedGuide.icon}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">
                          {selectedGuide.title}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {selectedGuide.description}
                        </CardDescription>
                        <div className="flex gap-2 mt-4 flex-wrap">
                          <Badge variant="outline">{selectedGuide.category}</Badge>
                          <Badge className={getDifficultyColor(selectedGuide.difficulty)}>
                            {selectedGuide.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Steps */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Implementation Steps</h3>
                  {selectedGuide.steps.map((step, index) => (
                    <Card key={step.title || `step-${index}`}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Step {index + 1}: {step.title}
                        </CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </CardHeader>
                      {step.code && (
                        <CardContent>
                          <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 relative">
                            <pre className="text-slate-100 text-sm overflow-x-auto">
                              <code>{step.code}</code>
                            </pre>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2"
                              onClick={() => handleCopyCode(step.code!)}
                            >
                              {copiedCode === step.code ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Links */}
                {selectedGuide.links.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Additional Resources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedGuide.links.map((link) => (
                        <Button
                          key={link.url || link.label}
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => window.open(link.url, "_blank")}
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">Select a Guide</h3>
                  <p className="text-muted-foreground">
                    Choose a guide from the left to view implementation details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
