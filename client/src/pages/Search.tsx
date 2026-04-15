import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Search as SearchIcon, Users, FileText, DollarSign, FolderKanban, Receipt, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const categories = [
  { key: "all", label: "All", icon: SearchIcon },
  { key: "clients", label: "Clients", icon: Users },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "expenses", label: "Expenses", icon: Receipt },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [, navigate] = useLocation();

  const searchQuery = trpc.search.global.useQuery(
    { query, limit: 50 },
    { enabled: query.length >= 2, keepPreviousData: true }
  );

  const results = searchQuery.data?.results || searchQuery.data || [];
  const filteredResults = Array.isArray(results)
    ? category === "all"
      ? results
      : results.filter((r: any) => r.type === category || r.category === category)
    : [];

  const typeIcons: Record<string, any> = {
    client: Users,
    invoice: FileText,
    project: FolderKanban,
    expense: Receipt,
    product: Package,
    payment: DollarSign,
  };

  const handleNavigate = (result: any) => {
    const paths: Record<string, string> = {
      client: `/clients/${result.id}`,
      invoice: `/invoices/${result.id}`,
      project: `/projects/${result.id}`,
      expense: `/expenses/${result.id}`,
      payment: `/payments/${result.id}`,
      product: `/products/${result.id}`,
    };
    const path = paths[result.type] || paths[result.category];
    if (path) navigate(path);
  };

  return (
    <ModuleLayout
      title="Search"
      description="Search across all modules"
      icon={<SearchIcon className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Search" },
      ]}
    >
      <div className="space-y-6">

        {/* Search Input */}
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search clients, invoices, projects, expenses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 text-lg"
            autoFocus
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat.key}
              variant={category === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.key)}
            >
              <cat.icon className="h-4 w-4 mr-1" /> {cat.label}
            </Button>
          ))}
        </div>

        {/* Results */}
        {query.length < 2 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Type at least 2 characters to search across all modules.</p>
            </CardContent>
          </Card>
        ) : searchQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filteredResults.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No results found for "{query}".
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredResults.map((result: any, idx: number) => {
              const Icon = typeIcons[result.type] || typeIcons[result.category] || SearchIcon;
              return (
                <Card key={result.id || idx} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleNavigate(result)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.name || result.title || result.description}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle || result.email || result.reference || ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {result.type || result.category}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
