import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { WebsiteNav } from "./website/WebsiteNav";
import { WebsiteFooter } from "./website/WebsiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, ArrowLeft, Search, Tag, User } from "lucide-react";

export default function Blog() {
  const { data: posts } = trpc.websiteAdmin.publicBlogPosts.useQuery();
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = [...new Set((posts || []).map((p: any) => p.category).filter(Boolean))];

  const filtered = (posts || []).filter((p: any) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.excerpt || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <WebsiteNav />
        <div className="max-w-3xl mx-auto px-4 pt-32 pb-16">
          <Button variant="ghost" className="mb-6 text-indigo-600" onClick={() => setSelectedPost(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
          </Button>
          <article>
            <h1 className="text-4xl font-black mb-4">{selectedPost.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
              {selectedPost.author && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{selectedPost.author}</span>}
              {selectedPost.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(selectedPost.publishedAt).toLocaleDateString()}
                </span>
              )}
              {selectedPost.category && <Badge variant="secondary">{selectedPost.category}</Badge>}
            </div>
            <div className="prose prose-gray max-w-none whitespace-pre-wrap leading-relaxed">
              {selectedPost.content}
            </div>
            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="flex gap-2 mt-8 pt-6 border-t">
                <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
                {selectedPost.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
          </article>
        </div>
        <WebsiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <WebsiteNav />
      <section className="pt-32 pb-16 bg-gradient-to-b from-indigo-50/80 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-indigo-50 text-indigo-600 border border-indigo-200">Blog</Badge>
          <h1 className="text-5xl font-black mb-4">Latest Insights</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Tips, guides, and news from the Nexus360 team.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant={!categoryFilter ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter("")}>All</Button>
              {categories.map((cat) => (
                <Button key={cat} variant={categoryFilter === cat ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter(cat)}>{cat}</Button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg font-medium">No articles yet</p>
              <p className="text-sm">Check back soon for new content.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post: any) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedPost(post)}
                >
                  {post.coverImageUrl && (
                    <div className="h-48 bg-gray-100 overflow-hidden">
                      <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}
                  <div className="p-6">
                    {post.category && <Badge variant="secondary" className="mb-3">{post.category}</Badge>}
                    <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">{post.title}</h3>
                    {post.excerpt && <p className="text-sm text-gray-500 line-clamp-3 mb-4">{post.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {post.author && <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author}</span>}
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <WebsiteFooter />
    </div>
  );
}
