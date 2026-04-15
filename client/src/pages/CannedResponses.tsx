import { useState, useMemo } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Settings,
  Tag,
} from "lucide-react";

interface CannedFormState {
  title: string;
  content: string;
  category: string;
  shortCode: string;
}

const emptyForm: CannedFormState = {
  title: "",
  content: "",
  category: "General",
  shortCode: "",
};

export default function CannedResponses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CannedFormState>(emptyForm);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const { data: responses = [], isLoading, refetch } = trpc.cannedResponses.list.useQuery();
  const createMutation = trpc.cannedResponses.create.useMutation({
    onSuccess: () => { toast.success("Response created"); setIsCreateDialogOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.cannedResponses.update.useMutation({
    onSuccess: () => { toast.success("Response updated"); setEditingId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.cannedResponses.delete.useMutation({
    onSuccess: () => { toast.success("Response deleted"); setDeletingId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Derive unique categories from responses
  const categories = useMemo(() => {
    const cats = new Set(responses.map((r) => r.category));
    return Array.from(cats).sort();
  }, [responses]);

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      const matchCat = !selectedCategory || r.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [responses, selectedCategory, searchQuery]);

  function openCreate() {
    setFormState(emptyForm);
    setIsCreateDialogOpen(true);
  }

  function openEdit(id: string) {
    const item = responses.find((r) => r.id === id);
    if (!item) return;
    setFormState({
      title: item.title,
      content: item.content,
      category: item.category,
      shortCode: item.shortCode ?? "",
    });
    setEditingId(id);
  }

  function handleCopyContent(content: string) {
    const text = content.replace(/<[^>]+>/g, ""); // strip HTML tags
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  }

  function handleSubmitCreate() {
    if (!formState.title.trim() || !formState.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    createMutation.mutate({
      title: formState.title,
      content: formState.content,
      category: formState.category || "General",
      shortCode: formState.shortCode || undefined,
    });
  }

  function handleSubmitEdit() {
    if (!editingId || !formState.title.trim() || !formState.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    updateMutation.mutate({
      id: editingId,
      title: formState.title,
      content: formState.content,
      category: formState.category || "General",
      shortCode: formState.shortCode || undefined,
    });
  }

  return (
    <ModuleLayout
      title="Canned Responses"
      description="Pre-written responses for quick replies to common support queries"
      icon={<MessageSquare className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Communications", href: "/communications" },
        { label: "Canned Responses" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Response
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 max-w-6xl">

        <div className="flex gap-4">
          {/* Sidebar: categories */}
          <aside className="w-52 shrink-0 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Categories
            </p>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              All Responses
              <Badge variant="secondary" className="ml-2 text-xs">
                {responses.length}
              </Badge>
            </button>
            {categories.map((cat) => {
              const count = responses.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    {cat}
                  </span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </button>
              );
            })}
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground px-2">No categories yet</p>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search responses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Response list */}
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 opacity-30" />
                  <p className="font-medium">No canned responses found</p>
                  <p className="text-xs">
                    {responses.length === 0
                      ? "Create your first canned response to get started."
                      : "Try changing the category or search query."}
                  </p>
                  {responses.length === 0 && (
                    <Button size="sm" onClick={openCreate} className="mt-1">
                      <Plus className="h-4 w-4 mr-2" />New Response
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <Card key={item.id} className="group">
                    <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {item.category}
                          </Badge>
                          {item.shortCode && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              #{item.shortCode}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopyContent(item.content)}
                          title="Copy text"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(item.id)}
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(item.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div
                        className="text-sm text-muted-foreground line-clamp-3 prose prose-sm max-w-none [&_p]:my-0 [&_ul]:my-0 [&_li]:my-0"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Canned Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Thank you for contacting us"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g., General, Billing, Technical"
                  value={formState.category}
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short Code <span className="text-muted-foreground text-xs">(optional — for quick inserts)</span></Label>
              <Input
                placeholder="e.g., thankyou, follow-up"
                value={formState.shortCode}
                onChange={(e) => setFormState({ ...formState, shortCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Response Content *</Label>
              <RichTextEditor
                value={formState.content}
                onChange={(v) => setFormState({ ...formState, content: v })}
                placeholder="Write your canned response here..."
                minHeight="160px"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Canned Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Thank you for contacting us"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g., General, Billing, Technical"
                  value={formState.category}
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  list="category-suggestions-edit"
                />
                <datalist id="category-suggestions-edit">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short Code <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="e.g., thankyou, follow-up"
                value={formState.shortCode}
                onChange={(e) => setFormState({ ...formState, shortCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Response Content *</Label>
              <RichTextEditor
                key={editingId ?? "edit"}
                value={formState.content}
                onChange={(v) => setFormState({ ...formState, content: v })}
                placeholder="Write your canned response here..."
                minHeight="160px"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Canned Response?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The canned response will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate({ id: deletingId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Categories dialog (informational) */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Categories are automatically created when you assign one to a canned response. To rename a category,
            edit each response and update its category field.
          </p>
          <div className="space-y-2 mt-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories created yet.</p>
            ) : (
              categories.map((c) => (
                <div key={c} className="flex items-center justify-between px-3 py-2 border rounded-md text-sm">
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {c}
                  </span>
                  <Badge variant="secondary">
                    {responses.filter((r) => r.category === c).length} responses
                  </Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
