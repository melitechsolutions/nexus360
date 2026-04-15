import { useState, useMemo } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  StickyNote,
  Plus,
  Pin,
  Star,
  Trash2,
  Edit2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  favorite: boolean;
  createdAt: string;
}

const CATEGORIES = ["General", "Work", "Ideas", "Meeting", "Personal", "Follow-up"];

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Work: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Ideas: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Meeting: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Personal: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Follow-up": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const SAMPLE_NOTES_REMOVED = true; // Data now comes from backend

function isThisWeek(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo && date <= now;
}

export default function Notes() {
  const utils = trpc.useUtils();
  const { data: rawNotes = [], isLoading } = trpc.notes.list.useQuery({});
  const notes = JSON.parse(JSON.stringify(rawNotes)) as Note[];
  const createMutation = trpc.notes.create.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); setDialogOpen(false); toast.success("Note created successfully"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); setDialogOpen(false); toast.success("Note updated successfully"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); toast.success("Note deleted"); },
    onError: (err) => toast.error(err.message),
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formPinned, setFormPinned] = useState(false);

  const filtered = useMemo(() => {
    let result = notes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") {
      result = result.filter((n) => n.category === categoryFilter);
    }
    // Pinned notes first
    return result.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notes, search, categoryFilter]);

  const totalNotes = notes.length;
  const favoriteCount = notes.filter((n) => n.favorite).length;
  const recentCount = notes.filter((n) => isThisWeek(n.createdAt)).length;

  function openCreate() {
    setEditingNote(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("General");
    setFormPinned(false);
    setDialogOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormPinned(note.pinned);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (editingNote) {
      updateMutation.mutate({
        id: editingNote.id,
        title: formTitle,
        content: formContent,
        category: formCategory,
        pinned: formPinned,
      });
    } else {
      createMutation.mutate({
        title: formTitle,
        content: formContent,
        category: formCategory,
        pinned: formPinned,
      });
    }
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  function toggleFavorite(id: string) {
    const note = notes.find((n) => n.id === id);
    if (note) updateMutation.mutate({ id, favorite: !note.favorite });
  }

  function togglePin(id: string) {
    const note = notes.find((n) => n.id === id);
    if (note) updateMutation.mutate({ id, pinned: !note.pinned });
  }

  return (
    <ModuleLayout
      title="Notes"
      icon={<StickyNote className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Notes" },
      ]}
      actions={
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 p-2.5">
              <StickyNote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Notes</p>
              <p className="text-2xl font-bold">{totalNotes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2.5">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Favorites</p>
              <p className="text-2xl font-bold">{favoriteCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/40 p-2.5">
              <Edit2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recent (This Week)</p>
              <p className="text-2xl font-bold">{recentCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <StickyNote className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">{isLoading ? "Loading notes..." : "No notes found"}</p>
          <p className="text-sm">Create a new note or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((note) => (
            <Card
              key={note.id}
              className={cn(
                "group relative transition-shadow hover:shadow-md",
                note.pinned && "ring-1 ring-blue-300 dark:ring-blue-700"
              )}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                    {note.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePin(note.id)}
                      className={cn(
                        "p-1 rounded hover:bg-muted transition-colors",
                        note.pinned ? "text-blue-500" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(note.id)}
                      className={cn(
                        "p-1 rounded hover:bg-muted transition-colors",
                        note.favorite ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", note.favorite && "fill-current")} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                  {note.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[note.category])}>
                      {note.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(note)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                placeholder="Note title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                placeholder="Write your note..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={5}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="note-pinned"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="note-pinned" className="cursor-pointer">
                Pin this note
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingNote ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
