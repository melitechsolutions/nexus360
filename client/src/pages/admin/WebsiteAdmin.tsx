import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  FileText,
  Navigation,
  Settings,
  Mail,
  Eye,
  ExternalLink,
  Save,
  Search,
  MessageSquare,
  BarChart3,
  Megaphone,
  Link2,
  GripVertical,
  CheckCircle2,
  Clock,
  Archive,
  Reply,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Minus,
  Download,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Users,
  Layers,
  LayoutGrid,
  Copy,
  Check,
  DollarSign,
  Star,
  BookOpen,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export default function WebsiteAdmin() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <ModuleLayout
      title="Website Administration"
      description="Manage your public website pages, navigation, SEO, and settings"
      icon={<Globe className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm/super-admin" },
        { label: "Administration", href: "/admin/management" },
        { label: "Website Admin" },
      ]}
    >
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="outline" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View Website
          </a>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Pages</span>
          </TabsTrigger>
          <TabsTrigger value="navigation" className="gap-2">
            <Navigation className="h-4 w-4" />
            <span className="hidden sm:inline">Navigation</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="inquiries" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Inquiries</span>
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Footer</span>
          </TabsTrigger>
          <TabsTrigger value="about-content" className="gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">About</span>
          </TabsTrigger>
          <TabsTrigger value="features-content" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Testimonials</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Blog</span>
          </TabsTrigger>
          <TabsTrigger value="hero" className="gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Hero</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="pages">
          <PagesTab />
        </TabsContent>
        <TabsContent value="navigation">
          <NavigationTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingTab />
        </TabsContent>
        <TabsContent value="inquiries">
          <InquiriesTab />
        </TabsContent>
        <TabsContent value="footer">
          <FooterTab />
        </TabsContent>
        <TabsContent value="about-content">
          <AboutContentTab />
        </TabsContent>
        <TabsContent value="features-content">
          <FeaturesContentTab />
        </TabsContent>
        <TabsContent value="testimonials">
          <TestimonialsTab />
        </TabsContent>
        <TabsContent value="faq">
          <FAQTab />
        </TabsContent>
        <TabsContent value="blog">
          <BlogTab />
        </TabsContent>
        <TabsContent value="hero">
          <HeroTab />
        </TabsContent>
      </Tabs>
    </div>
    </ModuleLayout>
  );
}

// ── Overview Tab ────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: pages } = trpc.websiteAdmin.getPages.useQuery();
  const { data: analytics } = trpc.websiteAdmin.getAnalytics.useQuery();
  const { data: contacts } = trpc.websiteAdmin.getContactSubmissions.useQuery();
  const { data: settings } = trpc.websiteAdmin.getSettings.useQuery();

  const publishedCount = pages?.filter(p => p.isPublished).length ?? 0;
  const totalPages = pages?.length ?? 0;
  const newInquiries = contacts?.filter(c => c.status === "new").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2.5">
                <Globe className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPages}</p>
                <p className="text-sm text-muted-foreground">Total Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2.5">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{newInquiries}</p>
                <p className="text-sm text-muted-foreground">New Inquiries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2.5">
                <Megaphone className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{settings?.announcementEnabled ? "Active" : "Off"}</p>
                <p className="text-sm text-muted-foreground">Banner Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <Globe className="h-5 w-5 text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">View Live Website</p>
                <p className="text-xs text-muted-foreground">Open public-facing website in new tab</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="/features" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <FileText className="h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Preview Features Page</p>
                <p className="text-xs text-muted-foreground">Check product features presentation</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="/pricing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Preview Pricing Page</p>
                <p className="text-xs text-muted-foreground">Review pricing tiers and comparisons</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="/contact" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <Mail className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Preview Contact Page</p>
                <p className="text-xs text-muted-foreground">Test contact form and info display</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Inquiries</CardTitle>
            <CardDescription>Latest contact form submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {!contacts?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No inquiries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`rounded-full p-1 mt-0.5 ${c.status === "new" ? "bg-blue-100" : "bg-gray-100"}`}>
                      <Mail className={`h-3.5 w-3.5 ${c.status === "new" ? "text-blue-600" : "text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        {c.status === "new" && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.subject || c.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pages Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Website Pages</CardTitle>
          <CardDescription>Status and SEO overview for all public pages</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SEO Title</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages?.map((page) => (
                <TableRow key={page.slug}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{page.path}</TableCell>
                  <TableCell>
                    <Badge variant={page.isPublished ? "default" : "secondary"} className={page.isPublished ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                      {page.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {page.seoTitle || <span className="italic opacity-50">Not set</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={page.path} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Pages Tab ───────────────────────────────────────────────────────────
function PagesTab() {
  const utils = trpc.useUtils();
  const { data: pages, isLoading } = trpc.websiteAdmin.getPages.useQuery();
  const updatePage = trpc.websiteAdmin.updatePage.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getPages.invalidate();
      toast.success("Page settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [seoForm, setSeoForm] = useState<Record<string, { seoTitle: string; seoDescription: string; seoKeywords: string }>>({});

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading pages...</div>;
  }

  const handleTogglePublished = (slug: string, current: boolean) => {
    updatePage.mutate({ slug, isPublished: !current });
  };

  const handleSaveSeo = (slug: string) => {
    const form = seoForm[slug];
    if (!form) return;
    updatePage.mutate({ slug, ...form });
  };

  const toggleExpand = (slug: string) => {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
    } else {
      setExpandedSlug(slug);
      const page = pages?.find(p => p.slug === slug);
      if (page && !seoForm[slug]) {
        setSeoForm(prev => ({
          ...prev,
          [slug]: {
            seoTitle: page.seoTitle,
            seoDescription: page.seoDescription,
            seoKeywords: page.seoKeywords,
          },
        }));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Page Management</h2>
          <p className="text-sm text-muted-foreground">Toggle visibility and configure SEO metadata for each page</p>
        </div>
      </div>

      <div className="space-y-3">
        {pages?.map((page) => (
          <Card key={page.slug} className={expandedSlug === page.slug ? "ring-2 ring-indigo-200" : ""}>
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExpand(page.slug)} className="text-muted-foreground hover:text-foreground">
                    {expandedSlug === page.slug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{page.title}</h3>
                      <Badge variant={page.isPublished ? "default" : "secondary"} className={`text-[11px] ${page.isPublished ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}`}>
                        {page.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{page.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono hidden md:block">{page.path}</code>
                <Button variant="ghost" size="sm" asChild>
                  <a href={page.path} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                <Switch
                  checked={page.isPublished}
                  onCheckedChange={() => handleTogglePublished(page.slug, page.isPublished)}
                />
              </div>
            </div>

            {expandedSlug === page.slug && (
              <div className="border-t px-4 pb-4 pt-4 bg-muted/30">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  SEO Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`seo-title-${page.slug}`}>SEO Title</Label>
                    <Input
                      id={`seo-title-${page.slug}`}
                      placeholder={`${page.title} | Nexus360`}
                      value={seoForm[page.slug]?.seoTitle ?? page.seoTitle}
                      onChange={(e) =>
                        setSeoForm(prev => ({
                          ...prev,
                          [page.slug]: { ...prev[page.slug], seoTitle: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`seo-keywords-${page.slug}`}>Keywords</Label>
                    <Input
                      id={`seo-keywords-${page.slug}`}
                      placeholder="keyword1, keyword2, keyword3"
                      value={seoForm[page.slug]?.seoKeywords ?? page.seoKeywords}
                      onChange={(e) =>
                        setSeoForm(prev => ({
                          ...prev,
                          [page.slug]: { ...prev[page.slug], seoKeywords: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`seo-desc-${page.slug}`}>Meta Description</Label>
                    <Textarea
                      id={`seo-desc-${page.slug}`}
                      placeholder="Brief description for search engines (150-160 characters recommended)"
                      rows={2}
                      value={seoForm[page.slug]?.seoDescription ?? page.seoDescription}
                      onChange={(e) =>
                        setSeoForm(prev => ({
                          ...prev,
                          [page.slug]: { ...prev[page.slug], seoDescription: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={() => handleSaveSeo(page.slug)} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save SEO Settings
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Navigation Tab ──────────────────────────────────────────────────────
function NavigationTab() {
  const utils = trpc.useUtils();
  const { data: navConfig, isLoading } = trpc.websiteAdmin.getNavigation.useQuery();
  const updateNav = trpc.websiteAdmin.updateNavigation.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getNavigation.invalidate();
      toast.success("Navigation updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState<{
    mainLinks: { label: string; href: string; visible: boolean }[];
    resourceLinks: { label: string; href: string; visible: boolean }[];
    ctaText: string;
    ctaLink: string;
  } | null>(null);

  // Initialize form when data loads
  const current = form ?? navConfig;
  if (!current) {
    return <div className="text-center py-12 text-muted-foreground">{isLoading ? "Loading..." : "No configuration found"}</div>;
  }

  const handleSave = () => {
    if (!current) return;
    updateNav.mutate(current);
    setForm(null);
  };

  const updateMainLink = (idx: number, field: string, value: any) => {
    const updated = { ...(form ?? navConfig!!) };
    updated.mainLinks = [...updated.mainLinks];
    updated.mainLinks[idx] = { ...updated.mainLinks[idx], [field]: value };
    setForm(updated as any);
  };

  const updateResourceLink = (idx: number, field: string, value: any) => {
    const updated = { ...(form ?? navConfig!!) };
    updated.resourceLinks = [...updated.resourceLinks];
    updated.resourceLinks[idx] = { ...updated.resourceLinks[idx], [field]: value };
    setForm(updated as any);
  };

  const updateCta = (field: string, value: string) => {
    setForm(prev => ({ ...(prev ?? navConfig!!), [field]: value } as any));
  };

  const addMainLink = () => {
    const updated = { ...(form ?? navConfig!!) };
    updated.mainLinks = [...updated.mainLinks, { label: "", href: "/", visible: true }];
    setForm(updated as any);
  };

  const removeMainLink = (idx: number) => {
    const updated = { ...(form ?? navConfig!!) };
    updated.mainLinks = updated.mainLinks.filter((_: any, i: number) => i !== idx);
    setForm(updated as any);
  };

  const addResourceLink = () => {
    const updated = { ...(form ?? navConfig!!) };
    updated.resourceLinks = [...updated.resourceLinks, { label: "", href: "/", visible: true }];
    setForm(updated as any);
  };

  const removeResourceLink = (idx: number) => {
    const updated = { ...(form ?? navConfig!!) };
    updated.resourceLinks = updated.resourceLinks.filter((_: any, i: number) => i !== idx);
    setForm(updated as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Navigation Management</h2>
          <p className="text-sm text-muted-foreground">Configure the website header navigation links and CTA button</p>
        </div>
        <Button onClick={handleSave} disabled={updateNav.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Main Navigation Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Main Navigation Links</CardTitle>
          <CardDescription>Primary links shown in the website header</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {current.mainLinks.map((link, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <Input
                  value={link.label}
                  onChange={(e) => updateMainLink(idx, "label", e.target.value)}
                  placeholder="Label"
                />
                <Input
                  value={link.href}
                  onChange={(e) => updateMainLink(idx, "href", e.target.value)}
                  placeholder="/path"
                  className="font-mono text-sm"
                />
                <div className="flex items-center gap-2">
                  <Switch checked={link.visible} onCheckedChange={(v) => updateMainLink(idx, "visible", v)} />
                  <span className="text-sm text-muted-foreground">{link.visible ? "Visible" : "Hidden"}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMainLink(idx)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMainLink} className="gap-2 w-full border-dashed">
            <Plus className="h-4 w-4" />
            Add Navigation Link
          </Button>
        </CardContent>
      </Card>

      {/* Resource Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Links</CardTitle>
          <CardDescription>Links shown in the "Resources" dropdown menu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {current.resourceLinks.map((link, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <Input
                  value={link.label}
                  onChange={(e) => updateResourceLink(idx, "label", e.target.value)}
                  placeholder="Label"
                />
                <Input
                  value={link.href}
                  onChange={(e) => updateResourceLink(idx, "href", e.target.value)}
                  placeholder="/path"
                  className="font-mono text-sm"
                />
                <div className="flex items-center gap-2">
                  <Switch checked={link.visible} onCheckedChange={(v) => updateResourceLink(idx, "visible", v)} />
                  <span className="text-sm text-muted-foreground">{link.visible ? "Visible" : "Hidden"}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeResourceLink(idx)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addResourceLink} className="gap-2 w-full border-dashed">
            <Plus className="h-4 w-4" />
            Add Resource Link
          </Button>
        </CardContent>
      </Card>

      {/* CTA Button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call-to-Action Button</CardTitle>
          <CardDescription>The primary action button in the navigation header</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={current.ctaText}
                onChange={(e) => updateCta("ctaText", e.target.value)}
                placeholder="Get Started"
              />
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input
                value={current.ctaLink}
                onChange={(e) => updateCta("ctaLink", e.target.value)}
                placeholder="/signup"
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Settings Tab ────────────────────────────────────────────────────────
function SettingsTab() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.websiteAdmin.getSettings.useQuery();
  const updateSettings = trpc.websiteAdmin.updateSettings.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getSettings.invalidate();
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState<Record<string, any>>({});
  const current = { ...settings, ...form };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading settings...</div>;
  }

  const handleSave = () => {
    updateSettings.mutate(form as any);
    setForm({});
  };

  const setField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Website Settings</h2>
          <p className="text-sm text-muted-foreground">General configuration, contact info, social links, and more</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending || Object.keys(form).length === 0} className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Site Title</Label>
              <Input
                value={current.siteTitle ?? ""}
                onChange={(e) => setField("siteTitle", e.target.value)}
                placeholder="Nexus360"
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={current.tagline ?? ""}
                onChange={(e) => setField("tagline", e.target.value)}
                placeholder="Complete Business Management Platform"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hero Title Override</Label>
              <Input
                value={current.heroTitle ?? ""}
                onChange={(e) => setField("heroTitle", e.target.value)}
                placeholder="Leave empty for default"
              />
            </div>
            <div className="space-y-2">
              <Label>Hero Subtitle Override</Label>
              <Input
                value={current.heroSubtitle ?? ""}
                onChange={(e) => setField("heroSubtitle", e.target.value)}
                placeholder="Leave empty for default"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
          <CardDescription>Displayed on the Contact page and website footer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={current.contactEmail ?? ""}
                onChange={(e) => setField("contactEmail", e.target.value)}
                placeholder="info@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={current.contactPhone ?? ""}
                onChange={(e) => setField("contactPhone", e.target.value)}
                placeholder="+254 700 000 000"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input
                value={current.contactAddress ?? ""}
                onChange={(e) => setField("contactAddress", e.target.value)}
                placeholder="123 Business Street, Nairobi, Kenya"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Social Media Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input
                value={current.socialLinkedIn ?? ""}
                onChange={(e) => setField("socialLinkedIn", e.target.value)}
                placeholder="https://linkedin.com/company/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter / X</Label>
              <Input
                value={current.socialTwitter ?? ""}
                onChange={(e) => setField("socialTwitter", e.target.value)}
                placeholder="https://twitter.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={current.socialFacebook ?? ""}
                onChange={(e) => setField("socialFacebook", e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={current.socialInstagram ?? ""}
                onChange={(e) => setField("socialInstagram", e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcement Banner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcement Banner
          </CardTitle>
          <CardDescription>Display a notification banner across the top of the website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={current.announcementEnabled ?? false}
              onCheckedChange={(v) => setField("announcementEnabled", v)}
            />
            <Label>Enable announcement banner</Label>
          </div>
          <div className="space-y-2">
            <Label>Banner Message</Label>
            <Textarea
              value={current.announcementBanner ?? ""}
              onChange={(e) => setField("announcementBanner", e.target.value)}
              placeholder="🚀 We just launched new features! Check them out..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Analytics & Scripts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytics & Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Google Analytics ID</Label>
            <Input
              value={current.googleAnalyticsId ?? ""}
              onChange={(e) => setField("googleAnalyticsId", e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Head Script</Label>
            <Textarea
              value={current.customHeadScript ?? ""}
              onChange={(e) => setField("customHeadScript", e.target.value)}
              placeholder="<!-- Paste tracking scripts here -->"
              rows={3}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Scripts injected into the &lt;head&gt; section of all pages</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Inquiries Tab ───────────────────────────────────────────────────────
function InquiriesTab() {
  const utils = trpc.useUtils();
  const { data: contacts, isLoading } = trpc.websiteAdmin.getContactSubmissions.useQuery();
  const updateStatus = trpc.websiteAdmin.updateContactStatus.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getContactSubmissions.invalidate();
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteContact = trpc.websiteAdmin.deleteContact.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getContactSubmissions.invalidate();
      toast.success("Inquiry deleted");
    },
    onError: (err) => toast.error(err.message),
  });
  const bulkUpdate = trpc.websiteAdmin.bulkUpdateContacts.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getContactSubmissions.invalidate();
      setSelected(new Set());
      toast.success("Bulk action applied");
    },
    onError: (err) => toast.error(err.message),
  });

  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading inquiries...</div>;
  }

  const filtered = (filter === "all" ? contacts : contacts?.filter(c => c.status === filter))
    ?.filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.subject || "").toLowerCase().includes(search.toLowerCase()) ||
      c.message.toLowerCase().includes(search.toLowerCase())
    );

  const statusCounts = {
    all: contacts?.length ?? 0,
    new: contacts?.filter(c => c.status === "new").length ?? 0,
    read: contacts?.filter(c => c.status === "read").length ?? 0,
    replied: contacts?.filter(c => c.status === "replied").length ?? 0,
    archived: contacts?.filter(c => c.status === "archived").length ?? 0,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new": return <Mail className="h-4 w-4 text-blue-500" />;
      case "read": return <Eye className="h-4 w-4 text-amber-500" />;
      case "replied": return <Reply className="h-4 w-4 text-green-500" />;
      case "archived": return <Archive className="h-4 w-4 text-gray-400" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: "bg-blue-100 text-blue-700",
      read: "bg-amber-100 text-amber-700",
      replied: "bg-green-100 text-green-700",
      archived: "bg-gray-100 text-gray-500",
    };
    return (
      <Badge className={`${variants[status] ?? ""} text-xs`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const allSelected = !!filtered?.length && filtered.every(c => selected.has(c.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered?.map(c => c.id) ?? []));
    }
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const exportCSV = () => {
    if (!contacts?.length) return;
    const rows = [
      ["Name", "Email", "Phone", "Company", "Subject", "Message", "Status", "Date"],
      ...contacts.map(c => [
        c.name,
        c.email,
        c.phone ?? "",
        c.company ?? "",
        c.subject ?? "",
        `"${(c.message || "").replace(/"/g, '""')}"`,
        c.status,
        new Date(c.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inquiries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Contact Inquiries</h2>
          <p className="text-sm text-muted-foreground">Manage submissions from the website contact form</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!contacts?.length} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "new", "read", "replied", "archived"] as const).map(s => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
            className="gap-2"
          >
            {s === "all" ? <MessageSquare className="h-3.5 w-3.5" /> : getStatusIcon(s)}
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
              {statusCounts[s]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or subject..."
            className="pl-9"
          />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => bulkUpdate.mutate({ ids: Array.from(selected), action: "read" })}>
              Mark Read
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkUpdate.mutate({ ids: Array.from(selected), action: "archived" })}>
              Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkUpdate.mutate({ ids: Array.from(selected), action: "delete" })}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Inquiries List */}
      {!filtered?.length ? (
        <Card>
          <CardContent className="text-center py-16">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No {filter === "all" && !search ? "" : filter === "all" ? "matching" : filter} inquiries found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select All Row */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg border">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
            <span className="text-sm text-muted-foreground">Select all ({filtered.length})</span>
          </div>

          <div className="space-y-3">
            {filtered.map((contact) => (
              <Card
                key={contact.id}
                className={`transition-all ${expandedId === contact.id ? "ring-2 ring-indigo-200" : ""} ${contact.status === "new" ? "border-blue-200" : ""}`}
              >
                <div className="flex items-center gap-4 p-4">
                  <Checkbox
                    checked={selected.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                  >
                    <div className="flex-shrink-0">{getStatusIcon(contact.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.name}</span>
                        {getStatusBadge(contact.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{contact.subject || contact.message}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </span>
                      {expandedId === contact.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {expandedId === contact.id && (
                  <div className="border-t px-4 pb-4 pt-4 space-y-4 bg-muted/20">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                        <p className="text-sm">{contact.email}</p>
                      </div>
                      {contact.phone && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
                          <p className="text-sm">{contact.phone}</p>
                        </div>
                      )}
                      {contact.company && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Company</p>
                          <p className="text-sm">{contact.company}</p>
                        </div>
                      )}
                    </div>

                    {contact.subject && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                        <p className="text-sm">{contact.subject}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
                      <div className="bg-background rounded-lg border p-3 text-sm whitespace-pre-wrap">{contact.message}</div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Update status:</span>
                        <Select
                          value={contact.status}
                          onValueChange={(v) => updateStatus.mutate({ id: contact.id, status: v as any })}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="read">Read</SelectItem>
                            <SelectItem value="replied">Replied</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          Received: {new Date(contact.createdAt).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteContact.mutate({ id: contact.id })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Pricing Tab ─────────────────────────────────────────────────────────
function PricingTab() {
  const utils = trpc.useUtils();
  const { data: tiers, isLoading: tiersLoading } = trpc.multiTenancy.getPlanPrices.useQuery();
  const { data: publicData, isLoading: pubLoading } = trpc.websiteAdmin.publicPricing.useQuery();
  const saveMut = trpc.websiteAdmin.updatePricingConfig.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.publicPricing.invalidate();
      toast.success("Pricing page configuration saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Merge CRM tiers with any existing custom config
  const plans = useMemo(() => {
    if (!tiers || !Array.isArray(tiers)) return [];
    const custom = publicData?.customConfig?.plans as any[] | undefined;
    return tiers.map((t: any) => {
      const match = custom?.find((c: any) => c.tier === (t.planSlug ?? t.key));
      return {
        name: match?.name ?? t.planName ?? t.label ?? t.key,
        tier: t.planSlug ?? t.key,
        monthlyKes: match?.monthlyKes ?? Number(t.monthlyPrice ?? t.monthlyKes ?? 0),
        annualKes: match?.annualKes ?? Number(t.annualPrice ?? t.annualKes ?? 0),
        description: match?.description ?? t.description ?? "",
        highlight: match?.highlight ?? false,
        badge: match?.badge ?? null,
        cta: match?.cta ?? "Get Started",
        ctaLink: match?.ctaLink ?? `/signup?plan=${t.planSlug ?? t.key}`,
        maxUsers: match?.maxUsers ?? String(t.maxUsers ?? "Unlimited"),
        features: match?.features ?? (t.features
          ? Object.entries(t.features as Record<string, boolean>).map(([k, v]) => ({
              text: k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              included: Boolean(v),
            }))
          : []),
      };
    });
  }, [tiers, publicData]);

  const [edited, setEdited] = useState<typeof plans | null>(null);
  const current = edited ?? plans;

  const update = (idx: number, patch: Record<string, any>) =>
    setEdited(current.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const updateFeature = (planIdx: number, fIdx: number, patch: Record<string, any>) =>
    setEdited(
      current.map((p, i) =>
        i === planIdx
          ? { ...p, features: p.features.map((f: any, j: number) => (j === fIdx ? { ...f, ...patch } : f)) }
          : p,
      ),
    );

  const addFeature = (planIdx: number) =>
    setEdited(
      current.map((p, i) =>
        i === planIdx ? { ...p, features: [...p.features, { text: "", included: true }] } : p,
      ),
    );

  const removeFeature = (planIdx: number, fIdx: number) =>
    setEdited(
      current.map((p, i) =>
        i === planIdx ? { ...p, features: p.features.filter((_: any, j: number) => j !== fIdx) } : p,
      ),
    );

  const handleSave = () => {
    saveMut.mutate({
      config: {
        plans: current.map((p) => ({ ...p, badge: p.badge ?? null })),
        comparisonRows: publicData?.customConfig?.comparisonRows ?? [],
        faq: publicData?.customConfig?.faq ?? [],
      },
    });
    setEdited(null);
  };

  const isLoading = tiersLoading || pubLoading;

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading pricing tiers...</div>;
  }

  if (!current.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg mb-1">No pricing tiers found</p>
          <p className="text-sm">Create pricing tiers in the CRM Administration → Pricing Tiers page first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Public Pricing Page</h3>
          <p className="text-sm text-muted-foreground">
            Customize how pricing tiers appear on the public website. Tier prices &amp; features are managed in{" "}
            <span className="font-medium text-foreground">Administration → Pricing Tiers</span>.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!edited || saveMut.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMut.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        {current.map((plan, idx) => (
          <Card key={plan.tier} className={plan.highlight ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge variant="secondary">{plan.tier}</Badge>
                  {plan.highlight && <Badge variant="default">Highlighted</Badge>}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>KES {plan.monthlyKes.toLocaleString()}/mo</span>
                  <span>KES {plan.annualKes.toLocaleString()}/yr</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={plan.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CTA Button Text</Label>
                  <Input
                    value={plan.cta}
                    onChange={(e) => update(idx, { cta: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CTA Link</Label>
                  <Input
                    value={plan.ctaLink}
                    onChange={(e) => update(idx, { ctaLink: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Badge Text</Label>
                  <Input
                    value={plan.badge ?? ""}
                    placeholder="e.g. Most Popular"
                    onChange={(e) => update(idx, { badge: e.target.value || null })}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={plan.description}
                  rows={2}
                  onChange={(e) => update(idx, { description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plan.highlight}
                    onCheckedChange={(v) => update(idx, { highlight: v })}
                  />
                  <Label className="mb-0">Highlight on pricing page</Label>
                </div>
                <div>
                  <Label>Max Users</Label>
                  <Input
                    value={plan.maxUsers}
                    className="w-32 ml-2 inline-block"
                    onChange={(e) => update(idx, { maxUsers: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-0">Features displayed on pricing card</Label>
                  <Button size="sm" variant="outline" onClick={() => addFeature(idx)}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {plan.features.map((f: any, fIdx: number) => (
                    <div key={fIdx} className="flex items-center gap-2">
                      <Checkbox
                        checked={f.included}
                        onCheckedChange={(v) => updateFeature(idx, fIdx, { included: Boolean(v) })}
                      />
                      <Input
                        value={f.text}
                        className="flex-1"
                        placeholder="Feature description"
                        onChange={(e) => updateFeature(idx, fIdx, { text: e.target.value })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFeature(idx, fIdx)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Footer Tab ──────────────────────────────────────────────────────────
function FooterTab() {
  const utils = trpc.useUtils();
  const { data: footerConfig, isLoading } = trpc.websiteAdmin.getFooterConfig.useQuery();
  const updateFooter = trpc.websiteAdmin.updateFooterConfig.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getFooterConfig.invalidate();
      toast.success("Footer configuration saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState<{
    columns: { title: string; links: { label: string; href: string }[] }[];
    copyrightText: string;
    showCloudPartners: boolean;
    showComplianceBadges: boolean;
  } | null>(null);

  const current = form ?? footerConfig;

  if (!current) {
    return <div className="text-center py-12 text-muted-foreground">{isLoading ? "Loading..." : "No configuration found"}</div>;
  }

  const update = (updater: (draft: typeof current) => void) => {
    const copy = JSON.parse(JSON.stringify(current)) as typeof current;
    updater(copy);
    setForm(copy);
  };

  const handleSave = () => {
    if (!current) return;
    updateFooter.mutate({
      columns: current.columns,
      copyrightText: current.copyrightText,
      showCloudPartners: current.showCloudPartners,
      showComplianceBadges: current.showComplianceBadges,
    });
    setForm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Footer Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage footer link columns, copyright text, and optional sections</p>
        </div>
        <Button onClick={handleSave} disabled={updateFooter.isPending || !form} className="gap-2">
          <Save className="h-4 w-4" />
          Save Footer
        </Button>
      </div>

      {/* Link Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {current.columns.map((col, ci) => (
          <Card key={ci}>
            <CardHeader className="pb-3">
              <Input
                value={col.title}
                onChange={e => update(d => { d.columns[ci].title = e.target.value; })}
                className="font-semibold h-8 text-sm"
                placeholder="Column Title"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {col.links.map((link, li) => (
                <div key={li} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={link.label}
                      onChange={e => update(d => { d.columns[ci].links[li].label = e.target.value; })}
                      placeholder="Link label"
                      className="h-7 text-sm"
                    />
                    <Input
                      value={link.href}
                      onChange={e => update(d => { d.columns[ci].links[li].href = e.target.value; })}
                      placeholder="/path"
                      className="h-7 text-sm font-mono"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update(d => { d.columns[ci].links.splice(li, 1); })}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 flex-shrink-0 mt-0.5"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => update(d => { d.columns[ci].links.push({ label: "", href: "/" }); })}
                className="gap-1.5 w-full border-dashed mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Link
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display Options</CardTitle>
          <CardDescription>Control copyright text and optional footer sections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Custom Copyright Text</Label>
            <Input
              value={current.copyrightText ?? ""}
              onChange={e => update(d => { d.copyrightText = e.target.value; })}
              placeholder={`© ${new Date().getFullYear()} Nexus360. All rights reserved.`}
            />
            <p className="text-xs text-muted-foreground">Leave empty to use the auto-generated default</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={current.showCloudPartners ?? true}
              onCheckedChange={v => update(d => { d.showCloudPartners = v; })}
            />
            <div>
              <Label>Show Cloud Partners section</Label>
              <p className="text-xs text-muted-foreground">AWS, Azure, Google Cloud, and other infrastructure partners</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={current.showComplianceBadges ?? true}
              onCheckedChange={v => update(d => { d.showComplianceBadges = v; })}
            />
            <div>
              <Label>Show Security &amp; Compliance badges</Label>
              <p className="text-xs text-muted-foreground">GDPR, SOC 2, Encryption, MFA badges</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── About Content Tab ───────────────────────────────────────────────────
function AboutContentTab() {
  const utils = trpc.useUtils();
  const { data: content, isLoading } = trpc.websiteAdmin.getAboutContent.useQuery();
  const updateContent = trpc.websiteAdmin.updateAboutContent.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getAboutContent.invalidate();
      toast.success("About page content saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState<{
    heroTitle: string;
    heroSubtitle: string;
    missionText: string;
    stats: { label: string; value: string }[];
    values: { title: string; desc: string; icon: string; color: string }[];
    milestones: { year: string; event: string }[];
    team: { name: string; role: string; bio: string }[];
  }>({
    heroTitle: "",
    heroSubtitle: "",
    missionText: "",
    stats: [],
    values: [],
    milestones: [],
    team: [],
  });

  useEffect(() => {
    if (content) {
      setForm({
        heroTitle: content.heroTitle || "",
        heroSubtitle: content.heroSubtitle || "",
        missionText: content.missionText || "",
        stats: content.stats || [],
        values: content.values || [],
        milestones: content.milestones || [],
        team: content.team || [],
      });
    }
  }, [content]);

  const save = () => updateContent.mutate(form);

  if (isLoading) return <div className="flex items-center justify-center p-8"><span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">About Page Content</h3>
          <p className="text-sm text-muted-foreground">Manage the content displayed on the public About page</p>
        </div>
        <Button onClick={save} disabled={updateContent.isPending}>{updateContent.isPending ? "Saving..." : "Save Changes"}</Button>
      </div>

      {/* Hero Section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Hero Section</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} placeholder="e.g. Our Story" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Textarea value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} placeholder="Short description under the hero title" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Mission */}
      <Card>
        <CardHeader><CardTitle className="text-base">Mission Statement</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.missionText} onChange={(e) => setForm({ ...form, missionText: e.target.value })} placeholder="Our mission is..." rows={4} />
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Stats</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, stats: [...form.stats, { label: "", value: "" }] })}>+ Add Stat</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.stats.map((s, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1"><Label>Label</Label><Input value={s.label} onChange={(e) => { const ns = [...form.stats]; ns[i] = { ...ns[i], label: e.target.value }; setForm({ ...form, stats: ns }); }} placeholder="e.g. Users" /></div>
              <div className="w-32"><Label>Value</Label><Input value={s.value} onChange={(e) => { const ns = [...form.stats]; ns[i] = { ...ns[i], value: e.target.value }; setForm({ ...form, stats: ns }); }} placeholder="e.g. 5,000+" /></div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setForm({ ...form, stats: form.stats.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {form.stats.length === 0 && <p className="text-sm text-muted-foreground">No stats added yet. Click "+ Add Stat" to begin.</p>}
        </CardContent>
      </Card>

      {/* Values */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Company Values</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, values: [...form.values, { title: "", desc: "", icon: "Shield", color: "from-blue-500 to-blue-600" }] })}>+ Add Value</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.values.map((v, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1"><Label>Title</Label><Input value={v.title} onChange={(e) => { const nv = [...form.values]; nv[i] = { ...nv[i], title: e.target.value }; setForm({ ...form, values: nv }); }} /></div>
                <div className="w-40"><Label>Icon name</Label><Input value={v.icon} onChange={(e) => { const nv = [...form.values]; nv[i] = { ...nv[i], icon: e.target.value }; setForm({ ...form, values: nv }); }} placeholder="Shield" /></div>
                <Button size="icon" variant="ghost" className="text-destructive mt-5" onClick={() => setForm({ ...form, values: form.values.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div><Label>Description</Label><Textarea value={v.desc} onChange={(e) => { const nv = [...form.values]; nv[i] = { ...nv[i], desc: e.target.value }; setForm({ ...form, values: nv }); }} rows={2} /></div>
              <div><Label>Color gradient</Label><Input value={v.color} onChange={(e) => { const nv = [...form.values]; nv[i] = { ...nv[i], color: e.target.value }; setForm({ ...form, values: nv }); }} placeholder="from-blue-500 to-blue-600" /></div>
            </div>
          ))}
          {form.values.length === 0 && <p className="text-sm text-muted-foreground">No values added yet.</p>}
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Timeline / Milestones</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, milestones: [...form.milestones, { year: "", event: "" }] })}>+ Add Milestone</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.milestones.map((m, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="w-24"><Label>Year</Label><Input value={m.year} onChange={(e) => { const nm = [...form.milestones]; nm[i] = { ...nm[i], year: e.target.value }; setForm({ ...form, milestones: nm }); }} placeholder="2024" /></div>
              <div className="flex-1"><Label>Event</Label><Input value={m.event} onChange={(e) => { const nm = [...form.milestones]; nm[i] = { ...nm[i], event: e.target.value }; setForm({ ...form, milestones: nm }); }} placeholder="What happened" /></div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setForm({ ...form, milestones: form.milestones.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {form.milestones.length === 0 && <p className="text-sm text-muted-foreground">No milestones added yet.</p>}
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Team Members</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, team: [...form.team, { name: "", role: "", bio: "" }] })}>+ Add Member</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.team.map((t, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1"><Label>Name</Label><Input value={t.name} onChange={(e) => { const nt = [...form.team]; nt[i] = { ...nt[i], name: e.target.value }; setForm({ ...form, team: nt }); }} /></div>
                <div className="flex-1"><Label>Role</Label><Input value={t.role} onChange={(e) => { const nt = [...form.team]; nt[i] = { ...nt[i], role: e.target.value }; setForm({ ...form, team: nt }); }} /></div>
                <Button size="icon" variant="ghost" className="text-destructive mt-5" onClick={() => setForm({ ...form, team: form.team.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div><Label>Bio</Label><Textarea value={t.bio} onChange={(e) => { const nt = [...form.team]; nt[i] = { ...nt[i], bio: e.target.value }; setForm({ ...form, team: nt }); }} rows={2} /></div>
            </div>
          ))}
          {form.team.length === 0 && <p className="text-sm text-muted-foreground">No team members added yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Features Content Tab ────────────────────────────────────────────────
function FeaturesContentTab() {
  const utils = trpc.useUtils();
  const { data: content, isLoading } = trpc.websiteAdmin.getFeaturesContent.useQuery();
  const updateContent = trpc.websiteAdmin.updateFeaturesContent.useMutation({
    onSuccess: () => {
      utils.websiteAdmin.getFeaturesContent.invalidate();
      toast.success("Features page content saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState<{
    heroTitle: string;
    heroBadge: string;
    heroSubtitle: string;
    sections: { category: string; desc: string; icon: string; features: string[] }[];
    pillars: { title: string; desc: string; icon: string }[];
  }>({
    heroTitle: "",
    heroBadge: "",
    heroSubtitle: "",
    sections: [],
    pillars: [],
  });

  useEffect(() => {
    if (content) {
      setForm({
        heroTitle: content.heroTitle || "",
        heroBadge: content.heroBadge || "",
        heroSubtitle: content.heroSubtitle || "",
        sections: content.sections || [],
        pillars: content.pillars || [],
      });
    }
  }, [content]);

  const save = () => updateContent.mutate(form);

  if (isLoading) return <div className="flex items-center justify-center p-8"><span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Features Page Content</h3>
          <p className="text-sm text-muted-foreground">Manage modules and platform pillars displayed on the public Features page</p>
        </div>
        <Button onClick={save} disabled={updateContent.isPending}>{updateContent.isPending ? "Saving..." : "Save Changes"}</Button>
      </div>

      {/* Hero Section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Hero Section</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Badge Text</Label>
            <Input value={form.heroBadge} onChange={(e) => setForm({ ...form, heroBadge: e.target.value })} placeholder="e.g. All-in-One Platform" />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} placeholder="e.g. Everything your team needs" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Textarea value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} placeholder="Short description" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Feature Sections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Feature Sections</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, sections: [...form.sections, { category: "", desc: "", icon: "Users", features: [] }] })}>+ Add Section</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.sections.map((sec, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex gap-2 items-start">
                <div className="flex-1"><Label>Category</Label><Input value={sec.category} onChange={(e) => { const ns = [...form.sections]; ns[i] = { ...ns[i], category: e.target.value }; setForm({ ...form, sections: ns }); }} placeholder="e.g. CRM & Sales" /></div>
                <div className="w-36"><Label>Icon name</Label><Input value={sec.icon} onChange={(e) => { const ns = [...form.sections]; ns[i] = { ...ns[i], icon: e.target.value }; setForm({ ...form, sections: ns }); }} placeholder="Users" /></div>
                <Button size="icon" variant="ghost" className="text-destructive mt-5" onClick={() => setForm({ ...form, sections: form.sections.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div><Label>Description</Label><Textarea value={sec.desc} onChange={(e) => { const ns = [...form.sections]; ns[i] = { ...ns[i], desc: e.target.value }; setForm({ ...form, sections: ns }); }} rows={2} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Features (one per line)</Label>
                </div>
                <Textarea
                  value={sec.features.join("\n")}
                  onChange={(e) => { const ns = [...form.sections]; ns[i] = { ...ns[i], features: e.target.value.split("\n") }; setForm({ ...form, sections: ns }); }}
                  rows={5}
                  placeholder={"Feature 1\nFeature 2\nFeature 3"}
                />
              </div>
            </div>
          ))}
          {form.sections.length === 0 && <p className="text-sm text-muted-foreground">No feature sections added yet. Click "+ Add Section" to begin.</p>}
        </CardContent>
      </Card>

      {/* Platform Pillars */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Platform Pillars</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, pillars: [...form.pillars, { title: "", desc: "", icon: "Shield" }] })}>+ Add Pillar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.pillars.map((p, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1"><Label>Title</Label><Input value={p.title} onChange={(e) => { const np = [...form.pillars]; np[i] = { ...np[i], title: e.target.value }; setForm({ ...form, pillars: np }); }} /></div>
              <div className="flex-1"><Label>Description</Label><Input value={p.desc} onChange={(e) => { const np = [...form.pillars]; np[i] = { ...np[i], desc: e.target.value }; setForm({ ...form, pillars: np }); }} /></div>
              <div className="w-28"><Label>Icon</Label><Input value={p.icon} onChange={(e) => { const np = [...form.pillars]; np[i] = { ...np[i], icon: e.target.value }; setForm({ ...form, pillars: np }); }} /></div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setForm({ ...form, pillars: form.pillars.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {form.pillars.length === 0 && <p className="text-sm text-muted-foreground">No pillars added yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Testimonials Tab ─────────────────────────────────────────────────
function TestimonialsTab() {
  const { data, refetch } = trpc.websiteAdmin.getTestimonials.useQuery();
  const updateMut = trpc.websiteAdmin.updateTestimonials.useMutation({ onSuccess: () => { refetch(); toast.success("Testimonials saved"); } });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { if (data) setItems(data); }, [data]);

  const addItem = () => {
    setItems([...items, { id: `t_${Date.now()}`, name: "", role: "", company: "", content: "", rating: 5, isVisible: true, avatarUrl: "" }]);
  };
  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));
  const update = (i: number, field: string, val: any) => {
    const n = [...items]; n[i] = { ...n[i], [field]: val }; setItems(n);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Testimonials Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Testimonial</Button>
          <Button onClick={() => updateMut.mutate(items)} disabled={updateMut.isPending}><Save className="h-4 w-4 mr-1" />Save All</Button>
        </div>
      </div>
      {items.map((item, i) => (
        <Card key={item.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1"><Label>Name</Label><Input value={item.name} onChange={(e) => update(i, "name", e.target.value)} /></div>
              <div className="flex-1"><Label>Role</Label><Input value={item.role || ""} onChange={(e) => update(i, "role", e.target.value)} /></div>
              <div className="flex-1"><Label>Company</Label><Input value={item.company || ""} onChange={(e) => update(i, "company", e.target.value)} /></div>
            </div>
            <div><Label>Testimonial</Label><Textarea value={item.content} onChange={(e) => update(i, "content", e.target.value)} rows={3} /></div>
            <div className="flex gap-3 items-end">
              <div className="w-24"><Label>Rating</Label><Input type="number" min={1} max={5} value={item.rating} onChange={(e) => update(i, "rating", parseInt(e.target.value) || 5)} /></div>
              <div className="flex items-center gap-2"><Switch checked={item.isVisible} onCheckedChange={(v) => update(i, "isVisible", v)} /><Label>Visible</Label></div>
              <Button size="icon" variant="ghost" className="text-destructive ml-auto" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No testimonials yet. Click "Add Testimonial" to get started.</CardContent></Card>}
    </div>
  );
}

// ── FAQ Tab ──────────────────────────────────────────────────────────
function FAQTab() {
  const { data, refetch } = trpc.websiteAdmin.getFAQs.useQuery();
  const updateMut = trpc.websiteAdmin.updateFAQs.useMutation({ onSuccess: () => { refetch(); toast.success("FAQs saved"); } });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { if (data) setItems(data); }, [data]);

  const addItem = () => {
    setItems([...items, { id: `faq_${Date.now()}`, question: "", answer: "", category: "General", order: items.length, isVisible: true }]);
  };
  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));
  const update = (i: number, field: string, val: any) => {
    const n = [...items]; n[i] = { ...n[i], [field]: val }; setItems(n);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">FAQ Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add FAQ</Button>
          <Button onClick={() => updateMut.mutate(items)} disabled={updateMut.isPending}><Save className="h-4 w-4 mr-1" />Save All</Button>
        </div>
      </div>
      {items.map((item, i) => (
        <Card key={item.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1"><Label>Question</Label><Input value={item.question} onChange={(e) => update(i, "question", e.target.value)} /></div>
              <div className="w-40"><Label>Category</Label><Input value={item.category || ""} onChange={(e) => update(i, "category", e.target.value)} /></div>
              <div className="w-20"><Label>Order</Label><Input type="number" value={item.order} onChange={(e) => update(i, "order", parseInt(e.target.value) || 0)} /></div>
            </div>
            <div><Label>Answer</Label><Textarea value={item.answer} onChange={(e) => update(i, "answer", e.target.value)} rows={3} /></div>
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2"><Switch checked={item.isVisible} onCheckedChange={(v) => update(i, "isVisible", v)} /><Label>Visible</Label></div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No FAQs yet. Click "Add FAQ" to get started.</CardContent></Card>}
    </div>
  );
}

// ── Blog Tab ─────────────────────────────────────────────────────────
function BlogTab() {
  const { data, refetch } = trpc.websiteAdmin.getBlogPosts.useQuery();
  const updateMut = trpc.websiteAdmin.updateBlogPosts.useMutation({ onSuccess: () => { refetch(); toast.success("Blog posts saved"); } });
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => { if (data) setPosts(data); }, [data]);

  const addPost = () => {
    const id = `post_${Date.now()}`;
    const newPost = {
      id, title: "", slug: "", excerpt: "", content: "", author: "", category: "General",
      tags: [], coverImageUrl: "", isPublished: false, publishedAt: "", createdAt: new Date().toISOString(),
    };
    setPosts([newPost, ...posts]);
    setEditing(id);
  };
  const remove = (i: number) => setPosts(posts.filter((_, j) => j !== i));
  const update = (i: number, field: string, val: any) => {
    const n = [...posts]; n[i] = { ...n[i], [field]: val }; setPosts(n);
  };
  const autoSlug = (i: number, title: string) => {
    update(i, "title", title);
    update(i, "slug", title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Blog Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addPost}><Plus className="h-4 w-4 mr-1" />New Post</Button>
          <Button onClick={() => updateMut.mutate(posts)} disabled={updateMut.isPending}><Save className="h-4 w-4 mr-1" />Save All</Button>
        </div>
      </div>

      {posts.map((post, i) => (
        <Card key={post.id}>
          <CardHeader className="cursor-pointer pb-2" onClick={() => setEditing(editing === post.id ? null : post.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{post.title || "Untitled Post"}</CardTitle>
                <Badge variant={post.isPublished ? "default" : "secondary"}>{post.isPublished ? "Published" : "Draft"}</Badge>
              </div>
              {editing === post.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {editing === post.id && (
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1"><Label>Title</Label><Input value={post.title} onChange={(e) => autoSlug(i, e.target.value)} /></div>
                <div className="flex-1"><Label>Slug</Label><Input value={post.slug} onChange={(e) => update(i, "slug", e.target.value)} /></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><Label>Author</Label><Input value={post.author || ""} onChange={(e) => update(i, "author", e.target.value)} /></div>
                <div className="flex-1"><Label>Category</Label><Input value={post.category || ""} onChange={(e) => update(i, "category", e.target.value)} /></div>
              </div>
              <div><Label>Excerpt</Label><Textarea value={post.excerpt || ""} onChange={(e) => update(i, "excerpt", e.target.value)} rows={2} /></div>
              <div><Label>Content</Label><Textarea value={post.content} onChange={(e) => update(i, "content", e.target.value)} rows={10} /></div>
              <div><Label>Tags (comma-separated)</Label><Input value={(post.tags || []).join(", ")} onChange={(e) => update(i, "tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))} /></div>
              <div className="flex gap-3 items-end">
                <div className="flex items-center gap-2"><Switch checked={post.isPublished} onCheckedChange={(v) => { update(i, "isPublished", v); if (v && !post.publishedAt) update(i, "publishedAt", new Date().toISOString()); }} /><Label>Published</Label></div>
                <Button size="icon" variant="ghost" className="text-destructive ml-auto" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
      {posts.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No blog posts. Click "New Post" to create your first article.</CardContent></Card>}
    </div>
  );
}

// ── Hero Tab ─────────────────────────────────────────────────────────
function HeroTab() {
  const { data, refetch } = trpc.websiteAdmin.getHeroContent.useQuery();
  const updateMut = trpc.websiteAdmin.updateHeroContent.useMutation({ onSuccess: () => { refetch(); toast.success("Hero content saved"); } });
  const [form, setForm] = useState({
    badge: "", title: "", subtitle: "",
    ctaPrimary: { label: "Get Started", href: "/signup" },
    ctaSecondary: { label: "Watch Demo", href: "/demo" },
    stats: [] as { label: string; value: string }[],
  });

  useEffect(() => {
    if (data) setForm({
      badge: data.badge || "",
      title: data.title || "",
      subtitle: data.subtitle || "",
      ctaPrimary: data.ctaPrimary || { label: "Get Started", href: "/signup" },
      ctaSecondary: data.ctaSecondary || { label: "Watch Demo", href: "/demo" },
      stats: data.stats || [],
    });
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Landing Page Hero</h3>
        <Button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}><Save className="h-4 w-4 mr-1" />Save</Button>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div><Label>Badge Text</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Nexus360 CRM Platform" /></div>
          <div><Label>Title</Label><Textarea value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} rows={2} placeholder="Main hero headline" /></div>
          <div><Label>Subtitle</Label><Textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} rows={2} placeholder="Supporting text" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">CTA Buttons</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1"><Label>Primary Label</Label><Input value={form.ctaPrimary.label} onChange={(e) => setForm({ ...form, ctaPrimary: { ...form.ctaPrimary, label: e.target.value } })} /></div>
            <div className="flex-1"><Label>Primary Href</Label><Input value={form.ctaPrimary.href} onChange={(e) => setForm({ ...form, ctaPrimary: { ...form.ctaPrimary, href: e.target.value } })} /></div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><Label>Secondary Label</Label><Input value={form.ctaSecondary.label} onChange={(e) => setForm({ ...form, ctaSecondary: { ...form.ctaSecondary, label: e.target.value } })} /></div>
            <div className="flex-1"><Label>Secondary Href</Label><Input value={form.ctaSecondary.href} onChange={(e) => setForm({ ...form, ctaSecondary: { ...form.ctaSecondary, href: e.target.value } })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Stats</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, stats: [...form.stats, { label: "", value: "" }] })}>+ Add Stat</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.stats.map((s, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1"><Label>Value</Label><Input value={s.value} onChange={(e) => { const ns = [...form.stats]; ns[i] = { ...ns[i], value: e.target.value }; setForm({ ...form, stats: ns }); }} placeholder="10,000+" /></div>
              <div className="flex-1"><Label>Label</Label><Input value={s.label} onChange={(e) => { const ns = [...form.stats]; ns[i] = { ...ns[i], label: e.target.value }; setForm({ ...form, stats: ns }); }} placeholder="Active Users" /></div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setForm({ ...form, stats: form.stats.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {form.stats.length === 0 && <p className="text-sm text-muted-foreground">No stats added yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
