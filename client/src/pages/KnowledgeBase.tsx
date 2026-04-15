import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Search,
  Clock,
  Eye,
  ChevronRight,
  FileText,
  Star,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
export default function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setShowCreateArticle(true); }, []);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);

  // Form state
  const [catForm, setCatForm] = useState({ name: "", slug: "", description: "", icon: "BookOpen", color: "bg-blue-500" });
  const [artForm, setArtForm] = useState({ title: "", categoryId: "", content: "", excerpt: "", status: "published", featured: false, readTime: 3, tags: "" });

  // tRPC queries
  const utils = trpc.useUtils();
  const { data: rawCategories = [], isLoading: catsLoading } = trpc.knowledgeBase.listCategories.useQuery();
  const { data: rawArticles = [], isLoading: artsLoading } = trpc.knowledgeBase.listArticles.useQuery(
    activeCategory ? { categoryId: activeCategory } : {}
  );
  const { data: rawAllArticles = [] } = trpc.knowledgeBase.listArticles.useQuery({});
  const { data: rawArticleDetail } = trpc.knowledgeBase.getArticle.useQuery(
    { id: activeArticleId! },
    { enabled: !!activeArticleId }
  );

  const categories = JSON.parse(JSON.stringify(rawCategories)) as any[];
  const articles = JSON.parse(JSON.stringify(rawArticles)) as any[];
  const allArticles = JSON.parse(JSON.stringify(rawAllArticles)) as any[];
  const articleDetail = rawArticleDetail ? JSON.parse(JSON.stringify(rawArticleDetail)) : null;

  // Mutations
  const createCategory = trpc.knowledgeBase.createCategory.useMutation({ onSuccess: () => { utils.knowledgeBase.listCategories.invalidate(); toast.success("Category created"); setShowCreateCategory(false); } });
  const updateCategory = trpc.knowledgeBase.updateCategory.useMutation({ onSuccess: () => { utils.knowledgeBase.listCategories.invalidate(); toast.success("Category updated"); setEditingCategory(null); } });
  const deleteCategory = trpc.knowledgeBase.deleteCategory.useMutation({ onSuccess: () => { utils.knowledgeBase.listCategories.invalidate(); utils.knowledgeBase.listArticles.invalidate(); toast.success("Category deleted"); } });
  const createArticle = trpc.knowledgeBase.createArticle.useMutation({ onSuccess: () => { utils.knowledgeBase.listArticles.invalidate(); toast.success("Article created"); setShowCreateArticle(false); } });
  const updateArticle = trpc.knowledgeBase.updateArticle.useMutation({ onSuccess: () => { utils.knowledgeBase.listArticles.invalidate(); utils.knowledgeBase.getArticle.invalidate(); toast.success("Article updated"); setEditingArticle(null); } });
  const deleteArticle = trpc.knowledgeBase.deleteArticle.useMutation({ onSuccess: () => { utils.knowledgeBase.listArticles.invalidate(); toast.success("Article deleted"); } });

  const isLoading = catsLoading || artsLoading;

  const featuredArticles = useMemo(() => allArticles.filter((a: any) => a.featured).slice(0, 6), [allArticles]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allArticles.filter((a: any) => a.title.toLowerCase().includes(q));
  }, [search, allArticles]);

  const displayCategory = activeCategory ? categories.find((c: any) => c.id === activeCategory) : null;

  const categoryArticles = useMemo(() => {
    if (!activeCategory) return [];
    return articles;
  }, [activeCategory, articles]);

  const getCategoryArticleCount = (catId: string) => allArticles.filter((a: any) => a.categoryId === catId).length;

  // Article detail view
  if (activeArticleId && articleDetail) {
    const cat = categories.find((c: any) => c.id === articleDetail.categoryId);
    return (
      <ModuleLayout
        title="Knowledge Base"
        description="Help guides and documentation"
        icon={<BookOpen className="h-5 w-5" />}
      >
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" className="gap-1 mb-4 -ml-2" onClick={() => setActiveArticleId(null)}>
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </Button>
          <div className="border rounded-lg p-8 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {articleDetail.readTime || 3} min read
                <span>·</span>
                <Eye className="h-3 w-3" /> {(articleDetail.views || 0).toLocaleString()} views
                {articleDetail.featured && <>
                  <span>·</span>
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                </>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  setEditingArticle(articleDetail);
                  setArtForm({ title: articleDetail.title, categoryId: articleDetail.categoryId, content: articleDetail.content || "", excerpt: articleDetail.excerpt || "", status: articleDetail.status || "published", featured: !!articleDetail.featured, readTime: articleDetail.readTime || 3, tags: articleDetail.tags || "" });
                }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                  if (confirm("Delete this article?")) { deleteArticle.mutate({ id: articleDetail.id }); setActiveArticleId(null); }
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {cat && <Badge variant="secondary" className="mb-3">{cat.name}</Badge>}
            <h1 className="text-2xl font-bold mb-4">{articleDetail.title}</h1>
            {articleDetail.excerpt && <p className="text-muted-foreground mb-4 italic">{articleDetail.excerpt}</p>}
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
              {articleDetail.content || "This article is currently being authored. Check back soon for the full guide."}
            </div>
            {articleDetail.tags && (
              <div className="flex gap-1 mt-4 flex-wrap">
                {articleDetail.tags.split(",").map((t: string) => <Badge key={t.trim()} variant="outline" className="text-xs">{t.trim()}</Badge>)}
              </div>
            )}
          </div>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Knowledge Base"
      description="Help guides, tutorials, and documentation for Nexus360"
      icon={<BookOpen className="h-5 w-5" />}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setCatForm({ name: "", slug: "", description: "", icon: "BookOpen", color: "bg-blue-500" }); setShowCreateCategory(true); }}>
            <FolderPlus className="h-4 w-4 mr-1" /> Category
          </Button>
          <Button size="sm" onClick={() => { setArtForm({ title: "", categoryId: categories[0]?.id || "", content: "", excerpt: "", status: "published", featured: false, readTime: 3, tags: "" }); setShowCreateArticle(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Article
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Search */}
          <div className="max-w-xl mx-auto mb-8 mt-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-12 h-12 text-base rounded-full border-2 focus-visible:ring-2"
                placeholder="Search articles, guides, documentation..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded-xl mt-2 bg-popover shadow-md overflow-hidden">
                {searchResults.slice(0, 8).map((a: any) => (
                  <button
                    key={a.id}
                    onClick={() => { setSearch(""); setActiveArticleId(a.id); }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 text-left transition-colors border-b last:border-0"
                  >
                    <span className="text-sm">{a.title}</span>
                    <span className="text-xs text-muted-foreground ml-4 shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {a.readTime || 3}m
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {displayCategory ? (
            <>
              <Button variant="ghost" size="sm" className="gap-1 mb-4 -ml-2" onClick={() => setActiveCategory(null)}>
                <ChevronRight className="h-4 w-4 rotate-180" /> All Categories
              </Button>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-xl text-white", displayCategory.color || "bg-blue-500")}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{displayCategory.name}</h2>
                    <p className="text-sm text-muted-foreground">{displayCategory.description}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditingCategory(displayCategory);
                    setCatForm({ name: displayCategory.name, slug: displayCategory.slug, description: displayCategory.description || "", icon: displayCategory.icon || "BookOpen", color: displayCategory.color || "bg-blue-500" });
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                    if (confirm("Delete this category and all its articles?")) { deleteCategory.mutate({ id: displayCategory.id }); setActiveCategory(null); }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {categoryArticles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No articles in this category yet.</p>
                  <Button size="sm" className="mt-3" onClick={() => { setArtForm({ ...artForm, categoryId: displayCategory.id }); setShowCreateArticle(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Article
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryArticles.map((a: any) => (
                    <button
                      key={a.id}
                      onClick={() => setActiveArticleId(a.id)}
                      className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted/40 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{a.title}</span>
                        {a.featured && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground ml-4 shrink-0">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.readTime || 3} min</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {a.views || 0}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Featured Articles */}
              {featuredArticles.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Featured Articles
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {featuredArticles.map((a: any) => {
                      const cat = categories.find((c: any) => c.id === a.categoryId);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setActiveArticleId(a.id)}
                          className="border rounded-lg p-4 hover:bg-muted/40 text-left transition-colors group"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("p-1.5 rounded-md text-white", cat?.color || "bg-blue-500")}>
                              <BookOpen className="h-3 w-3" />
                            </div>
                            <span className="text-xs text-muted-foreground">{cat?.name || "Uncategorized"}</span>
                          </div>
                          <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">{a.title}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.readTime || 3} min</span>
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {a.views || 0}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Browse by Category</h2>
                {categories.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border rounded-lg">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No categories yet. Create your first category to get started.</p>
                    <Button size="sm" className="mt-3" onClick={() => setShowCreateCategory(true)}>
                      <FolderPlus className="h-4 w-4 mr-1" /> Create Category
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {categories.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className="flex flex-col p-5 border rounded-lg hover:bg-muted/40 text-left transition-colors group hover:border-primary/40"
                      >
                        <div className={cn("p-2.5 rounded-xl text-white w-fit mb-3", cat.color || "bg-blue-500")}>
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-sm group-hover:text-primary transition-colors">{cat.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cat.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <Badge variant="secondary" className="text-xs">{getCategoryArticleCount(cat.id)} articles</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Create/Edit Category Dialog */}
      <Dialog open={showCreateCategory || !!editingCategory} onOpenChange={v => { if (!v) { setShowCreateCategory(false); setEditingCategory(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>Organize your knowledge base articles into categories.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} placeholder="e.g. Getting Started" /></div>
            <div><Label>Slug</Label><Input value={catForm.slug} onChange={e => setCatForm(p => ({ ...p, slug: e.target.value }))} placeholder="getting-started" /></div>
            <div><Label>Description</Label><Textarea value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Color</Label>
                <Select value={catForm.color} onValueChange={v => setCatForm(p => ({ ...p, color: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["bg-blue-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-pink-500","bg-cyan-500","bg-orange-500","bg-slate-500","bg-red-500","bg-teal-500"].map(c => (
                      <SelectItem key={c} value={c}><span className="flex items-center gap-2"><span className={cn("w-3 h-3 rounded-full", c)} />{c.replace("bg-","").replace("-500","")}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Sort Order</Label><Input type="number" value={catForm.icon} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateCategory(false); setEditingCategory(null); }}>Cancel</Button>
            <Button disabled={!catForm.name || !catForm.slug} onClick={() => {
              if (editingCategory) {
                updateCategory.mutate({ id: editingCategory.id, name: catForm.name, description: catForm.description, color: catForm.color });
              } else {
                createCategory.mutate({ name: catForm.name, slug: catForm.slug, description: catForm.description, icon: catForm.icon, color: catForm.color });
              }
            }}>
              {(createCategory.isPending || updateCategory.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Article Dialog */}
      <Dialog open={showCreateArticle || !!editingArticle} onOpenChange={v => { if (!v) { setShowCreateArticle(false); setEditingArticle(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
            <DialogDescription>Write and publish knowledge base articles.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div><Label>Title</Label><Input value={artForm.title} onChange={e => setArtForm(p => ({ ...p, title: e.target.value }))} placeholder="Article title" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={artForm.categoryId} onValueChange={v => setArtForm(p => ({ ...p, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={artForm.status} onValueChange={v => setArtForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Excerpt</Label><Input value={artForm.excerpt} onChange={e => setArtForm(p => ({ ...p, excerpt: e.target.value }))} placeholder="Brief description" /></div>
            <div><Label>Content</Label><RichTextEditor value={artForm.content} onChange={html => setArtForm(p => ({ ...p, content: html }))} minHeight="250px" placeholder="Article content..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Read Time (min)</Label><Input type="number" value={artForm.readTime} onChange={e => setArtForm(p => ({ ...p, readTime: parseInt(e.target.value) || 3 }))} /></div>
              <div><Label>Tags (comma-separated)</Label><Input value={artForm.tags} onChange={e => setArtForm(p => ({ ...p, tags: e.target.value }))} placeholder="tag1, tag2" /></div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={artForm.featured} onChange={e => setArtForm(p => ({ ...p, featured: e.target.checked }))} className="rounded" />
                  Featured
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateArticle(false); setEditingArticle(null); }}>Cancel</Button>
            <Button disabled={!artForm.title || !artForm.categoryId} onClick={() => {
              if (editingArticle) {
                updateArticle.mutate({ id: editingArticle.id, title: artForm.title, categoryId: artForm.categoryId, content: artForm.content, excerpt: artForm.excerpt, status: artForm.status, featured: artForm.featured, readTime: artForm.readTime, tags: artForm.tags });
              } else {
                createArticle.mutate({ title: artForm.title, categoryId: artForm.categoryId, content: artForm.content, excerpt: artForm.excerpt, status: artForm.status, featured: artForm.featured, readTime: artForm.readTime, tags: artForm.tags });
              }
            }}>
              {(createArticle.isPending || updateArticle.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingArticle ? "Update" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
