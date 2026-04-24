import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Upload,
  Paperclip,
  Table,
  Quote,
  Heading1,
  Heading2,
  ListOrdered,
  CheckSquare,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Merge,
  SplitSquareHorizontal,
  MoveHorizontal,
  MoveVertical,
  PanelLeftClose,
  PanelRightClose,
  Eye,
  Download,
  Printer,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Globe,
  BarChart3,
  Hash,
  Search,
  ZoomIn,
  ZoomOut,
  Bookmark,
  LayoutTemplate,
  GripVertical as Grip,
  ArrowDown,
  ArrowUp,
  Rows,
  PaintBucket,
  BoxSelect,
  Menu,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type EditorMode = "blocks" | "richtext" | "code";
type PreviewDevice = "desktop" | "tablet" | "mobile";
type SidebarTab = "blocks" | "properties" | "styles";

interface DocBlockData {
  id: string;
  type: DocBlockType;
  content: string;
  props: Record<string, any>;
}

type DocBlockType =
  | "text"
  | "heading"
  | "image"
  | "logo"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "table"
  | "quote"
  | "list"
  | "checklist"
  | "html"
  | "header"
  | "footer"
  | "pagebreak"
  | "signature"
  | "attachment"
  | "callout"
  | "codeblock"
  | "social"
  | "progress"
  | "toc"
  | "rating"
  | "badge";

interface DocumentBlockEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variables?: Array<{ label: string; value: string }>;
  minHeight?: string;
  onAttach?: (files: File[]) => void;
  attachments?: Array<{ name: string; url: string; size: string }>;
}

// ─── Block Definitions ───────────────────────────────────────────────────────

const BLOCK_CATEGORIES = [
  {
    label: "Content",
    blocks: [
      { type: "text" as DocBlockType, label: "Text", icon: <Type className="h-4 w-4" />, description: "Rich text paragraph" },
      { type: "heading" as DocBlockType, label: "Heading", icon: <Heading1 className="h-4 w-4" />, description: "Section heading" },
      { type: "quote" as DocBlockType, label: "Quote", icon: <Quote className="h-4 w-4" />, description: "Blockquote" },
      { type: "list" as DocBlockType, label: "List", icon: <List className="h-4 w-4" />, description: "Bullet or numbered list" },
      { type: "checklist" as DocBlockType, label: "Checklist", icon: <CheckSquare className="h-4 w-4" />, description: "Task checklist" },
      { type: "callout" as DocBlockType, label: "Callout", icon: <AlertCircle className="h-4 w-4" />, description: "Alert / info callout box" },
      { type: "codeblock" as DocBlockType, label: "Code", icon: <Terminal className="h-4 w-4" />, description: "Code snippet block" },
    ],
  },
  {
    label: "Media",
    blocks: [
      { type: "image" as DocBlockType, label: "Image", icon: <ImageIcon className="h-4 w-4" />, description: "Upload or link an image" },
      { type: "logo" as DocBlockType, label: "Logo", icon: <Upload className="h-4 w-4" />, description: "Company logo upload" },
      { type: "attachment" as DocBlockType, label: "Attachment", icon: <Paperclip className="h-4 w-4" />, description: "Attach a document" },
      { type: "social" as DocBlockType, label: "Social", icon: <Globe className="h-4 w-4" />, description: "Social media links" },
    ],
  },
  {
    label: "Layout",
    blocks: [
      { type: "columns" as DocBlockType, label: "Columns", icon: <Columns className="h-4 w-4" />, description: "Multi-column layout" },
      { type: "table" as DocBlockType, label: "Table", icon: <Table className="h-4 w-4" />, description: "Data table" },
      { type: "divider" as DocBlockType, label: "Divider", icon: <Minus className="h-4 w-4" />, description: "Horizontal line" },
      { type: "spacer" as DocBlockType, label: "Spacer", icon: <ArrowUpDown className="h-4 w-4" />, description: "Empty space" },
      { type: "pagebreak" as DocBlockType, label: "Page Break", icon: <SplitSquareHorizontal className="h-4 w-4" />, description: "PDF page break" },
      { type: "toc" as DocBlockType, label: "TOC", icon: <Hash className="h-4 w-4" />, description: "Table of contents" },
    ],
  },
  {
    label: "Structure",
    blocks: [
      { type: "header" as DocBlockType, label: "Header", icon: <PanelLeftClose className="h-4 w-4" />, description: "Document header with logo" },
      { type: "footer" as DocBlockType, label: "Footer", icon: <PanelRightClose className="h-4 w-4" />, description: "Document footer" },
      { type: "button" as DocBlockType, label: "Button", icon: <Square className="h-4 w-4" />, description: "Call-to-action button" },
      { type: "signature" as DocBlockType, label: "Signature", icon: <FileText className="h-4 w-4" />, description: "Signature block" },
      { type: "html" as DocBlockType, label: "HTML", icon: <Code className="h-4 w-4" />, description: "Custom HTML code" },
    ],
  },
  {
    label: "Special",
    blocks: [
      { type: "progress" as DocBlockType, label: "Progress", icon: <BarChart3 className="h-4 w-4" />, description: "Progress bar indicator" },
      { type: "rating" as DocBlockType, label: "Rating", icon: <Bookmark className="h-4 w-4" />, description: "Star rating display" },
      { type: "badge" as DocBlockType, label: "Badge", icon: <BoxSelect className="h-4 w-4" />, description: "Status badge / tag" },
    ],
  },
];

const ALL_BLOCK_TYPES = BLOCK_CATEGORIES.flatMap((c) => c.blocks);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createBlockId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultBlock(type: DocBlockType): DocBlockData {
  const id = createBlockId();
  const defaults: Record<DocBlockType, () => DocBlockData> = {
    text: () => ({ id, type, content: "<p>Enter your text here...</p>", props: { align: "left", color: "#333333", fontSize: "14px", lineHeight: "1.6", padding: "8px 0" } }),
    heading: () => ({ id, type, content: "Section Heading", props: { level: "h2", align: "left", color: "#111827", fontSize: "24px", fontWeight: "700", borderBottom: false } }),
    image: () => ({ id, type, content: "", props: { src: "", alt: "Image", width: "100%", maxWidth: "400px", align: "center", borderRadius: "8px", border: "", caption: "" } }),
    logo: () => ({ id, type, content: "", props: { src: "", alt: "Company Logo", width: "180px", height: "auto", align: "left", padding: "16px 0" } }),
    button: () => ({ id, type, content: "Click Here", props: { url: "#", bgColor: "#3b82f6", textColor: "#ffffff", borderRadius: "6px", align: "center", width: "auto", fontSize: "14px", padding: "10px 24px", fontWeight: "600" } }),
    divider: () => ({ id, type, content: "", props: { color: "#e2e8f0", thickness: "1px", width: "100%", style: "solid", margin: "16px 0" } }),
    spacer: () => ({ id, type, content: "", props: { height: "24px" } }),
    columns: () => ({
      id, type, content: "", props: {
        columns: 2, gap: "16px", layout: "equal",
        widths: ["50%", "50%"],
        content1: "<p>Column 1 content</p>",
        content2: "<p>Column 2 content</p>",
        content3: "",
        content4: "",
        verticalAlign: "top",
        bgColor1: "", bgColor2: "", bgColor3: "", bgColor4: "",
        padding: "0",
      }
    }),
    table: () => ({
      id, type, content: "", props: {
        rows: 3, cols: 3,
        headerRow: true,
        stripeRows: true,
        borderColor: "#e2e8f0",
        headerBg: "#1e293b",
        headerColor: "#ffffff",
        cellPadding: "10px 12px",
        fontSize: "13px",
        data: [
          ["Header 1", "Header 2", "Header 3"],
          ["Cell 1", "Cell 2", "Cell 3"],
          ["Cell 4", "Cell 5", "Cell 6"],
        ],
        colWidths: ["33.33%", "33.33%", "33.33%"],
      }
    }),
    quote: () => ({ id, type, content: "This is a blockquote. Use it for important callouts or testimonials.", props: { borderColor: "#3b82f6", bgColor: "#eff6ff", textColor: "#1e40af", fontSize: "15px", style: "border-left" } }),
    list: () => ({ id, type, content: "", props: { style: "unordered", items: ["First item", "Second item", "Third item"], color: "#333333", fontSize: "14px", spacing: "8px" } }),
    checklist: () => ({ id, type, content: "", props: { items: [{ text: "Task one", checked: false }, { text: "Task two", checked: true }, { text: "Task three", checked: false }], fontSize: "14px" } }),
    html: () => ({ id, type, content: "<div><!-- Custom HTML --></div>", props: {} }),
    header: () => ({ id, type, content: "", props: { logo: "", title: "Company Name", subtitle: "Document Title", bgColor: "#1e293b", textColor: "#ffffff", padding: "32px", layout: "logo-left", borderBottom: "3px solid #3b82f6" } }),
    footer: () => ({ id, type, content: "<p style='color:#666;font-size:11px;text-align:center;margin:0'>© 2026 Company Name. All rights reserved.<br/>123 Street Address, City, Country<br/>Phone: +254 700 000 000 | Email: info@company.com</p>", props: { bgColor: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "20px 24px" } }),
    pagebreak: () => ({ id, type, content: "", props: {} }),
    signature: () => ({ id, type, content: "", props: { label: "Authorized Signature", name: "", title: "", date: true, lineWidth: "200px", align: "left" } }),
    attachment: () => ({ id, type, content: "", props: { fileName: "", fileUrl: "", fileSize: "", fileType: "" } }),
    callout: () => ({ id, type, content: "This is an important notice. Pay attention to the details below.", props: { variant: "info", icon: true, title: "", bgColor: "", textColor: "", borderColor: "", padding: "16px", borderRadius: "8px" } }),
    codeblock: () => ({ id, type, content: "const greeting = 'Hello World';\nconsole.log(greeting);", props: { language: "javascript", theme: "dark", showLineNumbers: true, fontSize: "13px", padding: "16px" } }),
    social: () => ({ id, type, content: "", props: { align: "center", iconSize: "24px", gap: "12px", style: "colored", links: [{ platform: "website", url: "https://", label: "Website" }, { platform: "email", url: "mailto:", label: "Email" }, { platform: "phone", url: "tel:", label: "Phone" }] } }),
    progress: () => ({ id, type, content: "", props: { value: 75, max: 100, label: "Progress", showValue: true, height: "12px", bgColor: "#e2e8f0", fillColor: "#3b82f6", borderRadius: "6px", labelPosition: "top" } }),
    toc: () => ({ id, type, content: "", props: { title: "Table of Contents", maxDepth: 3, numbered: true, bgColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" } }),
    rating: () => ({ id, type, content: "", props: { value: 4, max: 5, size: "24px", color: "#f59e0b", emptyColor: "#e2e8f0", label: "", align: "left" } }),
    badge: () => ({ id, type, content: "Status", props: { variant: "default", bgColor: "#3b82f6", textColor: "#ffffff", fontSize: "12px", padding: "4px 12px", borderRadius: "9999px", align: "left" } }),
  };
  return defaults[type]();
}

// ─── HTML Serializer ─────────────────────────────────────────────────────────

function blocksToHtml(blocks: DocBlockData[], globalStyles: Record<string, any>): string {
  const {
    bgColor = "#ffffff",
    contentWidth = "800",
    fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    pageMargin = "40px",
    headerBg = "",
    footerBg = "",
  } = globalStyles;

  const inner = blocks.map((b) => {
    switch (b.type) {
      case "text":
        return `<div style="padding:${b.props.padding || "8px 0"};text-align:${b.props.align || "left"};color:${b.props.color || "#333"};font-size:${b.props.fontSize || "14px"};line-height:${b.props.lineHeight || "1.6"}">${b.content}</div>`;

      case "heading": {
        const tag = b.props.level || "h2";
        const bb = b.props.borderBottom ? `border-bottom:2px solid #e2e8f0;padding-bottom:8px;` : "";
        return `<${tag} style="text-align:${b.props.align || "left"};color:${b.props.color || "#111827"};font-size:${b.props.fontSize || "24px"};font-weight:${b.props.fontWeight || "700"};margin:16px 0 8px;${bb}">${b.content}</${tag}>`;
      }

      case "image":
        return `<div style="text-align:${b.props.align || "center"};padding:12px 0">${b.props.src
          ? `<img src="${b.props.src}" alt="${b.props.alt || ""}" style="max-width:${b.props.maxWidth || "100%"};width:${b.props.width || "auto"};height:auto;border-radius:${b.props.borderRadius || "0"};${b.props.border ? `border:${b.props.border};` : ""}" />${b.props.caption ? `<p style="font-size:12px;color:#666;margin-top:8px;text-align:center">${b.props.caption}</p>` : ""}`
          : '<div style="background:#f1f5f9;padding:40px;text-align:center;color:#94a3b8;border:2px dashed #cbd5e1;border-radius:8px">Upload or enter image URL</div>'
          }</div>`;

      case "logo":
        return `<div style="text-align:${b.props.align || "left"};padding:${b.props.padding || "16px 0"}">${b.props.src
          ? `<img src="${b.props.src}" alt="${b.props.alt || "Logo"}" style="width:${b.props.width || "180px"};height:${b.props.height || "auto"}" />`
          : '<div style="display:inline-block;background:#f1f5f9;padding:20px 40px;border:2px dashed #cbd5e1;border-radius:8px;color:#94a3b8;font-size:13px">Upload Logo</div>'
          }</div>`;

      case "button":
        return `<div style="text-align:${b.props.align || "center"};padding:16px 0"><a href="${b.props.url || "#"}" style="display:inline-block;background:${b.props.bgColor};color:${b.props.textColor};padding:${b.props.padding};border-radius:${b.props.borderRadius};text-decoration:none;font-weight:${b.props.fontWeight || "600"};font-size:${b.props.fontSize}">${b.content}</a></div>`;

      case "divider":
        return `<hr style="border:none;border-top:${b.props.thickness} ${b.props.style || "solid"} ${b.props.color};margin:${b.props.margin || "16px 0"};width:${b.props.width}" />`;

      case "spacer":
        return `<div style="height:${b.props.height}"></div>`;

      case "pagebreak":
        return `<div style="page-break-after:always;height:0;margin:24px 0;border-top:2px dashed #94a3b8"></div>`;

      case "columns": {
        const cols = b.props.columns || 2;
        const widths = b.props.widths || Array(cols).fill(`${Math.floor(100 / cols)}%`);
        let cells = "";
        for (let i = 0; i < cols; i++) {
          const bg = b.props[`bgColor${i + 1}`] ? `background:${b.props[`bgColor${i + 1}`]};` : "";
          cells += `<td style="width:${widths[i]};vertical-align:${b.props.verticalAlign || "top"};padding:${b.props.padding || "0"} ${parseInt(b.props.gap || "16") / 2}px;${bg}">${b.props[`content${i + 1}`] || ""}</td>`;
        }
        return `<table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed"><tr>${cells}</tr></table>`;
      }

      case "table": {
        const { data = [], headerRow = true, stripeRows = true, borderColor = "#e2e8f0", headerBg: hBg = "#1e293b", headerColor: hColor = "#ffffff", cellPadding = "10px 12px", fontSize = "13px", colWidths = [] } = b.props;
        if (!data.length) return "";
        const colGroup = colWidths.length > 0 ? `<colgroup>${colWidths.map((w: string) => `<col style="width:${w}" />`).join("")}</colgroup>` : "";
        const rows = data.map((row: string[], ri: number) => {
          const isHeader = headerRow && ri === 0;
          const stripe = !isHeader && stripeRows && ri % 2 === 0 ? "background:#f8fafc;" : "";
          const cells = row.map((cell: string, ci: number) =>
            isHeader
              ? `<th style="padding:${cellPadding};background:${hBg};color:${hColor};font-weight:600;font-size:${fontSize};text-align:left;border:1px solid ${borderColor}">${cell}</th>`
              : `<td style="padding:${cellPadding};font-size:${fontSize};border:1px solid ${borderColor};${stripe}">${cell}</td>`
          ).join("");
          return `<tr>${cells}</tr>`;
        }).join("");
        return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:12px 0">${colGroup}${rows}</table>`;
      }

      case "quote": {
        if (b.props.style === "border-left") {
          return `<blockquote style="border-left:4px solid ${b.props.borderColor || "#3b82f6"};background:${b.props.bgColor || "#eff6ff"};color:${b.props.textColor || "#1e40af"};padding:16px 20px;margin:12px 0;border-radius:0 8px 8px 0;font-size:${b.props.fontSize || "15px"};font-style:italic">${b.content}</blockquote>`;
        }
        return `<blockquote style="background:${b.props.bgColor || "#f8fafc"};color:${b.props.textColor || "#333"};padding:20px;margin:12px 0;border-radius:8px;font-size:${b.props.fontSize || "15px"};text-align:center;font-style:italic;border:1px solid ${b.props.borderColor || "#e2e8f0"}">${b.content}</blockquote>`;
      }

      case "list": {
        const tag = b.props.style === "ordered" ? "ol" : "ul";
        const items = (b.props.items || []).map((it: string) => `<li style="margin-bottom:${b.props.spacing || "8px"}">${it}</li>`).join("");
        return `<${tag} style="color:${b.props.color || "#333"};font-size:${b.props.fontSize || "14px"};padding-left:24px;margin:12px 0">${items}</${tag}>`;
      }

      case "checklist": {
        const items = (b.props.items || []).map((it: { text: string; checked: boolean }) =>
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:${b.props.fontSize || "14px"}"><span style="display:inline-block;width:16px;height:16px;border:2px solid ${it.checked ? "#22c55e" : "#cbd5e1"};border-radius:3px;background:${it.checked ? "#22c55e" : "transparent"};flex-shrink:0">${it.checked ? '<span style="color:white;font-size:11px;display:flex;align-items:center;justify-content:center;height:100%">✓</span>' : ""}</span><span style="${it.checked ? "text-decoration:line-through;color:#999" : ""}">${it.text}</span></div>`
        ).join("");
        return `<div style="padding:8px 0">${items}</div>`;
      }

      case "html":
        return b.content;

      case "header": {
        const layout = b.props.layout || "logo-left";
        const logoHtml = b.props.logo ? `<img src="${b.props.logo}" alt="Logo" style="max-height:56px" />` : "";
        const titleHtml = `<div>${b.props.title ? `<h1 style="margin:0;font-size:22px;font-weight:700;color:${b.props.textColor}">${b.props.title}</h1>` : ""}${b.props.subtitle ? `<p style="margin:4px 0 0;font-size:14px;opacity:0.8;color:${b.props.textColor}">${b.props.subtitle}</p>` : ""}</div>`;
        if (layout === "logo-left") {
          return `<div style="background:${b.props.bgColor};padding:${b.props.padding};display:flex;align-items:center;gap:20px;${b.props.borderBottom ? `border-bottom:${b.props.borderBottom};` : ""}">${logoHtml}${titleHtml}</div>`;
        }
        if (layout === "centered") {
          return `<div style="background:${b.props.bgColor};padding:${b.props.padding};text-align:center;${b.props.borderBottom ? `border-bottom:${b.props.borderBottom};` : ""}">${logoHtml}<br/>${titleHtml}</div>`;
        }
        return `<div style="background:${b.props.bgColor};padding:${b.props.padding};display:flex;align-items:center;justify-content:space-between;${b.props.borderBottom ? `border-bottom:${b.props.borderBottom};` : ""}">${titleHtml}${logoHtml}</div>`;
      }

      case "footer":
        return `<div style="background:${b.props.bgColor || "#f8fafc"};padding:${b.props.padding || "20px 24px"};${b.props.borderTop ? `border-top:${b.props.borderTop};` : ""}">${b.content}</div>`;

      case "signature":
        return `<div style="text-align:${b.props.align || "left"};padding:24px 0"><div style="display:inline-block"><div style="border-bottom:1px solid #333;width:${b.props.lineWidth || "200px"};margin-bottom:8px;padding-bottom:40px"></div><p style="margin:0;font-size:12px;font-weight:600;color:#333">${b.props.label || "Authorized Signature"}</p>${b.props.name ? `<p style="margin:2px 0 0;font-size:12px;color:#666">${b.props.name}</p>` : ""}${b.props.title ? `<p style="margin:2px 0 0;font-size:11px;color:#999">${b.props.title}</p>` : ""}${b.props.date ? `<p style="margin:4px 0 0;font-size:11px;color:#999">Date: _______________</p>` : ""}</div></div>`;

      case "attachment":
        return b.props.fileName
          ? `<div style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;margin:8px 0;display:flex;align-items:center;gap:12px;background:#f8fafc"><span style="font-size:20px">📎</span><div><p style="margin:0;font-size:13px;font-weight:600">${b.props.fileName}</p><p style="margin:2px 0 0;font-size:11px;color:#666">${b.props.fileSize || ""} ${b.props.fileType || ""}</p></div></div>`
          : '<div style="padding:20px;border:2px dashed #cbd5e1;border-radius:8px;text-align:center;color:#94a3b8;font-size:13px">Click to attach a document</div>';

      case "callout": {
        const variants: Record<string, { bg: string; border: string; color: string; icon: string }> = {
          info: { bg: "#eff6ff", border: "#3b82f6", color: "#1e40af", icon: "ℹ️" },
          warning: { bg: "#fffbeb", border: "#f59e0b", color: "#92400e", icon: "⚠️" },
          error: { bg: "#fef2f2", border: "#ef4444", color: "#991b1b", icon: "❌" },
          success: { bg: "#f0fdf4", border: "#22c55e", color: "#166534", icon: "✅" },
          tip: { bg: "#f5f3ff", border: "#8b5cf6", color: "#5b21b6", icon: "💡" },
        };
        const v = variants[b.props.variant] || variants.info;
        const bg = b.props.bgColor || v.bg;
        const border = b.props.borderColor || v.border;
        const color = b.props.textColor || v.color;
        return `<div style="padding:${b.props.padding || "16px"};background:${bg};border-left:4px solid ${border};border-radius:${b.props.borderRadius || "8px"};margin:12px 0;color:${color}">${b.props.icon !== false ? `<span style="margin-right:8px">${v.icon}</span>` : ""}${b.props.title ? `<strong style="display:block;margin-bottom:4px">${b.props.title}</strong>` : ""}${b.content}</div>`;
      }

      case "codeblock":
        return `<pre style="background:${b.props.theme === "dark" ? "#1e293b" : "#f8fafc"};color:${b.props.theme === "dark" ? "#e2e8f0" : "#334155"};padding:${b.props.padding || "16px"};border-radius:8px;font-size:${b.props.fontSize || "13px"};font-family:'Courier New',monospace;overflow-x:auto;margin:12px 0;border:1px solid ${b.props.theme === "dark" ? "#334155" : "#e2e8f0"};line-height:1.6"><code>${b.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;

      case "social": {
        const links = b.props.links || [];
        const linkHtml = links.map((l: any) => `<a href="${l.url}" style="display:inline-block;margin:0 ${b.props.gap ? parseInt(b.props.gap) / 2 + "px" : "6px"};text-decoration:none;color:#666;font-size:${b.props.iconSize || "14px"}">${l.label || l.platform}</a>`).join("");
        return `<div style="text-align:${b.props.align || "center"};padding:16px 0">${linkHtml}</div>`;
      }

      case "progress":
        return `<div style="margin:12px 0">${b.props.label && b.props.labelPosition !== "none" ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:13px;font-weight:600;color:#333">${b.props.label}</span>${b.props.showValue ? `<span style="font-size:12px;color:#666">${b.props.value}%</span>` : ""}</div>` : ""}<div style="background:${b.props.bgColor || "#e2e8f0"};border-radius:${b.props.borderRadius || "6px"};height:${b.props.height || "12px"};overflow:hidden"><div style="width:${Math.min(100, (b.props.value / b.props.max) * 100)}%;height:100%;background:${b.props.fillColor || "#3b82f6"};border-radius:${b.props.borderRadius || "6px"};transition:width 0.3s"></div></div></div>`;

      case "toc":
        return `<div style="background:${b.props.bgColor || "#f8fafc"};padding:${b.props.padding || "20px"};border-radius:${b.props.borderRadius || "8px"};border:${b.props.border || "1px solid #e2e8f0"};margin:16px 0"><h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827">${b.props.title || "Table of Contents"}</h3><p style="margin:0;font-size:12px;color:#666;font-style:italic">Auto-generated from document headings</p></div>`;

      case "rating": {
        const filled = Math.min(b.props.value || 0, b.props.max || 5);
        const stars = Array.from({ length: b.props.max || 5 }, (_, i) => i < filled ? `<span style="color:${b.props.color || "#f59e0b"};font-size:${b.props.size || "24px"}">★</span>` : `<span style="color:${b.props.emptyColor || "#e2e8f0"};font-size:${b.props.size || "24px"}">★</span>`).join("");
        return `<div style="text-align:${b.props.align || "left"};padding:8px 0">${b.props.label ? `<span style="font-size:13px;margin-right:8px;color:#333">${b.props.label}</span>` : ""}${stars}</div>`;
      }

      case "badge":
        return `<div style="text-align:${b.props.align || "left"};padding:8px 0"><span style="display:inline-block;background:${b.props.bgColor || "#3b82f6"};color:${b.props.textColor || "#fff"};padding:${b.props.padding || "4px 12px"};border-radius:${b.props.borderRadius || "9999px"};font-size:${b.props.fontSize || "12px"};font-weight:600">${b.content}</span></div>`;

      default:
        return "";
    }
  }).join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>@page{margin:${pageMargin};size:A4}@media print{body{margin:0;padding:0}}*{box-sizing:border-box}body{margin:0;padding:0;font-family:${fontFamily};color:#333;line-height:1.5}</style></head><body style="margin:0;padding:0;background:${bgColor};font-family:${fontFamily}"><div style="max-width:${contentWidth}px;margin:0 auto;background:#ffffff;padding:${pageMargin}">${inner}</div></body></html>`;
}

function htmlToBlocks(html: string): { blocks: DocBlockData[]; globalStyles: Record<string, any> } {
  if (!html || html.trim().length === 0) return { blocks: [], globalStyles: {} };
  return { blocks: [{ id: createBlockId(), type: "text", content: html, props: { align: "left", color: "#333333", fontSize: "14px", lineHeight: "1.6", padding: "8px 0" } }], globalStyles: {} };
}

// ─── Property Editor Components ──────────────────────────────────────────────

function PropField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <PropField label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={(value || "").startsWith("rgba") || (value || "").startsWith("oklch") ? "#1e293b" : (value || "#333333")} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border cursor-pointer shrink-0" />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="flex-1 h-8 text-xs" />
      </div>
    </PropField>
  );
}

function AlignmentPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <PropField label="Alignment">
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <Button key={a} size="sm" variant={value === a ? "default" : "outline"} className="flex-1 h-8" onClick={() => onChange(a)}>
            {a === "left" ? <AlignLeft className="h-3.5 w-3.5" /> : a === "center" ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
          </Button>
        ))}
      </div>
    </PropField>
  );
}

// ─── Block Property Editors ──────────────────────────────────────────────────

function TextProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <AlignmentPicker value={block.props.align || "left"} onChange={(v) => up("align", v)} />
      <PropField label="Font Size">
        <Input value={block.props.fontSize || "14px"} onChange={(e) => up("fontSize", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Line Height">
        <Input value={block.props.lineHeight || "1.6"} onChange={(e) => up("lineHeight", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <ColorPicker label="Text Color" value={block.props.color || "#333333"} onChange={(v) => up("color", v)} />
      <PropField label="Padding">
        <Input value={block.props.padding || "8px 0"} onChange={(e) => up("padding", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function HeadingProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Heading Text">
        <Input value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Level">
        <select value={block.props.level || "h2"} onChange={(e) => up("level", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="h1">H1 — Main Title</option>
          <option value="h2">H2 — Section</option>
          <option value="h3">H3 — Subsection</option>
          <option value="h4">H4 — Minor</option>
        </select>
      </PropField>
      <AlignmentPicker value={block.props.align || "left"} onChange={(v) => up("align", v)} />
      <PropField label="Font Size">
        <Input value={block.props.fontSize || "24px"} onChange={(e) => up("fontSize", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <ColorPicker label="Color" value={block.props.color || "#111827"} onChange={(v) => up("color", v)} />
      <PropField label="Bottom Border">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!block.props.borderBottom} onChange={(e) => up("borderBottom", e.target.checked)} className="rounded" />
          <span className="text-xs">Show underline</span>
        </label>
      </PropField>
    </div>
  );
}

function ImageProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const fileRef = useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => up("src", reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-3">
      <PropField label="Image">
        <div className="space-y-2">
          <Input value={block.props.src || ""} onChange={(e) => up("src", e.target.value)} placeholder="https://..." className="h-8 text-xs" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Image
          </Button>
        </div>
      </PropField>
      <PropField label="Alt Text">
        <Input value={block.props.alt || ""} onChange={(e) => up("alt", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Max Width">
        <Input value={block.props.maxWidth || "400px"} onChange={(e) => up("maxWidth", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Border Radius">
        <Input value={block.props.borderRadius || "8px"} onChange={(e) => up("borderRadius", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Caption">
        <Input value={block.props.caption || ""} onChange={(e) => up("caption", e.target.value)} placeholder="Optional caption" className="h-8 text-xs" />
      </PropField>
      <AlignmentPicker value={block.props.align || "center"} onChange={(v) => up("align", v)} />
    </div>
  );
}

function LogoProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const fileRef = useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => up("src", reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-3">
      <PropField label="Logo">
        <div className="space-y-2">
          {block.props.src && (
            <div className="p-3 border rounded-md bg-muted/30 text-center">
              <img src={block.props.src} alt="Logo preview" className="max-h-16 inline-block" />
            </div>
          )}
          <Input value={block.props.src || ""} onChange={(e) => up("src", e.target.value)} placeholder="https://..." className="h-8 text-xs" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Logo
          </Button>
        </div>
      </PropField>
      <PropField label="Width">
        <Input value={block.props.width || "180px"} onChange={(e) => up("width", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <AlignmentPicker value={block.props.align || "left"} onChange={(v) => up("align", v)} />
    </div>
  );
}

function ButtonProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Button Text">
        <Input value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Link URL">
        <Input value={block.props.url || "#"} onChange={(e) => up("url", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <ColorPicker label="Background" value={block.props.bgColor || "#3b82f6"} onChange={(v) => up("bgColor", v)} />
      <ColorPicker label="Text Color" value={block.props.textColor || "#ffffff"} onChange={(v) => up("textColor", v)} />
      <PropField label="Border Radius">
        <Input value={block.props.borderRadius || "6px"} onChange={(e) => up("borderRadius", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Padding">
        <Input value={block.props.padding || "10px 24px"} onChange={(e) => up("padding", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <AlignmentPicker value={block.props.align || "center"} onChange={(v) => up("align", v)} />
    </div>
  );
}

function DividerProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <ColorPicker label="Color" value={block.props.color || "#e2e8f0"} onChange={(v) => up("color", v)} />
      <PropField label="Thickness">
        <Input value={block.props.thickness || "1px"} onChange={(e) => up("thickness", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Style">
        <select value={block.props.style || "solid"} onChange={(e) => up("style", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="double">Double</option>
        </select>
      </PropField>
      <PropField label="Width">
        <Input value={block.props.width || "100%"} onChange={(e) => up("width", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function SpacerProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  return (
    <PropField label="Height">
      <div className="flex items-center gap-2">
        <input type="range" min="4" max="120" value={parseInt(block.props.height) || 24} onChange={(e) => onChange({ ...block, props: { ...block.props, height: `${e.target.value}px` } })} className="flex-1" />
        <span className="text-xs text-muted-foreground w-10 text-right">{block.props.height}</span>
      </div>
    </PropField>
  );
}

function ColumnsProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const cols = block.props.columns || 2;
  const widths = block.props.widths || Array(cols).fill(`${Math.floor(100 / cols)}%`);

  const layouts = [
    { label: "Equal", cols: 2, widths: ["50%", "50%"] },
    { label: "2/3 + 1/3", cols: 2, widths: ["66.66%", "33.33%"] },
    { label: "1/3 + 2/3", cols: 2, widths: ["33.33%", "66.66%"] },
    { label: "3 Equal", cols: 3, widths: ["33.33%", "33.33%", "33.33%"] },
    { label: "1/4+1/2+1/4", cols: 3, widths: ["25%", "50%", "25%"] },
    { label: "4 Equal", cols: 4, widths: ["25%", "25%", "25%", "25%"] },
  ];

  return (
    <div className="space-y-3">
      <PropField label="Column Layout">
        <div className="grid grid-cols-2 gap-1">
          {layouts.map((l, i) => (
            <button key={i} onClick={() => { up("columns", l.cols); up("widths", l.widths); }}
              className={cn("px-2 py-1.5 text-[10px] rounded border text-center transition-colors",
                cols === l.cols && JSON.stringify(widths) === JSON.stringify(l.widths) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
              )}>
              {l.label}
            </button>
          ))}
        </div>
      </PropField>
      <PropField label="Column Widths" hint="Drag to resize columns">
        <div className="space-y-1">
          {widths.slice(0, cols).map((w: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-8">Col {i + 1}</span>
              <Input value={w} onChange={(e) => { const nw = [...widths]; nw[i] = e.target.value; up("widths", nw); }} className="flex-1 h-7 text-xs" />
            </div>
          ))}
        </div>
      </PropField>
      <PropField label="Gap">
        <Input value={block.props.gap || "16px"} onChange={(e) => up("gap", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Vertical Align">
        <select value={block.props.verticalAlign || "top"} onChange={(e) => up("verticalAlign", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
        </select>
      </PropField>
    </div>
  );
}

function TableProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const data: string[][] = block.props.data || [["", ""], ["", ""]];
  const rows = data.length;
  const colCount = data[0]?.length || 2;
  const colWidths: string[] = block.props.colWidths || Array(colCount).fill(`${Math.floor(100 / colCount)}%`);

  const updateCell = (ri: number, ci: number, val: string) => {
    const nd = data.map((r: string[], i: number) => i === ri ? r.map((c: string, j: number) => j === ci ? val : c) : [...r]);
    up("data", nd);
  };

  const addRow = () => up("data", [...data, Array(colCount).fill("")]);
  const removeRow = (ri: number) => { if (rows <= 1) return; up("data", data.filter((_: string[], i: number) => i !== ri)); };
  const addCol = () => {
    up("data", data.map((r: string[]) => [...r, ""]));
    up("colWidths", [...colWidths, `${Math.floor(100 / (colCount + 1))}%`]);
  };
  const removeCol = (ci: number) => {
    if (colCount <= 1) return;
    up("data", data.map((r: string[]) => r.filter((_: string, j: number) => j !== ci)));
    up("colWidths", colWidths.filter((_: string, j: number) => j !== ci));
  };
  const mergeRows = () => {
    // Simple merge: combine last two rows into one
    if (rows < 2) return;
    const merged = data.slice(0, -2);
    const r1 = data[rows - 2];
    const r2 = data[rows - 1];
    merged.push(r1.map((c: string, i: number) => `${c} ${r2[i]}`.trim()));
    up("data", merged);
  };

  return (
    <div className="space-y-3">
      <PropField label="Table Data">
        <div className="max-h-[300px] overflow-auto border rounded-md">
          <table className="w-full text-xs">
            <tbody>
              {data.map((row: string[], ri: number) => (
                <tr key={ri}>
                  {row.map((cell: string, ci: number) => (
                    <td key={ci} className="border p-0">
                      <input
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-transparent outline-none"
                        placeholder={block.props.headerRow && ri === 0 ? "Header" : "Cell"}
                      />
                    </td>
                  ))}
                  <td className="border-0 w-6">
                    <button onClick={() => removeRow(ri)} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={addRow}><Plus className="h-3 w-3 mr-1" />Row</Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={addCol}><Plus className="h-3 w-3 mr-1" />Column</Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={mergeRows}><Merge className="h-3 w-3 mr-1" />Merge</Button>
        </div>
      </PropField>
      <PropField label="Column Widths">
        <div className="space-y-1">
          {colWidths.map((w: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6">C{i + 1}</span>
              <Input value={w} onChange={(e) => { const nw = [...colWidths]; nw[i] = e.target.value; up("colWidths", nw); }} className="flex-1 h-7 text-xs" />
              <button onClick={() => removeCol(i)} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      </PropField>
      <PropField label="Options">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={block.props.headerRow !== false} onChange={(e) => up("headerRow", e.target.checked)} className="rounded" />
            <span className="text-xs">Header Row</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={block.props.stripeRows !== false} onChange={(e) => up("stripeRows", e.target.checked)} className="rounded" />
            <span className="text-xs">Striped Rows</span>
          </label>
        </div>
      </PropField>
      <ColorPicker label="Header Background" value={block.props.headerBg || "#1e293b"} onChange={(v) => up("headerBg", v)} />
      <ColorPicker label="Border Color" value={block.props.borderColor || "#e2e8f0"} onChange={(v) => up("borderColor", v)} />
      <PropField label="Cell Padding">
        <Input value={block.props.cellPadding || "10px 12px"} onChange={(e) => up("cellPadding", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function QuoteProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Quote Text">
        <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full min-h-[80px] rounded-md border px-3 py-2 text-xs bg-background" />
      </PropField>
      <PropField label="Style">
        <select value={block.props.style || "border-left"} onChange={(e) => up("style", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="border-left">Left Border</option>
          <option value="boxed">Boxed</option>
        </select>
      </PropField>
      <ColorPicker label="Accent Color" value={block.props.borderColor || "#3b82f6"} onChange={(v) => up("borderColor", v)} />
      <ColorPicker label="Background" value={block.props.bgColor || "#eff6ff"} onChange={(v) => up("bgColor", v)} />
      <ColorPicker label="Text Color" value={block.props.textColor || "#1e40af"} onChange={(v) => up("textColor", v)} />
    </div>
  );
}

function ListProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const items: string[] = block.props.items || [];
  return (
    <div className="space-y-3">
      <PropField label="List Style">
        <select value={block.props.style || "unordered"} onChange={(e) => up("style", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="unordered">Bullet List</option>
          <option value="ordered">Numbered List</option>
        </select>
      </PropField>
      <PropField label="Items">
        <div className="space-y-1">
          {items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
              <Input value={item} onChange={(e) => { const ni = [...items]; ni[i] = e.target.value; up("items", ni); }} className="flex-1 h-7 text-xs" />
              <button onClick={() => up("items", items.filter((_: string, j: number) => j !== i))} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => up("items", [...items, "New item"])}>
            <Plus className="h-3 w-3 mr-1" />Add Item
          </Button>
        </div>
      </PropField>
      <ColorPicker label="Text Color" value={block.props.color || "#333333"} onChange={(v) => up("color", v)} />
    </div>
  );
}

function ChecklistProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const items: Array<{ text: string; checked: boolean }> = block.props.items || [];
  return (
    <div className="space-y-3">
      <PropField label="Items">
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input type="checkbox" checked={item.checked} onChange={(e) => { const ni = [...items]; ni[i] = { ...ni[i], checked: e.target.checked }; up("items", ni); }} className="rounded shrink-0" />
              <Input value={item.text} onChange={(e) => { const ni = [...items]; ni[i] = { ...ni[i], text: e.target.value }; up("items", ni); }} className="flex-1 h-7 text-xs" />
              <button onClick={() => up("items", items.filter((_, j) => j !== i))} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => up("items", [...items, { text: "New task", checked: false }])}>
            <Plus className="h-3 w-3 mr-1" />Add Task
          </Button>
        </div>
      </PropField>
    </div>
  );
}

function HeaderProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const fileRef = useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => up("logo", reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-3">
      <PropField label="Title">
        <Input value={block.props.title || ""} onChange={(e) => up("title", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Subtitle">
        <Input value={block.props.subtitle || ""} onChange={(e) => up("subtitle", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Logo">
        <div className="space-y-2">
          {block.props.logo && (
            <div className="p-2 border rounded-md bg-muted/30 text-center">
              <img src={block.props.logo} alt="Logo" className="max-h-12 inline-block" />
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Logo
          </Button>
          <Input value={block.props.logo || ""} onChange={(e) => up("logo", e.target.value)} placeholder="Or paste URL..." className="h-8 text-xs" />
        </div>
      </PropField>
      <PropField label="Layout">
        <select value={block.props.layout || "logo-left"} onChange={(e) => up("layout", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="logo-left">Logo Left</option>
          <option value="logo-right">Logo Right</option>
          <option value="centered">Centered</option>
        </select>
      </PropField>
      <ColorPicker label="Background" value={block.props.bgColor || "#1e293b"} onChange={(v) => up("bgColor", v)} />
      <ColorPicker label="Text Color" value={block.props.textColor || "#ffffff"} onChange={(v) => up("textColor", v)} />
      <PropField label="Padding">
        <Input value={block.props.padding || "32px"} onChange={(e) => up("padding", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function FooterProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: string) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Footer Content">
        <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full min-h-[100px] rounded-md border px-3 py-2 text-xs font-mono bg-muted/30" />
      </PropField>
      <ColorPicker label="Background" value={block.props.bgColor || "#f8fafc"} onChange={(v) => up("bgColor", v)} />
      <PropField label="Border Top">
        <Input value={block.props.borderTop || ""} onChange={(e) => up("borderTop", e.target.value)} placeholder="1px solid #e2e8f0" className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function SignatureProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Label">
        <Input value={block.props.label || ""} onChange={(e) => up("label", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Name">
        <Input value={block.props.name || ""} onChange={(e) => up("name", e.target.value)} placeholder="Signatory name" className="h-8 text-xs" />
      </PropField>
      <PropField label="Title/Role">
        <Input value={block.props.title || ""} onChange={(e) => up("title", e.target.value)} placeholder="Job title" className="h-8 text-xs" />
      </PropField>
      <PropField label="Line Width">
        <Input value={block.props.lineWidth || "200px"} onChange={(e) => up("lineWidth", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Show Date Line">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={block.props.date !== false} onChange={(e) => up("date", e.target.checked)} className="rounded" />
          <span className="text-xs">Include date field</span>
        </label>
      </PropField>
      <AlignmentPicker value={block.props.align || "left"} onChange={(v) => up("align", v)} />
    </div>
  );
}

function AttachmentProps({ block, onChange, onAttach }: { block: DocBlockData; onChange: (b: DocBlockData) => void; onAttach?: (files: File[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ ...block, props: { ...block.props, fileName: file.name, fileSize: `${(file.size / 1024).toFixed(1)} KB`, fileType: file.type.split("/")[1]?.toUpperCase() || "FILE" } });
    onAttach?.([file]);
  };
  return (
    <div className="space-y-3">
      <PropField label="Attach Document">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => fileRef.current?.click()}>
          <Paperclip className="h-3.5 w-3.5 mr-1.5" />Choose File
        </Button>
      </PropField>
      {block.props.fileName && (
        <div className="p-2 border rounded-md bg-muted/30 text-xs">
          <p className="font-medium">{block.props.fileName}</p>
          <p className="text-muted-foreground">{block.props.fileSize} {block.props.fileType}</p>
        </div>
      )}
    </div>
  );
}

function CalloutProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Variant">
        <select value={block.props.variant || "info"} onChange={(e) => up("variant", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="info">ℹ️ Info</option>
          <option value="warning">⚠️ Warning</option>
          <option value="error">❌ Error / Danger</option>
          <option value="success">✅ Success</option>
          <option value="tip">💡 Tip</option>
        </select>
      </PropField>
      <PropField label="Title (optional)">
        <Input value={block.props.title || ""} onChange={(e) => up("title", e.target.value)} placeholder="Callout title..." className="h-8 text-xs" />
      </PropField>
      <PropField label="Content">
        <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full min-h-[80px] rounded-md border px-3 py-2 text-xs bg-background" />
      </PropField>
      <PropField label="Show Icon">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={block.props.icon !== false} onChange={(e) => up("icon", e.target.checked)} className="rounded" />
          <span className="text-xs">Display variant icon</span>
        </label>
      </PropField>
      <ColorPicker label="Background Override" value={block.props.bgColor || ""} onChange={(v) => up("bgColor", v)} />
      <ColorPicker label="Border Override" value={block.props.borderColor || ""} onChange={(v) => up("borderColor", v)} />
      <PropField label="Border Radius">
        <Input value={block.props.borderRadius || "8px"} onChange={(e) => up("borderRadius", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function CodeblockProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Code">
        <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full min-h-[150px] rounded-md border px-3 py-2 text-xs font-mono bg-muted/30" spellCheck={false} />
      </PropField>
      <PropField label="Language">
        <select value={block.props.language || "javascript"} onChange={(e) => up("language", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="sql">SQL</option>
          <option value="json">JSON</option>
          <option value="bash">Bash / Shell</option>
          <option value="text">Plain Text</option>
        </select>
      </PropField>
      <PropField label="Theme">
        <select value={block.props.theme || "dark"} onChange={(e) => up("theme", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </PropField>
      <PropField label="Show Line Numbers">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={block.props.showLineNumbers !== false} onChange={(e) => up("showLineNumbers", e.target.checked)} className="rounded" />
          <span className="text-xs">Display line numbers</span>
        </label>
      </PropField>
      <PropField label="Font Size">
        <Input value={block.props.fontSize || "13px"} onChange={(e) => up("fontSize", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function SocialProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const links: Array<{ platform: string; url: string; label: string }> = block.props.links || [];
  const platforms = ["website", "email", "phone", "facebook", "twitter", "linkedin", "instagram", "youtube", "github", "tiktok"];
  return (
    <div className="space-y-3">
      <PropField label="Social Links">
        <div className="space-y-1.5">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-1 border rounded-md p-1.5">
              <select value={link.platform} onChange={(e) => { const nl = [...links]; nl[i] = { ...nl[i], platform: e.target.value }; up("links", nl); }} className="h-7 text-[10px] px-1 border rounded bg-background w-20 shrink-0">
                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input value={link.url} onChange={(e) => { const nl = [...links]; nl[i] = { ...nl[i], url: e.target.value }; up("links", nl); }} placeholder="URL..." className="flex-1 h-7 text-[10px]" />
              <Input value={link.label} onChange={(e) => { const nl = [...links]; nl[i] = { ...nl[i], label: e.target.value }; up("links", nl); }} placeholder="Label" className="w-16 h-7 text-[10px]" />
              <button onClick={() => up("links", links.filter((_, j) => j !== i))} className="p-0.5 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => up("links", [...links, { platform: "website", url: "https://", label: "" }])}>
            <Plus className="h-3 w-3 mr-1" />Add Link
          </Button>
        </div>
      </PropField>
      <PropField label="Style">
        <select value={block.props.style || "colored"} onChange={(e) => up("style", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="colored">Colored Icons</option>
          <option value="dark">Dark Icons</option>
          <option value="light">Light Icons</option>
          <option value="outlined">Outlined</option>
        </select>
      </PropField>
      <AlignmentPicker value={block.props.align || "center"} onChange={(v) => up("align", v)} />
      <PropField label="Gap">
        <Input value={block.props.gap || "12px"} onChange={(e) => up("gap", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function ProgressProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Value">
        <div className="flex items-center gap-2">
          <input type="range" min="0" max={block.props.max || 100} value={block.props.value || 0} onChange={(e) => up("value", Number(e.target.value))} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10 text-right">{block.props.value || 0}%</span>
        </div>
      </PropField>
      <PropField label="Label">
        <Input value={block.props.label || ""} onChange={(e) => up("label", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Show Value">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={block.props.showValue !== false} onChange={(e) => up("showValue", e.target.checked)} className="rounded" />
          <span className="text-xs">Display percentage</span>
        </label>
      </PropField>
      <PropField label="Bar Height">
        <Input value={block.props.height || "12px"} onChange={(e) => up("height", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <ColorPicker label="Fill Color" value={block.props.fillColor || "#3b82f6"} onChange={(v) => up("fillColor", v)} />
      <ColorPicker label="Track Color" value={block.props.bgColor || "#e2e8f0"} onChange={(v) => up("bgColor", v)} />
      <PropField label="Border Radius">
        <Input value={block.props.borderRadius || "6px"} onChange={(e) => up("borderRadius", e.target.value)} className="h-8 text-xs" />
      </PropField>
    </div>
  );
}

function TocProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Title">
        <Input value={block.props.title || "Table of Contents"} onChange={(e) => up("title", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <PropField label="Max Depth">
        <select value={block.props.maxDepth || 3} onChange={(e) => up("maxDepth", Number(e.target.value))} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value={1}>H1 only</option>
          <option value={2}>H1 – H2</option>
          <option value={3}>H1 – H3</option>
          <option value={4}>H1 – H4</option>
        </select>
      </PropField>
      <PropField label="Numbered">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={block.props.numbered !== false} onChange={(e) => up("numbered", e.target.checked)} className="rounded" />
          <span className="text-xs">Show numbers</span>
        </label>
      </PropField>
      <ColorPicker label="Background" value={block.props.bgColor || "#f8fafc"} onChange={(v) => up("bgColor", v)} />
    </div>
  );
}

function RatingProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  return (
    <div className="space-y-3">
      <PropField label="Rating">
        <div className="flex items-center gap-2">
          <input type="range" min="0" max={block.props.max || 5} step="1" value={block.props.value || 0} onChange={(e) => up("value", Number(e.target.value))} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{block.props.value || 0}/{block.props.max || 5}</span>
        </div>
      </PropField>
      <PropField label="Max Stars">
        <select value={block.props.max || 5} onChange={(e) => up("max", Number(e.target.value))} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value={3}>3 Stars</option>
          <option value={5}>5 Stars</option>
          <option value={10}>10 Stars</option>
        </select>
      </PropField>
      <PropField label="Label">
        <Input value={block.props.label || ""} onChange={(e) => up("label", e.target.value)} placeholder="Optional label..." className="h-8 text-xs" />
      </PropField>
      <ColorPicker label="Star Color" value={block.props.color || "#f59e0b"} onChange={(v) => up("color", v)} />
      <PropField label="Size">
        <Input value={block.props.size || "24px"} onChange={(e) => up("size", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <AlignmentPicker value={block.props.align || "left"} onChange={(v) => up("align", v)} />
    </div>
  );
}

function BadgeProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  const up = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  const presets = [
    { label: "Blue", bg: "#3b82f6", text: "#ffffff" },
    { label: "Green", bg: "#22c55e", text: "#ffffff" },
    { label: "Red", bg: "#ef4444", text: "#ffffff" },
    { label: "Yellow", bg: "#f59e0b", text: "#000000" },
    { label: "Purple", bg: "#8b5cf6", text: "#ffffff" },
    { label: "Gray", bg: "#6b7280", text: "#ffffff" },
    { label: "Outlined", bg: "transparent", text: "#333333" },
  ];
  return (
    <div className="space-y-3">
      <PropField label="Badge Text">
        <Input value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Quick Presets">
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button key={p.label} onClick={() => { up("bgColor", p.bg); up("textColor", p.text); }}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium border hover:opacity-80"
              style={{ background: p.bg, color: p.text, borderColor: p.bg === "transparent" ? "#d1d5db" : p.bg }}>{p.label}</button>
          ))}
        </div>
      </PropField>
      <ColorPicker label="Background" value={block.props.bgColor || "#3b82f6"} onChange={(v) => up("bgColor", v)} />
      <ColorPicker label="Text Color" value={block.props.textColor || "#ffffff"} onChange={(v) => up("textColor", v)} />
      <PropField label="Border Radius">
        <select value={block.props.borderRadius || "9999px"} onChange={(e) => up("borderRadius", e.target.value)} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="9999px">Pill</option>
          <option value="6px">Rounded</option>
          <option value="2px">Square</option>
        </select>
      </PropField>
      <PropField label="Font Size">
        <Input value={block.props.fontSize || "12px"} onChange={(e) => up("fontSize", e.target.value)} className="h-8 text-xs" />
      </PropField>
      <AlignmentPicker value={block.props.align || "left"} onChange={(v) => up("align", v)} />
    </div>
  );
}

function HtmlProps({ block, onChange }: { block: DocBlockData; onChange: (b: DocBlockData) => void }) {
  return (
    <PropField label="HTML Code">
      <textarea className="w-full min-h-[150px] rounded-md border px-3 py-2 text-xs font-mono bg-muted/30" value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} />
    </PropField>
  );
}

// ─── Block Canvas Renderer ───────────────────────────────────────────────────

function BlockRenderer({ block, selected, onSelect, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: DocBlockData; selected: boolean; onSelect: () => void; onUpdate: (b: DocBlockData) => void; onDelete: () => void; onDuplicate: () => void; onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const renderContent = () => {
    switch (block.type) {
      case "text":
        return (
          <div contentEditable suppressContentEditableWarning className="outline-none min-h-[24px] px-2 py-1"
            style={{ textAlign: (block.props.align || "left") as any, color: block.props.color, fontSize: block.props.fontSize, lineHeight: block.props.lineHeight }}
            dangerouslySetInnerHTML={{ __html: block.content }}
            onBlur={(e) => onUpdate({ ...block, content: e.currentTarget.innerHTML })} />
        );
      case "heading": {
        const Tag = (block.props.level || "h2") as keyof JSX.IntrinsicElements;
        const sizes: Record<string, string> = { h1: "28px", h2: "24px", h3: "20px", h4: "16px" };
        return (
          <div contentEditable suppressContentEditableWarning className="outline-none px-2"
            style={{ textAlign: (block.props.align || "left") as any, color: block.props.color, fontSize: block.props.fontSize || sizes[block.props.level || "h2"], fontWeight: block.props.fontWeight || "700", borderBottom: block.props.borderBottom ? "2px solid #e2e8f0" : undefined, paddingBottom: block.props.borderBottom ? "8px" : undefined }}
            dangerouslySetInnerHTML={{ __html: block.content }}
            onBlur={(e) => onUpdate({ ...block, content: e.currentTarget.textContent || "" })} />
        );
      }
      case "image":
        return (
          <div style={{ textAlign: (block.props.align || "center") as any }} className="py-2">
            {block.props.src ? (
              <div>
                <img src={block.props.src} alt={block.props.alt} style={{ maxWidth: block.props.maxWidth || "400px", width: block.props.width, borderRadius: block.props.borderRadius, display: "inline-block" }} />
                {block.props.caption && <p className="text-xs text-muted-foreground mt-2 text-center">{block.props.caption}</p>}
              </div>
            ) : (
              <div className="bg-muted/50 p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg inline-block">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Upload or enter image URL</p>
              </div>
            )}
          </div>
        );
      case "logo":
        return (
          <div style={{ textAlign: (block.props.align || "left") as any, padding: block.props.padding || "16px 0" }}>
            {block.props.src ? (
              <img src={block.props.src} alt={block.props.alt || "Logo"} style={{ width: block.props.width || "180px", height: block.props.height || "auto" }} />
            ) : (
              <div className="inline-block bg-muted/50 px-8 py-5 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Upload className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-[10px]">Upload Logo</p>
              </div>
            )}
          </div>
        );
      case "button":
        return (
          <div style={{ textAlign: (block.props.align || "center") as any }} className="py-3">
            <span style={{ display: "inline-block", background: block.props.bgColor, color: block.props.textColor, padding: block.props.padding, borderRadius: block.props.borderRadius, fontWeight: block.props.fontWeight, fontSize: block.props.fontSize, cursor: "default" }}>
              {block.content}
            </span>
          </div>
        );
      case "divider":
        return <div className="py-2"><hr style={{ border: "none", borderTop: `${block.props.thickness} ${block.props.style || "solid"} ${block.props.color}`, width: block.props.width }} /></div>;
      case "spacer":
        return <div style={{ height: block.props.height }} className="bg-muted/20 rounded border border-dashed border-muted-foreground/20 flex items-center justify-center text-[10px] text-muted-foreground">Spacer: {block.props.height}</div>;
      case "pagebreak":
        return <div className="my-2 border-t-2 border-dashed border-orange-300 py-2 text-center text-[10px] text-orange-500 font-medium bg-orange-50/50 rounded">— PAGE BREAK —</div>;
      case "columns":
        return (
          <div className="flex py-2" style={{ gap: block.props.gap }}>
            {Array.from({ length: block.props.columns || 2 }, (_, i) => (
              <div key={i} className="border border-dashed border-muted-foreground/30 rounded p-2 min-h-[60px]"
                style={{ width: (block.props.widths || [])[i] || "auto", background: block.props[`bgColor${i + 1}`] || undefined }}
                contentEditable suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: block.props[`content${i + 1}`] || `<p>Column ${i + 1}</p>` }}
                onBlur={(e) => onUpdate({ ...block, props: { ...block.props, [`content${i + 1}`]: e.currentTarget.innerHTML } })} />
            ))}
          </div>
        );
      case "table": {
        const { data = [], headerRow = true, stripeRows = true, borderColor = "#e2e8f0", headerBg = "#1e293b", headerColor = "#ffffff", cellPadding = "10px 12px", fontSize = "13px" } = block.props;
        return (
          <div className="py-2 overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                {data.map((row: string[], ri: number) => {
                  const isH = headerRow && ri === 0;
                  const stripe = !isH && stripeRows && ri % 2 === 0;
                  return (
                    <tr key={ri}>
                      {row.map((cell: string, ci: number) => (
                        <td key={ci} contentEditable suppressContentEditableWarning
                          className="outline-none"
                          style={{
                            padding: cellPadding, fontSize, border: `1px solid ${borderColor}`,
                            ...(isH ? { background: headerBg, color: headerColor, fontWeight: 600 } : {}),
                            ...(stripe ? { background: "#f8fafc" } : {}),
                          }}
                          dangerouslySetInnerHTML={{ __html: cell }}
                          onBlur={(e) => {
                            const nd = data.map((r: string[], i: number) => i === ri ? r.map((c: string, j: number) => j === ci ? e.currentTarget.textContent || "" : c) : [...r]);
                            onUpdate({ ...block, props: { ...block.props, data: nd } });
                          }} />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      case "quote":
        return block.props.style === "border-left"
          ? <blockquote className="my-2 py-3 px-4 italic rounded-r-lg" style={{ borderLeft: `4px solid ${block.props.borderColor || "#3b82f6"}`, background: block.props.bgColor, color: block.props.textColor, fontSize: block.props.fontSize }}
            contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: block.content }}
            onBlur={(e) => onUpdate({ ...block, content: e.currentTarget.innerHTML })} />
          : <blockquote className="my-2 py-4 px-5 italic rounded-lg text-center border" style={{ background: block.props.bgColor, color: block.props.textColor, fontSize: block.props.fontSize, borderColor: block.props.borderColor }}
            contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: block.content }}
            onBlur={(e) => onUpdate({ ...block, content: e.currentTarget.innerHTML })} />;
      case "list": {
        const Tag = block.props.style === "ordered" ? "ol" : "ul";
        return (
          <Tag className="py-1 px-6" style={{ color: block.props.color, fontSize: block.props.fontSize }}>
            {(block.props.items || []).map((it: string, i: number) => (
              <li key={i} style={{ marginBottom: block.props.spacing }}>{it}</li>
            ))}
          </Tag>
        );
      }
      case "checklist":
        return (
          <div className="py-2 px-2 space-y-1.5">
            {(block.props.items || []).map((it: { text: string; checked: boolean }, i: number) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: block.props.fontSize }}>
                <input type="checkbox" checked={it.checked} readOnly className="rounded" />
                <span className={it.checked ? "line-through text-muted-foreground" : ""}>{it.text}</span>
              </label>
            ))}
          </div>
        );
      case "html":
        return <div className="py-2 px-2 bg-muted/20 rounded font-mono text-xs overflow-auto max-h-[120px] border border-dashed" dangerouslySetInnerHTML={{ __html: block.content }} />;
      case "header": {
        const layout = block.props.layout || "logo-left";
        return (
          <div style={{ background: block.props.bgColor, color: block.props.textColor, padding: block.props.padding, borderBottom: block.props.borderBottom }}
            className={cn("rounded-t", layout === "centered" ? "text-center" : "flex items-center gap-5", layout === "logo-right" ? "flex-row-reverse" : "")}>
            {block.props.logo && <img src={block.props.logo} alt="Logo" className="max-h-14" />}
            <div>
              {block.props.title && <h2 className="text-xl font-bold m-0">{block.props.title}</h2>}
              {block.props.subtitle && <p className="text-sm opacity-80 m-0 mt-1">{block.props.subtitle}</p>}
            </div>
          </div>
        );
      }
      case "footer":
        return (
          <div style={{ background: block.props.bgColor, padding: block.props.padding, borderTop: block.props.borderTop }} className="rounded-b"
            contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: block.content }}
            onBlur={(e) => onUpdate({ ...block, content: e.currentTarget.innerHTML })} />
        );
      case "signature":
        return (
          <div style={{ textAlign: (block.props.align || "left") as any }} className="py-4">
            <div className="inline-block">
              <div className="border-b border-foreground/50" style={{ width: block.props.lineWidth || "200px", paddingBottom: "40px" }} />
              <p className="text-xs font-semibold mt-2 mb-0">{block.props.label || "Authorized Signature"}</p>
              {block.props.name && <p className="text-xs text-muted-foreground m-0">{block.props.name}</p>}
              {block.props.title && <p className="text-[11px] text-muted-foreground/70 m-0">{block.props.title}</p>}
              {block.props.date && <p className="text-[11px] text-muted-foreground/70 mt-1">Date: _______________</p>}
            </div>
          </div>
        );
      case "attachment":
        return (
          <div className={cn("py-2 px-3 border rounded-lg my-1", block.props.fileName ? "bg-muted/30" : "border-dashed border-2 bg-muted/10")}>
            {block.props.fileName ? (
              <div className="flex items-center gap-3">
                <Paperclip className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{block.props.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{block.props.fileSize} {block.props.fileType}</p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                <Paperclip className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs">Click to attach document</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={cn("group relative border rounded-lg transition-all cursor-pointer",
        selected ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-transparent hover:border-muted-foreground/30"
      )}>
      {selected && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-background border rounded-md shadow-sm px-1 py-0.5 z-10">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="p-1 hover:bg-muted rounded disabled:opacity-30" title="Move up"><ChevronUp className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="p-1 hover:bg-muted rounded disabled:opacity-30" title="Move down"><ChevronDown className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-muted rounded" title="Duplicate"><Copy className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded" title="Delete"><Trash2 className="h-3 w-3" /></button>
        </div>
      )}
      <div className={cn("absolute -left-1 top-1/2 -translate-y-1/2 transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover:opacity-60")}>
        <div className="bg-primary text-primary-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded-r-md uppercase tracking-wider">{block.type}</div>
      </div>
      <div className="px-2 py-1">{renderContent()}</div>
    </div>
  );
}

// ─── Global Styles Panel ─────────────────────────────────────────────────────

function GlobalStylesPanel({ styles, onChange }: { styles: Record<string, any>; onChange: (s: Record<string, any>) => void }) {
  return (
    <div className="space-y-4 p-3">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Palette className="h-4 w-4" />Global Styles & Layout</h3>
      <ColorPicker label="Page Background" value={styles.bgColor || "#ffffff"} onChange={(v) => onChange({ ...styles, bgColor: v })} />
      <PropField label="Content Width (px)">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => onChange({ ...styles, contentWidth: String(Math.max(400, parseInt(styles.contentWidth || "800") - 50)) })}>−</Button>
          <Input type="number" value={styles.contentWidth || "800"} onChange={(e) => onChange({ ...styles, contentWidth: e.target.value })} className="flex-1 h-8 text-xs text-center" />
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => onChange({ ...styles, contentWidth: String(Math.min(1200, parseInt(styles.contentWidth || "800") + 50)) })}>+</Button>
        </div>
      </PropField>
      <PropField label="Page Margin">
        <Input value={styles.pageMargin || "40px"} onChange={(e) => onChange({ ...styles, pageMargin: e.target.value })} className="h-8 text-xs" />
      </PropField>
      <PropField label="Font Family">
        <select value={styles.fontFamily || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"} onChange={(e) => onChange({ ...styles, fontFamily: e.target.value })} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
          <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="'Inter', sans-serif">Inter</option>
        </select>
      </PropField>

      <div className="border-t pt-3">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Heading Styles</h4>
        <PropField label="Heading Font">
          <select value={styles.headingFont || ""} onChange={(e) => onChange({ ...styles, headingFont: e.target.value })} className="w-full h-8 text-xs px-2 border rounded-md bg-background">
            <option value="">Same as body</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Arial, sans-serif">Arial</option>
          </select>
        </PropField>
        <ColorPicker label="Heading Color" value={styles.headingColor || "#111827"} onChange={(v) => onChange({ ...styles, headingColor: v })} />
      </div>

      <div className="border-t pt-3">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Button Styles</h4>
        <ColorPicker label="Default Button Color" value={styles.buttonColor || "#3b82f6"} onChange={(v) => onChange({ ...styles, buttonColor: v })} />
        <PropField label="Border Radius">
          <Input value={styles.buttonRadius || "6px"} onChange={(e) => onChange({ ...styles, buttonRadius: e.target.value })} className="h-8 text-xs" />
        </PropField>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DocumentBlockEditor({ value, onChange, placeholder, variables, minHeight = "600px", onAttach, attachments }: DocumentBlockEditorProps) {
  const [mode, setMode] = useState<EditorMode>("blocks");
  const [blocks, setBlocks] = useState<DocBlockData[]>(() => {
    if (!value || value.trim().length === 0) return [];
    return htmlToBlocks(value).blocks;
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [codeValue, setCodeValue] = useState(value || "");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [globalStyles, setGlobalStyles] = useState<Record<string, any>>({ bgColor: "#ffffff", contentWidth: "800", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", pageMargin: "40px" });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("blocks");
  const [undoStack, setUndoStack] = useState<DocBlockData[][]>([]);
  const [redoStack, setRedoStack] = useState<DocBlockData[][]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"none" | "blocks" | "properties">("none");
  const fileAttachRef = useRef<HTMLInputElement>(null);

  const syncToParent = useCallback((newBlocks: DocBlockData[]) => {
    const html = blocksToHtml(newBlocks, globalStyles);
    onChange(html);
  }, [onChange, globalStyles]);

  const updateBlocks = useCallback((newBlocks: DocBlockData[]) => {
    setUndoStack(prev => [...prev.slice(-30), blocks]);
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

  const addBlock = useCallback((type: DocBlockType) => {
    const newBlock = getDefaultBlock(type);
    const newBlocks = [...blocks, newBlock];
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
    setSidebarTab("properties");
  }, [blocks, updateBlocks]);

  const updateBlock = useCallback((updated: DocBlockData) => {
    const newBlocks = blocks.map(b => b.id === updated.id ? updated : b);
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const deleteBlock = useCallback((id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [blocks, updateBlocks, selectedBlockId]);

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const clone = { ...blocks[idx], id: createBlockId(), props: { ...blocks[idx].props } };
    updateBlocks([...blocks.slice(0, idx + 1), clone, ...blocks.slice(idx + 1)]);
    setSelectedBlockId(clone.id);
  }, [blocks, updateBlocks]);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1 || (direction === "up" && idx === 0) || (direction === "down" && idx === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Mode switching with content preservation
  const switchMode = useCallback((newMode: EditorMode) => {
    if (mode === "blocks" && newMode !== "blocks") {
      const html = blocksToHtml(blocks, globalStyles);
      setCodeValue(html);
      if (newMode === "richtext") onChange(html);
    } else if (mode === "code" && newMode === "blocks") {
      const { blocks: parsed } = htmlToBlocks(codeValue);
      setBlocks(parsed);
    } else if (mode === "code" && newMode === "richtext") {
      onChange(codeValue);
    } else if (mode === "richtext" && newMode === "blocks") {
      const { blocks: parsed } = htmlToBlocks(value);
      setBlocks(parsed);
    } else if (mode === "richtext" && newMode === "code") {
      setCodeValue(value);
    }
    setMode(newMode);
  }, [mode, blocks, codeValue, globalStyles, value, onChange]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCodeValue(newCode);
    onChange(newCode);
  }, [onChange]);

  const handleAttachFile = () => fileAttachRef.current?.click();
  const onFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onAttach?.(files);
    e.target.value = "";
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;
  const deviceWidth = previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "375px";

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const renderPropertyEditor = () => {
    if (!selectedBlock) return (
      <div className="p-6 text-center text-muted-foreground">
        <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium mb-1">No block selected</p>
        <p className="text-[11px] opacity-60">Click a block in the canvas to edit its properties, or add a new block from the sidebar.</p>
      </div>
    );
    const props = { block: selectedBlock, onChange: updateBlock };
    return (
      <div className="p-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold capitalize flex items-center gap-2">
            {ALL_BLOCK_TYPES.find(b => b.type === selectedBlock.type)?.icon}
            {selectedBlock.type} Block
          </h3>
          <button onClick={() => deleteBlock(selectedBlock.id)} className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
        {selectedBlock.type === "text" && <TextProps {...props} />}
        {selectedBlock.type === "heading" && <HeadingProps {...props} />}
        {selectedBlock.type === "image" && <ImageProps {...props} />}
        {selectedBlock.type === "logo" && <LogoProps {...props} />}
        {selectedBlock.type === "button" && <ButtonProps {...props} />}
        {selectedBlock.type === "divider" && <DividerProps {...props} />}
        {selectedBlock.type === "spacer" && <SpacerProps {...props} />}
        {selectedBlock.type === "columns" && <ColumnsProps {...props} />}
        {selectedBlock.type === "table" && <TableProps {...props} />}
        {selectedBlock.type === "quote" && <QuoteProps {...props} />}
        {selectedBlock.type === "list" && <ListProps {...props} />}
        {selectedBlock.type === "checklist" && <ChecklistProps {...props} />}
        {selectedBlock.type === "header" && <HeaderProps {...props} />}
        {selectedBlock.type === "footer" && <FooterProps {...props} />}
        {selectedBlock.type === "signature" && <SignatureProps {...props} />}
        {selectedBlock.type === "attachment" && <AttachmentProps {...props} onAttach={onAttach} />}
        {selectedBlock.type === "html" && <HtmlProps {...props} />}
      </div>
    );
  };

  return (
    <div className="border rounded-lg bg-background overflow-hidden flex flex-col" style={{ minHeight }}>
      {/* Hidden file input for global attach */}
      <input ref={fileAttachRef} type="file" multiple className="hidden" onChange={onFileAttach} />

      {/* ── Top Toolbar ── */}
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Mobile panel toggle */}
          {mode === "blocks" && (
            <button
              onClick={() => setMobilePanel(prev => prev === "none" ? "blocks" : "none")}
              className="lg:hidden p-1.5 rounded hover:bg-muted"
              title="Toggle panels"
            >
              {mobilePanel !== "none" ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
          {/* Mode switcher */}
          <div className="flex items-center rounded-md border bg-background p-0.5">
            <button onClick={() => switchMode("blocks")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-sm transition-colors", mode === "blocks" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <LayoutGrid className="h-3.5 w-3.5 inline mr-1.5" /><span className="hidden sm:inline">Block Editor</span><span className="sm:hidden">Blocks</span>
            </button>
            <button onClick={() => switchMode("richtext")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-sm transition-colors", mode === "richtext" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <FileText className="h-3.5 w-3.5 inline mr-1.5" /><span className="hidden sm:inline">Rich Text</span><span className="sm:hidden">Rich</span>
            </button>
            <button onClick={() => switchMode("code")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-sm transition-colors", mode === "code" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <Code className="h-3.5 w-3.5 inline mr-1.5" /><span className="hidden sm:inline">HTML Code</span><span className="sm:hidden">HTML</span>
            </button>
          </div>

          {/* Mobile panel switcher (blocks vs properties) */}
          {mode === "blocks" && (
            <div className="lg:hidden flex items-center gap-0.5 rounded-md border bg-background p-0.5">
              <button onClick={() => setMobilePanel(prev => prev === "blocks" ? "none" : "blocks")}
                className={cn("p-1.5 rounded-sm text-xs", mobilePanel === "blocks" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                title="Block palette"><PanelLeftClose className="h-3.5 w-3.5" /></button>
              <button onClick={() => setMobilePanel(prev => prev === "properties" ? "none" : "properties")}
                className={cn("p-1.5 rounded-sm text-xs", mobilePanel === "properties" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                title="Properties"><Settings2 className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Attach file button - available in all modes */}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleAttachFile}>
            <Paperclip className="h-3.5 w-3.5" />Attach
          </Button>

          {mode === "blocks" && (
            <>
              <div className="w-px h-5 bg-border" />
              <button onClick={undo} disabled={undoStack.length === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
              <button onClick={redo} disabled={redoStack.length === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30" title="Redo (Ctrl+Y)"><Redo2 className="h-4 w-4" /></button>
            </>
          )}

          <div className="hidden sm:block w-px h-5 bg-border" />

          {/* Device preview (hidden on small screens) */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-md border bg-background p-0.5">
            <button onClick={() => setPreviewDevice("desktop")} className={cn("p-1.5 rounded-sm", previewDevice === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} title="Desktop"><Monitor className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPreviewDevice("tablet")} className={cn("p-1.5 rounded-sm", previewDevice === "tablet" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} title="Tablet"><Tablet className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPreviewDevice("mobile")} className={cn("p-1.5 rounded-sm", previewDevice === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} title="Mobile"><Smartphone className="h-3.5 w-3.5" /></button>
          </div>

          <button onClick={() => setShowPreview(!showPreview)} className={cn("p-1.5 rounded hover:bg-muted", showPreview && "bg-primary text-primary-foreground")} title="Preview"><Eye className="h-4 w-4" /></button>
        </div>
      </div>

      {/* ── Preview Overlay ── */}
      {showPreview && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
            <h3 className="text-sm font-semibold">Document Preview</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>Close Preview</Button>
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center">
            <div className="bg-white shadow-lg" style={{ width: deviceWidth, maxWidth: `${globalStyles.contentWidth || 800}px` }}>
              <div dangerouslySetInnerHTML={{ __html: mode === "code" ? codeValue : blocksToHtml(blocks, globalStyles) }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile panel backdrop ── */}
      {mobilePanel !== "none" && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobilePanel("none")} />
      )}

      {/* ── Main Area ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── LEFT: Block Palette (block mode only) ── */}
        {mode === "blocks" && (
          <div className={cn(
            "border-r bg-muted/20 overflow-y-auto shrink-0 transition-all",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-[220px]",
            "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:bg-background max-lg:shadow-xl max-lg:border-r",
            mobilePanel === "blocks" ? "max-lg:w-[220px]" : "max-lg:w-0 max-lg:overflow-hidden"
          )}>
            <div className="p-2">
              {BLOCK_CATEGORIES.map((cat) => (
                <div key={cat.label} className="mb-3">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1.5">{cat.label}</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {cat.blocks.map((bt) => (
                      <button key={bt.type} onClick={() => addBlock(bt.type)}
                        className="flex flex-col items-center gap-1 py-2 px-1.5 hover:bg-primary/10 transition-colors rounded-lg group border border-transparent hover:border-primary/20"
                        title={bt.description}>
                        <div className="text-muted-foreground group-hover:text-primary transition-colors">{bt.icon}</div>
                        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground leading-tight text-center">{bt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Left sidebar toggle (desktop only) */}
        {mode === "blocks" && (
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background border rounded-r-md p-1 hover:bg-muted shadow-sm"
            style={{ left: sidebarCollapsed ? 0 : 220 }}>
            {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        )}

        {/* ── CENTER: Canvas ── */}
        <div className="flex-1 overflow-y-auto" style={{ background: mode === "blocks" ? "#f1f5f9" : undefined }}>
          {mode === "blocks" && (
            <div className="flex justify-center py-6 px-4" onClick={() => setSelectedBlockId(null)}>
              <div className="bg-white rounded shadow-sm" style={{ width: deviceWidth, maxWidth: `${globalStyles.contentWidth || 800}px`, minHeight: "500px" }}>
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                    <LayoutGrid className="h-14 w-14 mb-4 opacity-20" />
                    <p className="text-base font-medium mb-1">Start building your document</p>
                    <p className="text-sm opacity-60 mb-6">Click a block on the left sidebar to add it</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addBlock("header")}>
                        <PanelLeftClose className="h-4 w-4 mr-1.5" />Add Header
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addBlock("text")}>
                        <Type className="h-4 w-4 mr-1.5" />Add Text
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addBlock("table")}>
                        <Table className="h-4 w-4 mr-1.5" />Add Table
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 space-y-1">
                    {blocks.map((block, idx) => (
                      <BlockRenderer key={block.id} block={block} selected={selectedBlockId === block.id}
                        onSelect={() => { setSelectedBlockId(block.id); setSidebarTab("properties"); setMobilePanel("properties"); }}
                        onUpdate={updateBlock} onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onMoveUp={() => moveBlock(block.id, "up")} onMoveDown={() => moveBlock(block.id, "down")}
                        isFirst={idx === 0} isLast={idx === blocks.length - 1} />
                    ))}
                    {/* Add block button at bottom */}
                    <div className="flex justify-center py-4">
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSidebarCollapsed(false)}>
                        <Plus className="h-4 w-4 mr-1.5" />Add Block
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "richtext" && (
            <div className="p-4">
              <RichTextEditor value={value} onChange={onChange}
                placeholder={placeholder || "Design your document template here..."}
                minHeight="500px" enhanced variables={variables} />
            </div>
          )}

          {mode === "code" && (
            <div className="p-4 h-full">
              <textarea className="w-full h-full min-h-[600px] rounded-md border bg-muted/30 px-4 py-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={codeValue} onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="<!-- Enter your HTML document code here -->" spellCheck={false} />
            </div>
          )}
        </div>

        {/* ── RIGHT: Properties / Styles Panel (block mode) ── */}
        {mode === "blocks" && (
          <div className={cn(
            "w-[300px] border-l bg-background overflow-y-auto shrink-0",
            "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:bg-background max-lg:shadow-xl max-lg:border-l",
            mobilePanel === "properties" ? "max-lg:w-[300px]" : "max-lg:w-0 max-lg:overflow-hidden"
          )}>
            <div className="flex border-b">
              <button onClick={() => setSidebarTab("properties")}
                className={cn("flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
                  sidebarTab === "properties" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Settings2 className="h-3.5 w-3.5 inline mr-1" />Properties
              </button>
              <button onClick={() => setSidebarTab("styles")}
                className={cn("flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
                  sidebarTab === "styles" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Palette className="h-3.5 w-3.5 inline mr-1" />Styles
              </button>
            </div>

            {sidebarTab === "styles" ? (
              <GlobalStylesPanel styles={globalStyles} onChange={setGlobalStyles} />
            ) : (
              renderPropertyEditor()
            )}

            {/* Variables panel at bottom */}
            {variables && variables.length > 0 && (
              <div className="border-t mt-2 pt-3 px-3 pb-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Template Variables</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                  {variables.map((v) => (
                    <button key={v.value}
                      className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-muted transition-colors flex items-center justify-between group"
                      onClick={() => {
                        if (selectedBlock && ["text", "footer", "html", "heading"].includes(selectedBlock.type)) {
                          updateBlock({ ...selectedBlock, content: selectedBlock.content + v.value });
                        }
                      }}
                      title={`Insert ${v.value}`}>
                      <span className="truncate">{v.label}</span>
                      <code className="text-[9px] text-muted-foreground group-hover:text-primary shrink-0 ml-1">{v.value}</code>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments list */}
            {attachments && attachments.length > 0 && (
              <div className="border-t mt-2 pt-3 px-3 pb-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attachments</h4>
                <div className="space-y-1">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded bg-muted/30">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1">{a.name}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">{a.size}</span>
                    </div>
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

export default DocumentBlockEditor;
