import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code,
  Eye,
  Copy,
  Download,
  AlertCircle,
  CheckCircle2,
  Zap,
  Maximize2,
  Minimize2,
  RefreshCw,
  FileCode,
  Palette,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface HTMLEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variables?: Array<{ label: string; value: string }>;
  minHeight?: string;
  height?: string;
}

interface ValidationError {
  line: number;
  type: "error" | "warning";
  message: string;
}

// ─── HTML Validation ─────────────────────────────────────────────────────────

function validateHTML(html: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = html.split("\n");

  // Check for unclosed tags
  const openTags: Array<{ tag: string; line: number }> = [];
  const selfClosingTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  lines.forEach((line, lineNum) => {
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*[^>]*\/?>/g;
    let match;

    while ((match = tagRegex.exec(line)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();

      if (fullTag.startsWith("</")) {
        // Closing tag
        if (openTags.length === 0 || openTags[openTags.length - 1].tag !== tagName) {
          errors.push({
            line: lineNum + 1,
            type: "error",
            message: `Mismatched closing tag: </${tagName}>`,
          });
        } else {
          openTags.pop();
        }
      } else if (!fullTag.endsWith("/>") && !selfClosingTags.has(tagName)) {
        // Opening tag
        openTags.push({ tag: tagName, line: lineNum + 1 });
      }
    }
  });

  // Report unclosed tags
  openTags.forEach((tag) => {
    errors.push({
      line: tag.line,
      type: "error",
      message: `Unclosed tag: <${tag.tag}>`,
    });
  });

  // Check for common issues
  lines.forEach((line, lineNum) => {
    // Warn about missing alt attributes in images
    if (/<img\s+(?!.*alt=)/.test(line)) {
      errors.push({
        line: lineNum + 1,
        type: "warning",
        message: "Image missing 'alt' attribute (accessibility issue)",
      });
    }

    // Warn about missing href in links
    if (/<a\s+(?!.*href=)/.test(line)) {
      errors.push({
        line: lineNum + 1,
        type: "warning",
        message: "Link missing 'href' attribute",
      });
    }
  });

  return errors.slice(0, 20); // Limit to 20 errors to avoid clutter
}

// ─── Syntax Highlighting (Simple) ────────────────────────────────────────────

function highlightHTML(html: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tagRegex = /(<[^>]+>|&[a-zA-Z0-9]+;|{{[^}]+}})/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    // Add text before tag
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-gray-700">
          {html.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Add colored tag
    const tag = match[0];
    let className = "text-blue-600";

    if (tag.startsWith("{{")) {
      className = "text-purple-600 font-semibold"; // Variables
    } else if (tag.startsWith("</")) {
      className = "text-orange-600"; // Closing tag
    } else if (tag.startsWith("<")) {
      className = "text-blue-600"; // Opening tag
    } else if (tag.startsWith("&")) {
      className = "text-green-600"; // Entity
    }

    parts.push(
      <span key={`tag-${match.index}`} className={className}>
        {tag}
      </span>
    );

    lastIndex = match.index + tag.length;
  }

  // Add remaining text
  if (lastIndex < html.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="text-gray-700">
        {html.substring(lastIndex)}
      </span>
    );
  }

  return parts;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HTMLEditor({
  value,
  onChange,
  placeholder = "Enter HTML code...",
  variables,
  minHeight = "300px",
  height,
}: HTMLEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Validate on change
  useEffect(() => {
    const newErrors = validateHTML(value);
    setErrors(newErrors);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success("HTML copied to clipboard");
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(value));
    element.setAttribute("download", "template.html");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("HTML downloaded");
  };

  const handleFormat = () => {
    try {
      // Simple HTML formatting
      let formatted = value
        .replace(/></g, ">\n<") // Add newlines between tags
        .replace(/\n+/g, "\n") // Remove multiple blank lines
        .trim();

      // Indent nested elements
      let indentLevel = 0;
      formatted = formatted
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("</")) indentLevel = Math.max(0, indentLevel - 1);
          const indent = "  ".repeat(indentLevel);
          if (!trimmed.startsWith("</") && (trimmed.startsWith("<") && !trimmed.endsWith("/>"))) {
            indentLevel++;
          }
          return indent + trimmed;
        })
        .join("\n");

      onChange(formatted);
      toast.success("HTML formatted");
    } catch (error) {
      toast.error("Failed to format HTML");
    }
  };

  const handleInsertVariable = (variable: { label: string; value: string }) => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const newValue = value.substring(0, start) + variable.value + value.substring(end);
      onChange(newValue);

      // Move cursor after inserted variable
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + variable.value.length;
          editorRef.current.focus();
        }
      }, 0);
    }
  };

  const hasErrors = errors.some((e) => e.type === "error");
  const hasWarnings = errors.some((e) => e.type === "warning");

  const editorContent = (
    <div
      className={cn(
        "border border-gray-300 rounded-lg bg-white overflow-hidden flex flex-col",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-0"
      )}
      style={{ height: isFullscreen ? "100vh" : height || minHeight }}
    >
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFormat}
            title="Auto-format HTML"
            className="h-8 w-8 p-0"
          >
            <Zap className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300" />

          {variables && variables.length > 0 && (
            <>
              <div className="flex gap-1 flex-wrap">
                {variables.slice(0, 5).map((v, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    onClick={() => handleInsertVariable(v)}
                    className="h-8 text-xs px-2"
                    title={v.label}
                  >
                    +{v.value}
                  </Button>
                ))}
                {variables.length > 5 && (
                  <span className="text-xs text-gray-500 px-2 py-1">
                    +{variables.length - 5} more
                  </span>
                )}
              </div>
              <div className="w-px h-6 bg-gray-300" />
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            title="Download HTML"
            className="h-8 w-8 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {hasErrors && (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.filter((e) => e.type === "error").length} error(s)</span>
            </div>
          )}
          {hasWarnings && !hasErrors && (
            <div className="flex items-center gap-1 text-amber-600 text-sm">
              <Info className="h-4 w-4" />
              <span>{errors.filter((e) => e.type === "warning").length} warning(s)</span>
            </div>
          )}
          {!hasErrors && !hasWarnings && (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Valid HTML</span>
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex flex-1 overflow-hidden bg-white">
        {/* Line Numbers */}
        {showLineNumbers && (
          <div className="bg-gray-100 border-r border-gray-200 py-2 px-2 overflow-hidden text-right font-mono text-xs text-gray-500 select-none w-12">
            {value.split("\n").map((_, i) => (
              <div key={i} className="h-6">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={editorRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "flex-1 p-3 font-mono text-sm resize-none outline-none bg-white text-gray-800 placeholder-gray-400",
            "border-0 focus:ring-0",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          )}
          spellCheck={false}
        />
      </div>

      {/* Error Panel */}
      {errors.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 max-h-32 overflow-y-auto">
          {errors.map((error, i) => (
            <div
              key={i}
              className={cn(
                "px-3 py-2 border-b border-gray-200 last:border-b-0 text-xs flex gap-2",
                error.type === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
              )}
            >
              <span className="font-semibold">Line {error.line}:</span>
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Tabs defaultValue="editor" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="editor" className="flex gap-2">
          <Code className="h-4 w-4" />
          HTML Editor
        </TabsTrigger>
        <TabsTrigger value="preview" className="flex gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="editor" className="mt-4">
        {editorContent}
      </TabsContent>

      <TabsContent value="preview" className="mt-4">
        <div className="border border-gray-300 rounded-lg bg-white p-4" style={{ minHeight, maxHeight: "800px", overflow: "auto" }}>
          {value ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <div className="text-gray-400 text-center py-8">
              Enter HTML code to see preview
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
