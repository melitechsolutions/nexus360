import React, { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "./RichTextEditor";
import {
  Image as ImageIcon,
  Type,
  Square,
  Minus,
  Link2,
  Share2,
  LayoutGrid,
  Code,
  Columns,
  FileText,
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Undo2,
  Redo2,
  Settings2,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  Video,
  Mail,
  MapPin,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type EditorMode = "blocks" | "richtext" | "code";
type PreviewDevice = "desktop" | "tablet" | "mobile";

interface BlockData {
  id: string;
  type: BlockType;
  content: string;
  props: Record<string, any>;
}

type BlockType =
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "social"
  | "video"
  | "html"
  | "header"
  | "footer";

interface EmailBlockEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variables?: Array<{ label: string; value: string }>;
  minHeight?: string;
}

// ─── Block Definitions ───────────────────────────────────────────────────────

const BLOCK_TYPES: Array<{ type: BlockType; label: string; icon: React.ReactNode; description: string }> = [
  { type: "text", label: "Text", icon: <Type className="h-5 w-5" />, description: "Rich text paragraph" },
  { type: "image", label: "Image", icon: <ImageIcon className="h-5 w-5" />, description: "Upload or link an image" },
  { type: "button", label: "Button", icon: <Square className="h-5 w-5" />, description: "Call-to-action button" },
  { type: "divider", label: "Divider", icon: <Minus className="h-5 w-5" />, description: "Horizontal line separator" },
  { type: "spacer", label: "Spacer", icon: <ArrowUpDown className="h-5 w-5" />, description: "Empty vertical space" },
  { type: "columns", label: "Columns", icon: <Columns className="h-5 w-5" />, description: "Multi-column layout" },
  { type: "social", label: "Social", icon: <Share2 className="h-5 w-5" />, description: "Social media links" },
  { type: "video", label: "Video", icon: <Video className="h-5 w-5" />, description: "Embedded video" },
  { type: "html", label: "HTML", icon: <Code className="h-5 w-5" />, description: "Custom HTML code" },
  { type: "header", label: "Header", icon: <Mail className="h-5 w-5" />, description: "Email header / banner" },
  { type: "footer", label: "Footer", icon: <MapPin className="h-5 w-5" />, description: "Footer with address / links" },
];

// ─── Block Rendering ─────────────────────────────────────────────────────────

function createBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultBlock(type: BlockType): BlockData {
  const id = createBlockId();
  switch (type) {
    case "text":
      return { id, type, content: "<p>Enter your text here...</p>", props: { align: "left", color: "#333333", fontSize: "14px" } };
    case "image":
      return { id, type, content: "", props: { src: "", alt: "Image", width: "100%", align: "center", link: "" } };
    case "button":
      return { id, type, content: "Click Here", props: { url: "#", bgColor: "#3b82f6", textColor: "#ffffff", borderRadius: "6px", align: "center", width: "auto", fontSize: "16px", padding: "12px 24px" } };
    case "divider":
      return { id, type, content: "", props: { color: "#e2e8f0", thickness: "1px", width: "100%", style: "solid" } };
    case "spacer":
      return { id, type, content: "", props: { height: "20px" } };
    case "columns":
      return { id, type, content: "", props: { columns: 2, gap: "16px", content1: "<p>Column 1</p>", content2: "<p>Column 2</p>", content3: "" } };
    case "social":
      return { id, type, content: "", props: { icons: ["facebook", "twitter", "linkedin", "instagram"], align: "center", iconSize: "32px", gap: "12px" } };
    case "video":
      return { id, type, content: "", props: { url: "", thumbnail: "", width: "100%" } };
    case "html":
      return { id, type, content: "<div><!-- Custom HTML --></div>", props: {} };
    case "header":
      return { id, type, content: "", props: { logo: "", title: "Company Name", bgColor: "#1e293b", textColor: "#ffffff", padding: "24px" } };
    case "footer":
      return { id, type, content: "<p style='color:#888;font-size:12px;text-align:center'>© 2026 Company Name. All rights reserved.<br>123 Street Address, City, Country</p>", props: { bgColor: "#f8fafc" } };
    default:
      return { id, type, content: "", props: {} };
  }
}

// ─── HTML Serializer ─────────────────────────────────────────────────────────

function blocksToHtml(blocks: BlockData[], globalStyles: Record<string, string>): string {
  const { bgColor = "#e1ecf7", contentWidth = "600", fontFamily = "Arial, sans-serif" } = globalStyles;
  const inner = blocks.map((b) => {
    switch (b.type) {
      case "text":
        return `<div style="padding:8px 0;text-align:${b.props.align || "left"};color:${b.props.color || "#333"};font-size:${b.props.fontSize || "14px"}">${b.content}</div>`;
      case "image":
        return `<div style="text-align:${b.props.align || "center"};padding:8px 0">${b.props.src ? `<img src="${b.props.src}" alt="${b.props.alt || ""}" style="max-width:${b.props.width || "100%"};height:auto;display:inline-block" />` : '<div style="background:#f1f5f9;padding:40px;text-align:center;color:#94a3b8;border:2px dashed #cbd5e1;border-radius:8px">Drop image here or enter URL</div>'}</div>`;
      case "button":
        return `<div style="text-align:${b.props.align || "center"};padding:16px 0"><a href="${b.props.url || "#"}" style="display:inline-block;background:${b.props.bgColor};color:${b.props.textColor};padding:${b.props.padding};border-radius:${b.props.borderRadius};text-decoration:none;font-weight:600;font-size:${b.props.fontSize}">${b.content}</a></div>`;
      case "divider":
        return `<hr style="border:none;border-top:${b.props.thickness} ${b.props.style || "solid"} ${b.props.color};margin:16px auto;width:${b.props.width}" />`;
      case "spacer":
        return `<div style="height:${b.props.height}"></div>`;
      case "columns": {
        const cols = b.props.columns || 2;
        const width = `${Math.floor(100 / cols)}%`;
        let cells = "";
        for (let i = 1; i <= cols; i++) {
          cells += `<td style="width:${width};vertical-align:top;padding:0 ${parseInt(b.props.gap || "16") / 2}px">${b.props[`content${i}`] || ""}</td>`;
        }
        return `<table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed"><tr>${cells}</tr></table>`;
      }
      case "social": {
        const icons = (b.props.icons || []).map((name: string) =>
          `<a href="#" style="display:inline-block;margin:0 ${parseInt(b.props.gap || "12") / 2}px;text-decoration:none;color:#3b82f6;font-size:${b.props.iconSize || "14px"}">${name.charAt(0).toUpperCase() + name.slice(1)}</a>`
        ).join("");
        return `<div style="text-align:${b.props.align || "center"};padding:16px 0">${icons}</div>`;
      }
      case "video":
        return `<div style="text-align:center;padding:8px 0">${b.props.url ? `<a href="${b.props.url}"><img src="${b.props.thumbnail || ""}" alt="Video" style="max-width:${b.props.width};height:auto" /></a>` : '<div style="background:#f1f5f9;padding:40px;text-align:center;color:#94a3b8;border:2px dashed #cbd5e1;border-radius:8px">Enter video URL</div>'}</div>`;
      case "html":
        return b.content;
      case "header":
        return `<div style="background:${b.props.bgColor};color:${b.props.textColor};padding:${b.props.padding};text-align:center">${b.props.logo ? `<img src="${b.props.logo}" alt="Logo" style="max-height:48px;margin-bottom:8px" /><br/>` : ""}${b.props.title ? `<h1 style="margin:0;font-size:24px;font-weight:700">${b.props.title}</h1>` : ""}</div>`;
      case "footer":
        return `<div style="background:${b.props.bgColor || "#f8fafc"};padding:24px">${b.content}</div>`;
      default:
        return "";
    }
  }).join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:${bgColor};font-family:${fontFamily}"><table width="100%" cellpadding="0" cellspacing="0" style="background:${bgColor}"><tr><td align="center"><table width="${contentWidth}" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:${contentWidth}px;width:100%"><tr><td style="padding:0">${inner}</td></tr></table></td></tr></table></body></html>`;
}

function htmlToBlocks(html: string): { blocks: BlockData[]; globalStyles: Record<string, string> } {
  // Simple parser: if it looks like our block HTML, extract blocks; otherwise, wrap as single text block
  if (!html || html.trim().length === 0) return { blocks: [], globalStyles: {} };
  // If it doesn't look like structured block HTML, wrap the whole thing as a text block
  return { blocks: [{ id: createBlockId(), type: "text", content: html, props: { align: "left", color: "#333333", fontSize: "14px" } }], globalStyles: {} };
}

// ─── Block Property Editors ──────────────────────────────────────────────────

function TextBlockProps({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="Text Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <Button key={a} size="sm" variant={block.props.align === a ? "default" : "outline"} className="flex-1 h-8"
              onClick={() => onChange({ ...block, props: { ...block.props, align: a } })}>
              {a === "left" ? <AlignLeft className="h-3.5 w-3.5" /> : a === "center" ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
            </Button>
          ))}
        </div>
      </PropField>
      <PropField label="Font Size">
        <Input value={block.props.fontSize || "14px"} onChange={(e) => onChange({ ...block, props: { ...block.props, fontSize: e.target.value } })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Text Color">
        <div className="flex items-center gap-2">
          <input type="color" value={block.props.color || "#333333"} onChange={(e) => onChange({ ...block, props: { ...block.props, color: e.target.value } })} className="w-8 h-8 rounded border cursor-pointer" />
          <Input value={block.props.color || "#333333"} onChange={(e) => onChange({ ...block, props: { ...block.props, color: e.target.value } })} className="flex-1 h-8 text-xs" />
        </div>
      </PropField>
    </div>
  );
}

function ImageBlockProps({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="Image URL">
        <Input value={block.props.src || ""} onChange={(e) => onChange({ ...block, props: { ...block.props, src: e.target.value } })} placeholder="https://..." className="h-8 text-xs" />
      </PropField>
      <PropField label="Alt Text">
        <Input value={block.props.alt || ""} onChange={(e) => onChange({ ...block, props: { ...block.props, alt: e.target.value } })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Width">
        <Input value={block.props.width || "100%"} onChange={(e) => onChange({ ...block, props: { ...block.props, width: e.target.value } })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Link URL">
        <Input value={block.props.link || ""} onChange={(e) => onChange({ ...block, props: { ...block.props, link: e.target.value } })} placeholder="Optional link" className="h-8 text-xs" />
      </PropField>
      <PropField label="Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <Button key={a} size="sm" variant={block.props.align === a ? "default" : "outline"} className="flex-1 h-8"
              onClick={() => onChange({ ...block, props: { ...block.props, align: a } })}>
              {a === "left" ? <AlignLeft className="h-3.5 w-3.5" /> : a === "center" ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
            </Button>
          ))}
        </div>
      </PropField>
    </div>
  );
}

function ButtonBlockProps({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="Button Text">
        <Input value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Link URL">
        <Input value={block.props.url || "#"} onChange={(e) => onChange({ ...block, props: { ...block.props, url: e.target.value } })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Background Color">
        <div className="flex items-center gap-2">
          <input type="color" value={block.props.bgColor || "#3b82f6"} onChange={(e) => onChange({ ...block, props: { ...block.props, bgColor: e.target.value } })} className="w-8 h-8 rounded border cursor-pointer" />
          <Input value={block.props.bgColor || "#3b82f6"} onChange={(e) => onChange({ ...block, props: { ...block.props, bgColor: e.target.value } })} className="flex-1 h-8 text-xs" />
        </div>
      </PropField>
      <PropField label="Text Color">
        <div className="flex items-center gap-2">
          <input type="color" value={block.props.textColor || "#ffffff"} onChange={(e) => onChange({ ...block, props: { ...block.props, textColor: e.target.value } })} className="w-8 h-8 rounded border cursor-pointer" />
          <Input value={block.props.textColor || "#ffffff"} onChange={(e) => onChange({ ...block, props: { ...block.props, textColor: e.target.value } })} className="flex-1 h-8 text-xs" />
        </div>
      </PropField>
      <PropField label="Border Radius">
        <Input value={block.props.borderRadius || "6px"} onChange={(e) => onChange({ ...block, props: { ...block.props, borderRadius: e.target.value } })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <Button key={a} size="sm" variant={block.props.align === a ? "default" : "outline"} className="flex-1 h-8"
              onClick={() => onChange({ ...block, props: { ...block.props, align: a } })}>
              {a === "left" ? <AlignLeft className="h-3.5 w-3.5" /> : a === "center" ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
            </Button>
          ))}
        </div>
      </PropField>
    </div>
  );
}

function DividerBlockProps({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="Color">
        <div className="flex items-center gap-2">
          <input type="color" value={block.props.color || "#e2e8f0"} onChange={(e) => onChange({ ...block, props: { ...block.props, color: e.target.value } })} className="w-8 h-8 rounded border cursor-pointer" />
          <Input value={block.props.color || "#e2e8f0"} onChange={(e) => onChange({ ...block, props: { ...block.props, color: e.target.value } })} className="flex-1 h-8 text-xs" />
        </div>
      </PropField>
      <PropField label="Thickness">
        <Input value={block.props.thickness || "1px"} onChange={(e) => onChange({ ...block, props: { ...block.props, thickness: e.target.value } })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Style">
        <select value={block.props.style || "solid"} onChange={(e) => onChange({ ...block, props: { ...block.props, style: e.target.value } })} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </PropField>
    </div>
  );
}

function SpacerBlockProps({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  return (
    <PropField label="Height">
      <Input value={block.props.height || "20px"} onChange={(e) => onChange({ ...block, props: { ...block.props, height: e.target.value } })} className="h-8 text-xs" />
    </PropField>
  );
}

function HeaderBlockProps({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="Title">
        <Input value={block.props.title || ""} onChange={(e) => onChange({ ...block, props: { ...block.props, title: e.target.value } })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Logo URL">
        <Input value={block.props.logo || ""} onChange={(e) => onChange({ ...block, props: { ...block.props, logo: e.target.value } })} placeholder="https://..." className="h-8 text-xs" />
      </PropField>
      <PropField label="Background Color">
        <div className="flex items-center gap-2">
          <input type="color" value={block.props.bgColor || "#1e293b"} onChange={(e) => onChange({ ...block, props: { ...block.props, bgColor: e.target.value } })} className="w-8 h-8 rounded border cursor-pointer" />
          <Input value={block.props.bgColor || "#1e293b"} onChange={(e) => onChange({ ...block, props: { ...block.props, bgColor: e.target.value } })} className="flex-1 h-8 text-xs" />
        </div>
      </PropField>
      <PropField label="Text Color">
        <div className="flex items-center gap-2">
          <input type="color" value={block.props.textColor || "#ffffff"} onChange={(e) => onChange({ ...block, props: { ...block.props, textColor: e.target.value } })} className="w-8 h-8 rounded border cursor-pointer" />
          <Input value={block.props.textColor || "#ffffff"} onChange={(e) => onChange({ ...block, props: { ...block.props, textColor: e.target.value } })} className="flex-1 h-8 text-xs" />
        </div>
      </PropField>
    </div>
  );
}

function HtmlBlockProps({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  return (
    <PropField label="HTML Code">
      <textarea
        className="w-full min-h-[120px] rounded-md border px-3 py-2 text-xs font-mono bg-muted/30"
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
      />
    </PropField>
  );
}

function PropField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ─── Block Canvas Renderer ───────────────────────────────────────────────────

function BlockRenderer({ block, selected, onSelect, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: BlockData;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (b: BlockData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const renderContent = () => {
    switch (block.type) {
      case "text":
        return (
          <div
            contentEditable
            suppressContentEditableWarning
            className="outline-none min-h-[24px] px-2 py-1"
            style={{ textAlign: block.props.align || "left", color: block.props.color, fontSize: block.props.fontSize }}
            dangerouslySetInnerHTML={{ __html: block.content }}
            onBlur={(e) => onUpdate({ ...block, content: e.currentTarget.innerHTML })}
          />
        );
      case "image":
        return (
          <div style={{ textAlign: block.props.align || "center" }} className="py-2">
            {block.props.src ? (
              <img src={block.props.src} alt={block.props.alt} style={{ maxWidth: block.props.width || "100%", height: "auto", display: "inline-block" }} />
            ) : (
              <div className="bg-muted/50 p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Click to add image URL in properties</p>
              </div>
            )}
          </div>
        );
      case "button":
        return (
          <div style={{ textAlign: block.props.align || "center" }} className="py-3">
            <span
              style={{
                display: "inline-block",
                background: block.props.bgColor,
                color: block.props.textColor,
                padding: block.props.padding,
                borderRadius: block.props.borderRadius,
                fontWeight: 600,
                fontSize: block.props.fontSize,
                cursor: "default",
              }}
            >
              {block.content}
            </span>
          </div>
        );
      case "divider":
        return (
          <div className="py-2">
            <hr style={{ border: "none", borderTop: `${block.props.thickness} ${block.props.style || "solid"} ${block.props.color}`, width: block.props.width }} />
          </div>
        );
      case "spacer":
        return <div style={{ height: block.props.height }} className="bg-muted/20 rounded border border-dashed border-muted-foreground/20 flex items-center justify-center text-[10px] text-muted-foreground">Spacer: {block.props.height}</div>;
      case "columns":
        return (
          <div className="flex gap-2 py-2" style={{ gap: block.props.gap }}>
            {Array.from({ length: block.props.columns || 2 }, (_, i) => (
              <div key={i} className="flex-1 border border-dashed border-muted-foreground/30 rounded p-2 min-h-[60px]"
                contentEditable suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: block.props[`content${i + 1}`] || `<p>Column ${i + 1}</p>` }}
                onBlur={(e) => onUpdate({ ...block, props: { ...block.props, [`content${i + 1}`]: e.currentTarget.innerHTML } })}
              />
            ))}
          </div>
        );
      case "social":
        return (
          <div style={{ textAlign: block.props.align || "center" }} className="py-3 flex items-center justify-center gap-3">
            {(block.props.icons || []).map((name: string, i: number) => (
              <span key={i} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                {name.charAt(0)}
              </span>
            ))}
          </div>
        );
      case "video":
        return (
          <div className="py-2 text-center">
            {block.props.url ? (
              <div className="bg-muted/50 p-6 rounded inline-block">
                <Video className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{block.props.url}</p>
              </div>
            ) : (
              <div className="bg-muted/50 p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Enter video URL in properties</p>
              </div>
            )}
          </div>
        );
      case "html":
        return <div className="py-2 px-2 bg-muted/20 rounded font-mono text-xs overflow-auto max-h-[120px] border border-dashed" dangerouslySetInnerHTML={{ __html: block.content }} />;
      case "header":
        return (
          <div style={{ background: block.props.bgColor, color: block.props.textColor, padding: block.props.padding }} className="text-center rounded-t">
            {block.props.logo && <img src={block.props.logo} alt="Logo" className="max-h-12 mx-auto mb-2" />}
            {block.props.title && <h2 className="text-xl font-bold m-0">{block.props.title}</h2>}
          </div>
        );
      case "footer":
        return (
          <div style={{ background: block.props.bgColor || "#f8fafc" }} className="py-4 px-4 rounded-b"
            contentEditable suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: block.content }}
            onBlur={(e) => onUpdate({ ...block, content: e.currentTarget.innerHTML })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={cn(
        "group relative border rounded-lg transition-all cursor-pointer",
        selected ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-transparent hover:border-muted-foreground/30"
      )}
    >
      {/* Floating toolbar */}
      {selected && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-background border rounded-md shadow-sm px-1 py-0.5 z-10">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="p-1 hover:bg-muted rounded disabled:opacity-30" title="Move up">
            <ChevronUp className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="p-1 hover:bg-muted rounded disabled:opacity-30" title="Move down">
            <ChevronDown className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-muted rounded" title="Duplicate">
            <Copy className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded" title="Delete">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Block type badge */}
      <div className={cn("absolute -left-1 top-1/2 -translate-y-1/2 transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover:opacity-60")}>
        <div className="bg-primary text-primary-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded-r-md uppercase tracking-wider">
          {block.type}
        </div>
      </div>

      <div className="px-2 py-1">
        {renderContent()}
      </div>
    </div>
  );
}

// ─── Global Styles Panel ─────────────────────────────────────────────────────

function GlobalStylesPanel({ styles, onChange }: { styles: Record<string, string>; onChange: (s: Record<string, string>) => void }) {
  return (
    <div className="space-y-4 p-3">
      <h3 className="text-sm font-semibold">Global Styles & Layout</h3>
      <PropField label="General Background Color">
        <div className="flex items-center gap-2">
          <input type="color" value={styles.bgColor || "#e1ecf7"} onChange={(e) => onChange({ ...styles, bgColor: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" />
          <Input value={styles.bgColor || "#e1ecf7"} onChange={(e) => onChange({ ...styles, bgColor: e.target.value })} className="flex-1 h-8 text-xs" />
        </div>
      </PropField>
      <PropField label="Content Width (px)">
        <Input type="number" value={styles.contentWidth || "600"} onChange={(e) => onChange({ ...styles, contentWidth: e.target.value })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Font Family">
        <select value={styles.fontFamily || "Arial, sans-serif"} onChange={(e) => onChange({ ...styles, fontFamily: e.target.value })} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
        </select>
      </PropField>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmailBlockEditor({ value, onChange, placeholder, variables, minHeight = "500px" }: EmailBlockEditorProps) {
  const [mode, setMode] = useState<EditorMode>("blocks");
  const [blocks, setBlocks] = useState<BlockData[]>(() => {
    if (!value || value.trim().length === 0) return [];
    return htmlToBlocks(value).blocks;
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [codeValue, setCodeValue] = useState(value || "");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [globalStyles, setGlobalStyles] = useState<Record<string, string>>({ bgColor: "#e1ecf7", contentWidth: "600", fontFamily: "Arial, sans-serif" });
  const [showGlobalStyles, setShowGlobalStyles] = useState(false);
  const [undoStack, setUndoStack] = useState<BlockData[][]>([]);
  const [redoStack, setRedoStack] = useState<BlockData[][]>([]);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  // Sync blocks → parent onChange
  const syncToParent = useCallback((newBlocks: BlockData[]) => {
    const html = blocksToHtml(newBlocks, globalStyles);
    onChange(html);
  }, [onChange, globalStyles]);

  // Update blocks with undo support
  const updateBlocks = useCallback((newBlocks: BlockData[]) => {
    setUndoStack(prev => [...prev.slice(-20), blocks]);
    setRedoStack([]);
    setBlocks(newBlocks);
    syncToParent(newBlocks);
  }, [blocks, syncToParent]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, blocks]);
    setUndoStack(u => u.slice(0, -1));
    setBlocks(prev);
    syncToParent(prev);
  }, [undoStack, blocks, syncToParent]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, blocks]);
    setRedoStack(r => r.slice(0, -1));
    setBlocks(next);
    syncToParent(next);
  }, [redoStack, blocks, syncToParent]);

  // Add block
  const addBlock = useCallback((type: BlockType) => {
    const newBlock = getDefaultBlock(type);
    const newBlocks = [...blocks, newBlock];
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
  }, [blocks, updateBlocks]);

  // Update single block
  const updateBlock = useCallback((updated: BlockData) => {
    const newBlocks = blocks.map(b => b.id === updated.id ? updated : b);
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Delete block
  const deleteBlock = useCallback((id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    updateBlocks(newBlocks);
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [blocks, updateBlocks, selectedBlockId]);

  // Duplicate block
  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const clone = { ...blocks[idx], id: createBlockId(), props: { ...blocks[idx].props } };
    const newBlocks = [...blocks.slice(0, idx + 1), clone, ...blocks.slice(idx + 1)];
    updateBlocks(newBlocks);
    setSelectedBlockId(clone.id);
  }, [blocks, updateBlocks]);

  // Move block
  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Mode switching
  const switchMode = useCallback((newMode: EditorMode) => {
    if (newMode === "code") {
      setCodeValue(blocksToHtml(blocks, globalStyles));
    } else if (mode === "code" && newMode === "blocks") {
      const { blocks: parsed } = htmlToBlocks(codeValue);
      setBlocks(parsed);
    } else if (mode === "code" && newMode === "richtext") {
      // Pass through
    }
    setMode(newMode);
  }, [mode, blocks, codeValue, globalStyles]);

  // Handle code mode save
  const handleCodeChange = useCallback((newCode: string) => {
    setCodeValue(newCode);
    onChange(newCode);
  }, [onChange]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const deviceWidth = previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "375px";

  return (
    <div className="border rounded-lg bg-background overflow-hidden flex flex-col" style={{ minHeight }}>
      {/* ── Top Toolbar ── */}
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-1">
          {/* Mode switcher */}
          <div className="flex items-center rounded-md border bg-background p-0.5">
            <button
              onClick={() => switchMode("blocks")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-sm transition-colors", mode === "blocks" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <LayoutGrid className="h-3.5 w-3.5 inline mr-1.5" />Block Editor
            </button>
            <button
              onClick={() => switchMode("richtext")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-sm transition-colors", mode === "richtext" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <FileText className="h-3.5 w-3.5 inline mr-1.5" />Rich Text
            </button>
            <button
              onClick={() => switchMode("code")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-sm transition-colors", mode === "code" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <Code className="h-3.5 w-3.5 inline mr-1.5" />HTML Code
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "blocks" && (
            <>
              <button onClick={undo} disabled={undoStack.length === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30" title="Undo">
                <Undo2 className="h-4 w-4" />
              </button>
              <button onClick={redo} disabled={redoStack.length === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30" title="Redo">
                <Redo2 className="h-4 w-4" />
              </button>
              <div className="w-px h-5 bg-border" />
            </>
          )}
          {/* Device preview */}
          <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
            <button onClick={() => setPreviewDevice("desktop")} className={cn("p-1.5 rounded-sm", previewDevice === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} title="Desktop">
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setPreviewDevice("tablet")} className={cn("p-1.5 rounded-sm", previewDevice === "tablet" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} title="Tablet">
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setPreviewDevice("mobile")} className={cn("p-1.5 rounded-sm", previewDevice === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} title="Mobile">
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Block Palette (only in block mode) ── */}
        {mode === "blocks" && (
          <div className="w-[72px] border-r bg-muted/20 overflow-y-auto shrink-0">
            <div className="py-2 space-y-0.5">
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className="w-full flex flex-col items-center gap-0.5 py-2 px-1 hover:bg-primary/10 transition-colors rounded-lg mx-auto group"
                  title={bt.description}
                >
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    {bt.icon}
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground leading-tight text-center">
                    {bt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CENTER: Canvas ── */}
        <div className="flex-1 overflow-y-auto" style={{ background: mode === "blocks" ? (globalStyles.bgColor || "#e1ecf7") : undefined }}>
          {mode === "blocks" && (
            <div className="flex justify-center py-6 px-4" onClick={() => setSelectedBlockId(null)}>
              <div
                className="bg-white rounded-sm shadow-sm"
                style={{ width: deviceWidth, maxWidth: `${globalStyles.contentWidth || 600}px`, minHeight: "400px" }}
              >
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <LayoutGrid className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-sm font-medium mb-1">Start building your email</p>
                    <p className="text-xs opacity-60">Click a block on the left sidebar to add it</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {blocks.map((block, idx) => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        selected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onUpdate={updateBlock}
                        onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onMoveUp={() => moveBlock(block.id, "up")}
                        onMoveDown={() => moveBlock(block.id, "down")}
                        isFirst={idx === 0}
                        isLast={idx === blocks.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "richtext" && (
            <div className="p-4">
              <RichTextEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder || "Design your email template here..."}
                minHeight="400px"
                enhanced
                variables={variables}
              />
            </div>
          )}

          {mode === "code" && (
            <div className="p-4 h-full">
              <textarea
                ref={codeRef}
                className="w-full h-full min-h-[500px] rounded-md border bg-muted/30 px-4 py-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={codeValue}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="<!-- Enter your HTML email code here -->"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT: Properties Panel (block mode only) ── */}
        {mode === "blocks" && (
          <div className="w-[280px] border-l bg-background overflow-y-auto shrink-0">
            {/* Tab: Global styles vs Block properties */}
            <div className="flex border-b">
              <button
                onClick={() => setShowGlobalStyles(false)}
                className={cn("flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                  !showGlobalStyles ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings2 className="h-3.5 w-3.5 inline mr-1" />Block
              </button>
              <button
                onClick={() => setShowGlobalStyles(true)}
                className={cn("flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                  showGlobalStyles ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Palette className="h-3.5 w-3.5 inline mr-1" />Styles
              </button>
            </div>

            {showGlobalStyles ? (
              <GlobalStylesPanel styles={globalStyles} onChange={setGlobalStyles} />
            ) : selectedBlock ? (
              <div className="p-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold capitalize">{selectedBlock.type} Block</h3>
                  <button onClick={() => deleteBlock(selectedBlock.id)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded" title="Delete block">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {selectedBlock.type === "text" && <TextBlockProps block={selectedBlock} onChange={updateBlock} />}
                {selectedBlock.type === "image" && <ImageBlockProps block={selectedBlock} onChange={updateBlock} />}
                {selectedBlock.type === "button" && <ButtonBlockProps block={selectedBlock} onChange={updateBlock} />}
                {selectedBlock.type === "divider" && <DividerBlockProps block={selectedBlock} onChange={updateBlock} />}
                {selectedBlock.type === "spacer" && <SpacerBlockProps block={selectedBlock} onChange={updateBlock} />}
                {selectedBlock.type === "header" && <HeaderBlockProps block={selectedBlock} onChange={updateBlock} />}
                {selectedBlock.type === "html" && <HtmlBlockProps block={selectedBlock} onChange={updateBlock} />}
                {selectedBlock.type === "footer" && <HtmlBlockProps block={selectedBlock} onChange={updateBlock} />}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Select a block to edit its properties</p>
                <p className="text-[10px] mt-1 opacity-60">Or click "Styles" tab for global settings</p>
              </div>
            )}

            {/* Variables sidebar */}
            {variables && variables.length > 0 && (
              <div className="border-t mt-4 pt-3 px-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Variables</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                  {variables.map((v) => (
                    <button
                      key={v.value}
                      className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-muted transition-colors flex items-center justify-between"
                      onClick={() => {
                        if (selectedBlock && (selectedBlock.type === "text" || selectedBlock.type === "footer" || selectedBlock.type === "html")) {
                          updateBlock({ ...selectedBlock, content: selectedBlock.content + v.value });
                        }
                      }}
                      title={v.value}
                    >
                      <span>{v.label}</span>
                      <code className="text-[9px] text-muted-foreground">{v.value}</code>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailBlockEditor;
