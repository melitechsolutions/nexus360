import { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent, Extension, Mark, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Strikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Table as TableIcon,
  Code,
  Maximize,
  Plus,
  Trash2,
  Rows3,
  Columns3,
  MergeIcon,
  SplitIcon,
  Quote,
  Highlighter,
  Subscript,
  Superscript,
  Type,
  ChevronDown,
  Palette,
  Upload,
  IndentIncrease,
  IndentDecrease,
  LineChart,
  Square,
  PaintBucket,
  Pipette,
  WrapText,
} from "lucide-react";

// === Custom TipTap Extensions (inline) ===

const FontFamily = Extension.create({
  name: "fontFamily",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontFamily?.replace(/['"]+/g, "") || null,
          renderHTML: (attrs: Record<string, string | null>) => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
        },
      },
    }];
  },
  addCommands(): any {
    return {
      setFontFamily: (ff: string) => ({ chain }: any) => chain().setMark("textStyle", { fontFamily: ff }).run(),
      unsetFontFamily: () => ({ chain }: any) => chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, string | null>) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands(): any {
    return {
      setFontSize: (fs: string) => ({ chain }: any) => chain().setMark("textStyle", { fontSize: fs }).run(),
      unsetFontSize: () => ({ chain }: any) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const HighlightMark = Mark.create({
  name: "highlight",
  addOptions() { return { multicolor: true, HTMLAttributes: {} }; },
  addAttributes() {
    if (!this.options.multicolor) return {};
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-color") || el.style.backgroundColor,
        renderHTML: (attrs: Record<string, string | null>) => {
          if (!attrs.color) return { style: "background-color: #fef08a" };
          return { "data-color": attrs.color, style: `background-color: ${attrs.color}` };
        },
      },
    };
  },
  parseHTML() { return [{ tag: "mark" }]; },
  renderHTML({ HTMLAttributes }: any) { return ["mark", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]; },
  addCommands(): any {
    return {
      setHighlight: (a?: any) => ({ commands }: any) => commands.setMark(this.name, a),
      toggleHighlight: (a?: any) => ({ commands }: any) => commands.toggleMark(this.name, a),
      unsetHighlight: () => ({ commands }: any) => commands.unsetMark(this.name),
    };
  },
});

const SubscriptMark = Mark.create({
  name: "subscript",
  parseHTML() { return [{ tag: "sub" }]; },
  renderHTML({ HTMLAttributes }: any) { return ["sub", mergeAttributes(HTMLAttributes), 0]; },
  addCommands(): any {
    return {
      toggleSubscript: () => ({ commands }: any) => commands.toggleMark(this.name),
    };
  },
});

const SuperscriptMark = Mark.create({
  name: "superscript",
  excludes: "subscript",
  parseHTML() { return [{ tag: "sup" }]; },
  renderHTML({ HTMLAttributes }: any) { return ["sup", mergeAttributes(HTMLAttributes), 0]; },
  addCommands(): any {
    return {
      toggleSuperscript: () => ({ commands }: any) => commands.toggleMark(this.name),
    };
  },
});

const LineSpacing = Extension.create({
  name: "lineSpacing",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
          renderHTML: (attrs: Record<string, string | null>) => attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
        },
      },
    }];
  },
  addCommands(): any {
    return {
      setLineSpacing: (val: string) => ({ tr, state, dispatch }: any) => {
        const { from, to } = state.selection;
        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: val });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },
});

const Indent = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (el: HTMLElement) => {
            const ml = el.style.marginLeft;
            return ml ? parseInt(ml, 10) / 24 : 0;
          },
          renderHTML: (attrs: Record<string, any>) => attrs.indent > 0 ? { style: `margin-left: ${attrs.indent * 24}px` } : {},
        },
      },
    }];
  },
  addCommands(): any {
    return {
      indent: () => ({ tr, state, dispatch }: any) => {
        const { from, to } = state.selection;
        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            const cur = node.attrs.indent || 0;
            if (cur < 10) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: cur + 1 });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      outdent: () => ({ tr, state, dispatch }: any) => {
        const { from, to } = state.selection;
        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            const cur = node.attrs.indent || 0;
            if (cur > 0) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: cur - 1 });
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },
});

const BackgroundColor = Mark.create({
  name: "backgroundColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.backgroundColor || null,
        renderHTML: (attrs: Record<string, string | null>) => {
          if (!attrs.color) return {};
          return { style: `background-color: ${attrs.color}; padding: 2px 0;` };
        },
      },
    };
  },
  parseHTML() { return [{ tag: "span[data-bg-color]" }]; },
  renderHTML({ HTMLAttributes }: any) { return ["span", mergeAttributes({ "data-bg-color": "" }, HTMLAttributes), 0]; },
  addCommands(): any {
    return {
      setBackgroundColor: (color: string) => ({ commands }: any) => commands.setMark(this.name, { color }),
      unsetBackgroundColor: () => ({ commands }: any) => commands.unsetMark(this.name),
    };
  },
});

// Resizable Image with alignment and sizing
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.width || el.getAttribute("width") || null,
        renderHTML: (attrs: Record<string, any>) => attrs.width ? { style: `width: ${attrs.width}` } : {},
      },
      alignment: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") || null,
        renderHTML: (attrs: Record<string, any>) => attrs.alignment ? { "data-align": attrs.alignment } : {},
      },
    };
  },
});

// List style types for bullet and ordered lists
const ListStyles = Extension.create({
  name: "listStyles",
  addGlobalAttributes() {
    return [{
      types: ["bulletList", "orderedList"],
      attributes: {
        listStyleType: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.listStyleType || null,
          renderHTML: (attrs: Record<string, any>) => attrs.listStyleType ? { style: `list-style-type: ${attrs.listStyleType}` } : {},
        },
      },
    }];
  },
  addCommands(): any {
    return {
      setListStyleType: (type: string) => ({ tr, state, dispatch }: any) => {
        const { $from } = state.selection;
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name === "bulletList" || node.type.name === "orderedList") {
            const pos = $from.before(depth);
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, listStyleType: type });
            if (dispatch) dispatch(tr);
            return true;
          }
        }
        return false;
      },
    };
  },
});

// Extended TableCell with text alignment
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.textAlign || null,
        renderHTML: (attrs: Record<string, any>) => attrs.textAlign ? { style: `text-align: ${attrs.textAlign}` } : {},
      },
    };
  },
});

// Extended TableHeader with text alignment
const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.textAlign || null,
        renderHTML: (attrs: Record<string, any>) => attrs.textAlign ? { style: `text-align: ${attrs.textAlign}` } : {},
      },
    };
  },
});

// === Constants ===

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial" },
  { label: "Courier New", value: "Courier New" },
  { label: "Georgia", value: "Georgia" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Inter", value: "Inter" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Verdana", value: "Verdana" },
];

const FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "Normal", value: "14px" },
  { label: "Medium", value: "16px" },
  { label: "Large", value: "18px" },
  { label: "X-Large", value: "24px" },
  { label: "XX-Large", value: "32px" },
];

const HEADING_LEVELS = [
  { label: "Normal", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
  { label: "Heading 4", level: 4 },
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff",
  "#fed7aa", "#fce7f3", "#ccfbf1", "#f1f5f9", "#fef9c3",
  "#d1fae5", "#dbeafe", "#ede9fe", "#fce7f3", "#fff7ed",
];

const TEXT_COLORS = [
  "#000000", "#374151", "#6b7280", "#9ca3af", "#ffffff",
  "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d",
  "#16a34a", "#059669", "#0891b2", "#2563eb", "#4f46e5",
  "#7c3aed", "#9333ea", "#c026d3", "#db2777", "#e11d48",
];

const LINE_SPACING_OPTIONS = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "3.0", value: "3" },
];

const BORDER_STYLES = [
  { label: "None", value: "none" },
  { label: "Thin", value: "1px solid #d1d5db" },
  { label: "Medium", value: "2px solid #9ca3af" },
  { label: "Thick", value: "3px solid #6b7280" },
  { label: "Double", value: "3px double #6b7280" },
  { label: "Dashed", value: "2px dashed #9ca3af" },
  { label: "Dotted", value: "2px dotted #9ca3af" },
];

const BULLET_LIST_STYLES = [
  { label: "● Disc", value: "disc" },
  { label: "○ Circle", value: "circle" },
  { label: "■ Square", value: "square" },
];

const ORDERED_LIST_STYLES = [
  { label: "1, 2, 3", value: "decimal" },
  { label: "a, b, c", value: "lower-alpha" },
  { label: "A, B, C", value: "upper-alpha" },
  { label: "i, ii, iii", value: "lower-roman" },
  { label: "I, II, III", value: "upper-roman" },
];

// === Component ===

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  readOnly?: boolean;
  /** Show the extended toolbar (font family, font size, colors etc.) */
  enhanced?: boolean;
  /** Variables available for insertion */
  variables?: { label: string; value: string }[];
  onInsertVariable?: (variable: string) => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  minHeight = "150px",
  className,
  readOnly = false,
  enhanced = false,
  variables,
  onInsertVariable,
}: RichTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 });
  const [showHeadingDD, setShowHeadingDD] = useState(false);
  const [showFontDD, setShowFontDD] = useState(false);
  const [showFontSizeDD, setShowFontSizeDD] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showVariableDD, setShowVariableDD] = useState(false);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showLineSpacing, setShowLineSpacing] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [customTextColor, setCustomTextColor] = useState("#000000");
  const [customHighlightColor, setCustomHighlightColor] = useState("#fef08a");
  const [customBgColor, setCustomBgColor] = useState("#ffffff");
  const [showListStyleDD, setShowListStyleDD] = useState(false);
  const [showTextWrapDD, setShowTextWrapDD] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const variableRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);
  const lineSpacingRef = useRef<HTMLDivElement>(null);
  const imageDialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listStyleRef = useRef<HTMLDivElement>(null);
  const textWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tableRef.current && !tableRef.current.contains(t)) { setTablePickerOpen(false); setTableHover({ rows: 0, cols: 0 }); }
      if (headingRef.current && !headingRef.current.contains(t)) setShowHeadingDD(false);
      if (fontRef.current && !fontRef.current.contains(t)) setShowFontDD(false);
      if (fontSizeRef.current && !fontSizeRef.current.contains(t)) setShowFontSizeDD(false);
      if (colorRef.current && !colorRef.current.contains(t)) setShowColorPicker(false);
      if (highlightRef.current && !highlightRef.current.contains(t)) setShowHighlightPicker(false);
      if (variableRef.current && !variableRef.current.contains(t)) setShowVariableDD(false);
      if (bgColorRef.current && !bgColorRef.current.contains(t)) setShowBgColorPicker(false);
      if (lineSpacingRef.current && !lineSpacingRef.current.contains(t)) setShowLineSpacing(false);
      if (imageDialogRef.current && !imageDialogRef.current.contains(t)) setShowImageDialog(false);
      if (textWrapRef.current && !textWrapRef.current.contains(t)) setShowTextWrapDD(false);
      if (listStyleRef.current && !listStyleRef.current.contains(t)) setShowListStyleDD(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      HighlightMark.configure({ multicolor: true }),
      SubscriptMark,
      SuperscriptMark,
      BackgroundColor,
      LineSpacing,
      Indent,
      ListStyles,
      TextAlign.configure({ types: ["heading", "paragraph", "tableCell", "tableHeader"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true, handleWidth: 5 }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
    ],
    content: value || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    setShowImageDialog(true);
    setImageUrl("");
  }, []);

  const insertImageFromUrl = useCallback(() => {
    if (!editor || !imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setShowImageDialog(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  const handleImageFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      editor.chain().focus().setImage({ src: base64 }).run();
      setShowImageDialog(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [editor]);

  const insertTextBox = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      '<div style="border: 2px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 8px 0; background-color: #f9fafb;"><p>Text box content</p></div>'
    ).run();
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const isEmpty = (html: string) => !html || html === "<p></p>" || html.trim() === "";
    if (!editor.isFocused && value !== editor.getHTML()) {
      if (!(isEmpty(value) && isEmpty(editor.getHTML()))) {
        editor.commands.setContent(value || "");
      }
    }
  }, [value, editor]);

  const toggleHtmlSource = useCallback(() => {
    if (!editor) return;
    if (!showHtmlSource) { setHtmlSource(editor.getHTML()); } else { editor.commands.setContent(htmlSource); onChange(htmlSource); }
    setShowHtmlSource(!showHtmlSource);
  }, [editor, showHtmlSource, htmlSource, onChange]);

  const insertVariable = useCallback((v: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(v).run();
    onInsertVariable?.(v);
    setShowVariableDD(false);
  }, [editor, onInsertVariable]);

  if (!editor) return null;

  const curHeading = () => { for (let i = 1; i <= 4; i++) { if (editor.isActive("heading", { level: i })) return `Heading ${i}`; } return "Normal"; };
  const curFont = () => editor.getAttributes("textStyle")?.fontFamily || "Default";
  const curFontSize = () => { const fs = editor.getAttributes("textStyle")?.fontSize; if (!fs) return "Normal"; return FONT_SIZES.find(s => s.value === fs)?.label || fs; };

  const Separator = () => <div className="w-px h-6 bg-border mx-0.5 self-center" />;

  const DDBtn = ({ refEl, open, toggle, label }: { refEl: React.RefObject<HTMLDivElement | null>; open: boolean; toggle: () => void; label: string }) => (
    <div className="relative" ref={refEl}>
      <button type="button" className={cn("inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-muted whitespace-nowrap", open && "bg-accent text-accent-foreground")} onClick={toggle}>
        {label}<ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <div className={cn("border rounded-md bg-background", isFullscreen && "fixed inset-0 z-50 rounded-none border-0 flex flex-col overflow-auto", className)}>
      {!readOnly && !showHtmlSource && (
        <div className="flex flex-wrap gap-0.5 p-1 border-b bg-muted/30 items-center sticky top-0 z-20 backdrop-blur-sm rounded-t-md">
          {/* Heading dropdown */}
          <div className="relative" ref={headingRef}>
            <button type="button" className={cn("inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-muted whitespace-nowrap", showHeadingDD && "bg-accent text-accent-foreground")} onClick={() => setShowHeadingDD(!showHeadingDD)}>
              {curHeading()}<ChevronDown className="h-3 w-3" />
            </button>
            {showHeadingDD && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1 w-36 max-h-64 overflow-y-auto">
                {HEADING_LEVELS.map(h => (
                  <button key={h.level} type="button" className={cn("w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted", (h.level === 0 ? !editor.isActive("heading") : editor.isActive("heading", { level: h.level })) && "bg-accent font-medium")}
                    style={h.level > 0 ? { fontSize: `${22 - h.level * 2}px`, fontWeight: 600 } : undefined}
                    onClick={() => { h.level === 0 ? editor.chain().focus().setParagraph().run() : editor.chain().focus().toggleHeading({ level: h.level as 1|2|3|4 }).run(); setShowHeadingDD(false); }}>
                    {h.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font family (enhanced) */}
          {enhanced && (<>
            <Separator />
            <div className="relative" ref={fontRef}>
              <button type="button" className={cn("inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-muted whitespace-nowrap", showFontDD && "bg-accent text-accent-foreground")} onClick={() => setShowFontDD(!showFontDD)}>
                {curFont()}<ChevronDown className="h-3 w-3" />
              </button>
              {showFontDD && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1 w-48 max-h-64 overflow-y-auto">
                  {FONT_FAMILIES.map(f => (
                    <button key={f.value||"_"} type="button" className={cn("w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted", curFont()===(f.value||"Default") && "bg-accent font-medium")}
                      style={f.value ? { fontFamily: f.value } : undefined}
                      onClick={() => { f.value ? (editor.chain().focus() as any).setFontFamily(f.value).run() : (editor.chain().focus() as any).unsetFontFamily().run(); setShowFontDD(false); }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={fontSizeRef}>
              <button type="button" className={cn("inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-muted whitespace-nowrap", showFontSizeDD && "bg-accent text-accent-foreground")} onClick={() => setShowFontSizeDD(!showFontSizeDD)}>
                {curFontSize()}<ChevronDown className="h-3 w-3" />
              </button>
              {showFontSizeDD && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1 w-32 max-h-64 overflow-y-auto">
                  {FONT_SIZES.map(s => (
                    <button key={s.value} type="button" className={cn("w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted", curFontSize()===s.label && "bg-accent font-medium")}
                      style={{ fontSize: s.value }}
                      onClick={() => { (editor.chain().focus() as any).setFontSize(s.value).run(); setShowFontSizeDD(false); }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>)}

          <Separator />

          {/* Basic formatting */}
          <Toggle size="sm" pressed={editor.isActive("bold")} onPressedChange={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"><Bold className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive("italic")} onPressedChange={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"><Italic className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive("underline")} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline"><UnderlineIcon className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive("strike")} onPressedChange={() => editor.chain().focus().toggleStrike().run()} aria-label="Strikethrough"><Strikethrough className="h-4 w-4" /></Toggle>

          {enhanced && (<>
            <Toggle size="sm" pressed={editor.isActive("subscript")} onPressedChange={() => (editor.chain().focus() as any).toggleSubscript().run()} aria-label="Subscript"><Subscript className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={editor.isActive("superscript")} onPressedChange={() => (editor.chain().focus() as any).toggleSuperscript().run()} aria-label="Superscript"><Superscript className="h-4 w-4" /></Toggle>
          </>)}

          <Separator />

          {/* Text color */}
          <div className="relative" ref={colorRef}>
            <button type="button" className={cn("inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors hover:bg-muted", showColorPicker && "bg-accent")} onClick={() => setShowColorPicker(!showColorPicker)} title="Text color">
              <Type className="h-4 w-4" />
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full" style={{ backgroundColor: editor.getAttributes("textStyle")?.color || "#000" }} />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2 w-[200px]">
                <div className="text-xs font-medium mb-1.5 text-muted-foreground">Text Color</div>
                <div className="grid grid-cols-5 gap-1">
                  {TEXT_COLORS.map(c => <button key={c} type="button" className={cn("w-7 h-7 rounded border hover:scale-110 transition-transform", editor.getAttributes("textStyle")?.color === c && "ring-2 ring-primary ring-offset-1")} style={{ backgroundColor: c }} onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }} />)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                  <Pipette className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input type="color" value={customTextColor} onChange={e => setCustomTextColor(e.target.value)} className="w-7 h-7 rounded border cursor-pointer p-0" />
                  <input type="text" value={customTextColor} onChange={e => setCustomTextColor(e.target.value)} className="flex-1 h-7 px-1.5 text-xs border rounded bg-background font-mono" placeholder="#000000" />
                  <button type="button" className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { editor.chain().focus().setColor(customTextColor).run(); setShowColorPicker(false); }}>Apply</button>
                </div>
                <button type="button" className="w-full text-xs mt-1.5 px-2 py-1 rounded hover:bg-muted text-muted-foreground" onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}>Remove color</button>
              </div>
            )}
          </div>

          {/* Highlight */}
          <div className="relative" ref={highlightRef}>
            <button type="button" className={cn("inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors hover:bg-muted", (editor.isActive("highlight") || showHighlightPicker) && "bg-accent")} onClick={() => setShowHighlightPicker(!showHighlightPicker)} title="Highlight">
              <Highlighter className="h-4 w-4" />
            </button>
            {showHighlightPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2 w-[200px]">
                <div className="text-xs font-medium mb-1.5 text-muted-foreground">Highlight</div>
                <div className="grid grid-cols-5 gap-1">
                  {HIGHLIGHT_COLORS.map(c => <button key={c} type="button" className="w-7 h-7 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => { (editor.chain().focus() as any).toggleHighlight({ color: c }).run(); setShowHighlightPicker(false); }} />)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                  <input type="color" value={customHighlightColor} onChange={e => setCustomHighlightColor(e.target.value)} className="w-7 h-7 rounded border cursor-pointer p-0" />
                  <input type="text" value={customHighlightColor} onChange={e => setCustomHighlightColor(e.target.value)} className="flex-1 h-7 px-1.5 text-xs border rounded bg-background font-mono" placeholder="#fef08a" />
                  <button type="button" className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { (editor.chain().focus() as any).toggleHighlight({ color: customHighlightColor }).run(); setShowHighlightPicker(false); }}>Apply</button>
                </div>
                <button type="button" className="w-full text-xs mt-1.5 px-2 py-1 rounded hover:bg-muted text-muted-foreground" onClick={() => { (editor.chain().focus() as any).unsetHighlight().run(); setShowHighlightPicker(false); }}>Remove highlight</button>
              </div>
            )}
          </div>

          {/* Background / Shading Color */}
          {enhanced && (
            <div className="relative" ref={bgColorRef}>
              <button type="button" className={cn("inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors hover:bg-muted", showBgColorPicker && "bg-accent")} onClick={() => setShowBgColorPicker(!showBgColorPicker)} title="Background / Shading">
                <PaintBucket className="h-4 w-4" />
              </button>
              {showBgColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2 w-[200px]">
                  <div className="text-xs font-medium mb-1.5 text-muted-foreground">Background / Shading</div>
                  <div className="grid grid-cols-5 gap-1">
                    {HIGHLIGHT_COLORS.map(c => <button key={c} type="button" className="w-7 h-7 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => { (editor.chain().focus() as any).setBackgroundColor(c).run(); setShowBgColorPicker(false); }} />)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                    <input type="color" value={customBgColor} onChange={e => setCustomBgColor(e.target.value)} className="w-7 h-7 rounded border cursor-pointer p-0" />
                    <input type="text" value={customBgColor} onChange={e => setCustomBgColor(e.target.value)} className="flex-1 h-7 px-1.5 text-xs border rounded bg-background font-mono" placeholder="#ffffff" />
                    <button type="button" className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { (editor.chain().focus() as any).setBackgroundColor(customBgColor).run(); setShowBgColorPicker(false); }}>Apply</button>
                  </div>
                  <button type="button" className="w-full text-xs mt-1.5 px-2 py-1 rounded hover:bg-muted text-muted-foreground" onClick={() => { (editor.chain().focus() as any).unsetBackgroundColor().run(); setShowBgColorPicker(false); }}>Remove shading</button>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Link & Image */}
          <Toggle size="sm" pressed={editor.isActive("link")} onPressedChange={setLink} aria-label="Link"><LinkIcon className="h-4 w-4" /></Toggle>
          <div className="relative" ref={imageDialogRef}>
            <Toggle size="sm" pressed={showImageDialog} onPressedChange={addImage} aria-label="Image"><ImageIcon className="h-4 w-4" /></Toggle>
            {showImageDialog && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-3 w-72">
                <div className="text-xs font-medium mb-2 text-muted-foreground">Insert Image</div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">From URL</label>
                    <div className="flex gap-1.5">
                      <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="flex-1 h-8 px-2 text-xs border rounded bg-background" onKeyDown={e => { if (e.key === "Enter") insertImageFromUrl(); }} />
                      <button type="button" className="h-8 px-3 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90" onClick={insertImageFromUrl}>Insert</button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-popover px-2 text-muted-foreground">or</span></div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Upload from device</label>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                    <button type="button" className="w-full h-8 px-3 text-xs rounded border border-dashed hover:bg-muted flex items-center justify-center gap-1.5 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" />Upload image (max 5MB)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Alignment */}
          <Toggle size="sm" pressed={editor.isActive({ textAlign: "left" })} onPressedChange={() => editor.chain().focus().setTextAlign("left").run()} aria-label="Align left"><AlignLeft className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: "center" })} onPressedChange={() => editor.chain().focus().setTextAlign("center").run()} aria-label="Align center"><AlignCenter className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: "right" })} onPressedChange={() => editor.chain().focus().setTextAlign("right").run()} aria-label="Align right"><AlignRight className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: "justify" })} onPressedChange={() => editor.chain().focus().setTextAlign("justify").run()} aria-label="Align justify"><AlignJustify className="h-4 w-4" /></Toggle>

          {/* Indent / Outdent */}
          {enhanced && (<>
            <Toggle size="sm" pressed={false} onPressedChange={() => (editor.chain().focus() as any).indent().run()} aria-label="Increase indent" title="Increase indent"><IndentIncrease className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => (editor.chain().focus() as any).outdent().run()} aria-label="Decrease indent" title="Decrease indent"><IndentDecrease className="h-4 w-4" /></Toggle>
          </>)}

          {/* Line Spacing */}
          {enhanced && (
            <div className="relative" ref={lineSpacingRef}>
              <button type="button" className={cn("inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors hover:bg-muted", showLineSpacing && "bg-accent")} onClick={() => setShowLineSpacing(!showLineSpacing)} title="Line spacing">
                <LineChart className="h-4 w-4" />
              </button>
              {showLineSpacing && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1 w-32">
                  <div className="text-xs font-medium px-2 py-1 text-muted-foreground border-b mb-1">Line Spacing</div>
                  {LINE_SPACING_OPTIONS.map(ls => (
                    <button key={ls.value} type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted" onClick={() => { (editor.chain().focus() as any).setLineSpacing(ls.value).run(); setShowLineSpacing(false); }}>
                      {ls.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text Wrapping */}
          {enhanced && (
            <div className="relative" ref={textWrapRef}>
              <button type="button" className={cn("inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors hover:bg-muted", showTextWrapDD && "bg-accent")} onClick={() => setShowTextWrapDD(!showTextWrapDD)} title="Text wrapping">
                <WrapText className="h-4 w-4" />
              </button>
              {showTextWrapDD && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1 w-44">
                  <div className="text-xs font-medium px-2 py-1 text-muted-foreground border-b mb-1">Text Wrapping</div>
                  {[
                    { label: "Normal", value: "normal" },
                    { label: "No Wrap", value: "nowrap" },
                    { label: "Pre (preserve)", value: "pre" },
                    { label: "Pre Wrap", value: "pre-wrap" },
                    { label: "Break Word", value: "break-word" },
                  ].map(opt => (
                    <button key={opt.value} type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted" onClick={() => {
                      if (opt.value === "break-word") {
                        editor.chain().focus().insertContent(`<span style="word-break: break-all; overflow-wrap: break-word;">\u200B</span>`).run();
                      } else {
                        editor.chain().focus().insertContent(`<div style="white-space: ${opt.value};">\u200B</div>`).run();
                      }
                      setShowTextWrapDD(false);
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* HR, Lists, Blockquote */}
          <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Horizontal rule"><Minus className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive("bulletList")} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list"><List className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive("orderedList")} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Ordered list"><ListOrdered className="h-4 w-4" /></Toggle>
          <Toggle size="sm" pressed={editor.isActive("blockquote")} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Blockquote"><Quote className="h-4 w-4" /></Toggle>

          {/* List Style Dropdown */}
          {(editor.isActive("bulletList") || editor.isActive("orderedList")) && (
            <div className="relative" ref={listStyleRef}>
              <button type="button" className={cn("inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-muted whitespace-nowrap", showListStyleDD && "bg-accent text-accent-foreground")} onClick={() => setShowListStyleDD(!showListStyleDD)} title="List style">
                Style<ChevronDown className="h-3 w-3" />
              </button>
              {showListStyleDD && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1 w-36 max-h-64 overflow-y-auto">
                  <div className="text-xs font-medium px-2 py-1 text-muted-foreground border-b mb-1">{editor.isActive("bulletList") ? "Bullet Style" : "Number Style"}</div>
                  {(editor.isActive("bulletList") ? BULLET_LIST_STYLES : ORDERED_LIST_STYLES).map(s => (
                    <button key={s.value} type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted" onClick={() => { (editor.chain().focus() as any).setListStyleType(s.value).run(); setShowListStyleDD(false); }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text Box */}
          {enhanced && (
            <Toggle size="sm" pressed={false} onPressedChange={insertTextBox} aria-label="Text box" title="Insert text box"><Square className="h-4 w-4" /></Toggle>
          )}

          <Separator />

          {/* Table picker */}
          <div className="relative" ref={tableRef}>
            <button type="button" className={cn("inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors hover:bg-muted", (editor.isActive("table") || tablePickerOpen) && "bg-accent")} onClick={() => setTablePickerOpen(!tablePickerOpen)} aria-label="Insert table">
              <TableIcon className="h-4 w-4" />
            </button>
            {tablePickerOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-3">
                <div className="text-xs font-medium mb-2 text-muted-foreground">{tableHover.rows > 0 ? `${tableHover.rows} × ${tableHover.cols} Table` : "Select table size"}</div>
                <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(8, 1fr)` }}>
                  {Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => (
                    <button key={`${row}-${col}`} type="button" title={`${row+1} × ${col+1}`}
                      className={cn("w-4 h-4 border rounded-[2px] transition-colors", row < tableHover.rows && col < tableHover.cols ? "bg-primary border-primary" : "bg-muted/40 border-border hover:border-primary/50")}
                      onMouseEnter={() => setTableHover({ rows: row+1, cols: col+1 })}
                      onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
                      onClick={() => { editor.chain().focus().insertTable({ rows: row+1, cols: col+1, withHeaderRow: true }).run(); setTablePickerOpen(false); setTableHover({ rows: 0, cols: 0 }); }} />
                  )))}
                </div>
              </div>
            )}
          </div>

          {/* Table operations */}
          {editor.isActive("table") && (<>
            <Separator />
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().addRowBefore().run()} aria-label="Add row above" title="Add row above"><Rows3 className="h-4 w-4" /><Plus className="h-2.5 w-2.5 -ml-1 -mt-2" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().addRowAfter().run()} aria-label="Add row below" title="Add row below"><Rows3 className="h-4 w-4" /><Plus className="h-2.5 w-2.5 -ml-1 mt-2" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().deleteRow().run()} aria-label="Delete row" title="Delete row"><Rows3 className="h-4 w-4 text-destructive" /><Minus className="h-2.5 w-2.5 -ml-1 text-destructive" /></Toggle>
            <Separator />
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().addColumnBefore().run()} aria-label="Add column before" title="Add column before"><Columns3 className="h-4 w-4" /><Plus className="h-2.5 w-2.5 -ml-1 -mt-2" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().addColumnAfter().run()} aria-label="Add column after" title="Add column after"><Columns3 className="h-4 w-4" /><Plus className="h-2.5 w-2.5 -ml-1 mt-2" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().deleteColumn().run()} aria-label="Delete column" title="Delete column"><Columns3 className="h-4 w-4 text-destructive" /><Minus className="h-2.5 w-2.5 -ml-1 text-destructive" /></Toggle>
            <Separator />
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().mergeCells().run()} aria-label="Merge cells" title="Merge cells"><MergeIcon className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().splitCell().run()} aria-label="Split cell" title="Split cell"><SplitIcon className="h-4 w-4" /></Toggle>
            <Separator />
            <span className="text-[10px] text-muted-foreground px-0.5">Cell:</span>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().setCellAttribute('textAlign', 'left').run()} aria-label="Cell align left" title="Cell align left"><AlignLeft className="h-3.5 w-3.5" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().setCellAttribute('textAlign', 'center').run()} aria-label="Cell align center" title="Cell align center"><AlignCenter className="h-3.5 w-3.5" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().setCellAttribute('textAlign', 'right').run()} aria-label="Cell align right" title="Cell align right"><AlignRight className="h-3.5 w-3.5" /></Toggle>
            <Separator />
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().deleteTable().run()} aria-label="Delete table" title="Delete table"><Trash2 className="h-4 w-4 text-destructive" /></Toggle>
          </>)}

          {/* Image editing toolbar */}
          {editor.isActive("image") && (<>
            <Separator />
            <span className="text-[10px] text-muted-foreground px-0.5">Align:</span>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().updateAttributes('image', { alignment: 'left' }).run()} title="Image left"><AlignLeft className="h-3.5 w-3.5" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().updateAttributes('image', { alignment: 'center' }).run()} title="Image center"><AlignCenter className="h-3.5 w-3.5" /></Toggle>
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().updateAttributes('image', { alignment: 'right' }).run()} title="Image right"><AlignRight className="h-3.5 w-3.5" /></Toggle>
            <Separator />
            <span className="text-[10px] text-muted-foreground px-0.5">Size:</span>
            {["25%","50%","75%","100%"].map(w => (
              <button key={w} type="button" className="h-7 px-1.5 text-[10px] rounded hover:bg-muted border" onClick={() => editor.chain().focus().updateAttributes('image', { width: w }).run()} title={`Set width ${w}`}>{w}</button>
            ))}
            <button type="button" className="h-7 px-1.5 text-[10px] rounded hover:bg-muted border" onClick={() => editor.chain().focus().updateAttributes('image', { width: null }).run()} title="Auto size">Auto</button>
            <Separator />
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().deleteSelection().run()} aria-label="Delete image" title="Delete image"><Trash2 className="h-4 w-4 text-destructive" /></Toggle>
          </>)}

          <Separator />

          {/* Code / HTML source */}
          <Toggle size="sm" pressed={showHtmlSource} onPressedChange={toggleHtmlSource} aria-label="HTML source"><Code className="h-4 w-4" /></Toggle>

          {/* Variable picker */}
          {variables && variables.length > 0 && (<>
            <Separator />
            <div className="relative" ref={variableRef}>
              <button type="button" className={cn("inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-muted border border-dashed", showVariableDD && "bg-accent")} onClick={() => setShowVariableDD(!showVariableDD)} title="Insert variable">
                <Palette className="h-3.5 w-3.5" />Variables<ChevronDown className="h-3 w-3" />
              </button>
              {showVariableDD && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1 max-h-64 overflow-y-auto w-56">
                  <div className="text-xs font-medium px-2 py-1 text-muted-foreground border-b mb-1">Click to insert</div>
                  {variables.map(v => (
                    <button key={v.value} type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex items-center justify-between" onClick={() => insertVariable(v.value)}>
                      <span className="truncate">{v.label}</span>
                      <code className="text-[10px] text-muted-foreground ml-1 shrink-0">{v.value}</code>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>)}

          <div className="ml-auto">
            <Toggle size="sm" pressed={isFullscreen} onPressedChange={() => setIsFullscreen(!isFullscreen)} aria-label="Fullscreen"><Maximize className="h-4 w-4" /></Toggle>
          </div>
        </div>
      )}

      <style>{`
        .rich-text-editor-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        .rich-text-editor-content table td, .rich-text-editor-content table th { border: 1px solid #d1d5db; padding: 6px 10px; min-width: 60px; vertical-align: top; }
        .rich-text-editor-content table th { background-color: #f3f4f6; font-weight: 600; }
        .rich-text-editor-content table .selectedCell { background-color: #dbeafe; }
        .rich-text-editor-content .column-resize-handle { background-color: #3b82f6; width: 2px; position: absolute; right: -1px; top: 0; bottom: 0; pointer-events: none; }
        .rich-text-editor-content .tableWrapper { overflow-x: auto; }
        .rich-text-editor-content blockquote { border-left: 3px solid #d1d5db; padding-left: 12px; margin-left: 0; color: #6b7280; font-style: italic; }
        .rich-text-editor-content mark { border-radius: 2px; padding: 1px 2px; }
        .rich-text-editor-content h1 { font-size: 2em; font-weight: 700; }
        .rich-text-editor-content h2 { font-size: 1.5em; font-weight: 600; }
        .rich-text-editor-content h3 { font-size: 1.17em; font-weight: 600; }
        .rich-text-editor-content h4 { font-size: 1em; font-weight: 600; }
        .rich-text-editor-content img { max-width: 100%; height: auto; border-radius: 4px; cursor: pointer; transition: width 0.2s ease; }
        .rich-text-editor-content img.ProseMirror-selectednode { outline: 2px solid #3b82f6; border-radius: 4px; }
        .rich-text-editor-content img[data-align="left"] { float: left; margin-right: 12px; margin-bottom: 8px; }
        .rich-text-editor-content img[data-align="center"] { display: block; margin-left: auto; margin-right: auto; float: none; }
        .rich-text-editor-content img[data-align="right"] { float: right; margin-left: 12px; margin-bottom: 8px; }
        .rich-text-editor-content .column-resize-handle { background-color: #3b82f6; width: 4px; position: absolute; right: -2px; top: 0; bottom: 0; pointer-events: none; cursor: col-resize; }
        .rich-text-editor-content .resize-cursor { cursor: col-resize; }
        .rich-text-editor-content ul[style*="list-style-type"] { padding-left: 20px; }
        .rich-text-editor-content ol[style*="list-style-type"] { padding-left: 20px; }
        .rich-text-editor-content p[style*="margin-left"] { transition: margin-left 0.15s ease; }
      `}</style>

      {showHtmlSource ? (
        <textarea className="w-full p-3 font-mono text-sm bg-muted/20 resize-none focus:outline-none" style={{ minHeight: isFullscreen ? "calc(100vh - 50px)" : minHeight }} value={htmlSource} onChange={e => setHtmlSource(e.target.value)} />
      ) : (
        <EditorContent editor={editor} style={{ minHeight: isFullscreen ? "calc(100vh - 50px)" : minHeight }} className="rich-text-editor-content" />
      )}
    </div>
  );
}

/** Renders stored HTML as read-only rich text */
export function RichTextDisplay({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html || html === "<p></p>") return null;
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground",
        "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5 [&_p]:my-1",
        "[&_table]:border-collapse [&_table]:w-full [&_table]:my-2",
        "[&_td]:border [&_td]:border-gray-300 [&_td]:px-2.5 [&_td]:py-1.5",
        "[&_th]:border [&_th]:border-gray-300 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:bg-gray-100 [&_th]:font-semibold",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
