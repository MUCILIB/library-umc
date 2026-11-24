import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  RemoveFormatting,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  onUploadImage?: (file: File) => Promise<string>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Tulis isi artikel berita di sini...",
  minHeight = "320px",
  className,
  onUploadImage,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const isInternalUpdate = useRef(false);

  // Hitung jumlah kata dan karakter
  const updateCounts = useCallback((text: string) => {
    const cleanText = text.replace(/\s+/g, " ").trim();
    const words = cleanText ? cleanText.split(" ").length : 0;
    setWordCount(words);
    setCharCount(cleanText.length);
  }, []);

  // Sinkronisasi value prop ke editor DOM
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
        const text = editorRef.current.textContent || editorRef.current.innerText || "";
        updateCounts(text);
      }
    }
    isInternalUpdate.current = false;
  }, [value, updateCounts]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
      const text = editorRef.current.textContent || editorRef.current.innerText || "";
      updateCounts(text);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleLink = () => {
    const url = prompt("Masukkan tautan URL (misal: https://umc.ac.id):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handleImagePrompt = () => {
    if (onUploadImage && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      const url = prompt("Masukkan URL Gambar (misal: https://...):");
      if (url) {
        executeCommand("insertImage", url);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;

    try {
      setIsUploading(true);
      const imageUrl = await onUploadImage(file);
      if (imageUrl) {
        executeCommand("insertImage", imageUrl);
      }
    } catch (err: any) {
      alert("Gagal mengunggah gambar: " + (err?.message || "Kesalahan server"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col border border-border rounded-xl overflow-hidden bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm",
        className
      )}
    >
      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Toolbar Word-Style */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/60 border-b border-border select-none">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/80">
          <button
            type="button"
            title="Batalkan (Undo)"
            onClick={() => executeCommand("undo")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Ulangi (Redo)"
            onClick={() => executeCommand("redo")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/80">
          <button
            type="button"
            title="Judul Utama (H1)"
            onClick={() => executeCommand("formatBlock", "<h1>")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Sub Judul (H2)"
            onClick={() => executeCommand("formatBlock", "<h2>")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Bagian Kecil (H3)"
            onClick={() => executeCommand("formatBlock", "<h3>")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        {/* Font Formats */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/80">
          <button
            type="button"
            title="Tebal (Bold)"
            onClick={() => executeCommand("bold")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors font-bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Miring (Italic)"
            onClick={() => executeCommand("italic")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Garis Bawah (Underline)"
            onClick={() => executeCommand("underline")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Coret (Strikethrough)"
            onClick={() => executeCommand("strikeThrough")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/80">
          <button
            type="button"
            title="Rata Kiri"
            onClick={() => executeCommand("justifyLeft")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Rata Tengah"
            onClick={() => executeCommand("justifyCenter")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Rata Kanan"
            onClick={() => executeCommand("justifyRight")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Rata Kiri-Kanan (Justify)"
            onClick={() => executeCommand("justifyFull")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/80">
          <button
            type="button"
            title="Daftar Poin"
            onClick={() => executeCommand("insertUnorderedList")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Daftar Nomor"
            onClick={() => executeCommand("insertOrderedList")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Kutipan (Quote)"
            onClick={() => executeCommand("formatBlock", "<blockquote>")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Media & Links */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/80">
          <button
            type="button"
            title="Sisipkan Tautan"
            onClick={handleLink}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Sisipkan Gambar"
            disabled={isUploading}
            onClick={handleImagePrompt}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <ImageIcon className="w-4 h-4" />
            {isUploading && <span className="text-xs">Mengunggah...</span>}
          </button>
        </div>

        {/* Clear formatting */}
        <div className="flex items-center gap-0.5 pl-1.5">
          <button
            type="button"
            title="Hapus Format Teks"
            onClick={() => executeCommand("removeFormat")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Area Teks Konten */}
      <div
        ref={editorRef}
        role="textbox"
        contentEditable
        onInput={handleInput}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className={cn(
          "w-full p-4 sm:p-5 outline-none overflow-y-auto text-foreground text-sm sm:text-base leading-relaxed",
          "prose prose-slate dark:prose-invert max-w-none",
          "focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60 empty:before:pointer-events-none"
        )}
      />

      {/* Status Bar: Penghitung Kata & Karakter */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-t border-border/60 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-3">
          <span>{wordCount} kata</span>
          <span className="text-border">|</span>
          <span>{charCount} karakter</span>
        </div>
        <div className="text-[11px] text-muted-foreground/80 hidden sm:block">
          Editor Teks Terstruktur - UPT Perpustakaan UMC
        </div>
      </div>
    </div>
  );
};
