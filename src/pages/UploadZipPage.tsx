import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  FileArchive,
  Loader2,
  Share2,
  UploadCloud,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/magicui/border-beam";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { GradientText } from "@/components/magicui/gradient-text";
import { cn, formatBytes } from "@/lib/utils";

interface UploadResult {
  id: string;
  title: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  shareUrl: string;
  downloadUrl: string;
  description?: string;
}

const MAX_MB = 80;

export function UploadZipPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);

  const pickFile = useCallback((f: File | null) => {
    setError(null);
    setResult(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".zip")) {
      setError("Hanya file .zip yang diizinkan.");
      setFile(null);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Maksimal ${MAX_MB} MB.`);
      setFile(null);
      return;
    }
    setFile(f);
    if (!title.trim()) {
      setTitle(f.name.replace(/\.zip$/i, ""));
    }
  }, [title]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    pickFile(f);
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      if (title.trim()) body.append("title", title.trim());
      if (description.trim()) body.append("description", description.trim());

      const res = await fetch(`${API_BASE_URL}/upload-zip`, {
        method: "POST",
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || `Upload gagal (${res.status})`);
      }

      // Prefer frontend share URL based on current origin when backend
      // couldn't infer PUBLIC_FRONTEND_URL.
      const shareUrl =
        json.shareUrl?.includes("/zip/") && !json.shareUrl.includes(API_BASE_URL)
          ? json.shareUrl
          : `${window.location.origin}/zip/${json.id}`;

      setResult({
        id: json.id,
        title: json.title,
        originalName: json.originalName,
        size: json.size,
        uploadedAt: json.uploadedAt,
        shareUrl,
        downloadUrl: json.downloadUrl,
        description: json.description,
      });
    } catch (e) {
      setError((e as Error).message || "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const copyShare = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <DotPattern className="opacity-40 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]" />
      <div className="absolute left-1/2 top-0 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between border-b border-border bg-sidebar/80 px-4 py-3 backdrop-blur">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Editor
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <img src="/logo.svg" alt="" className="h-4 w-4" />
          Cursor<GradientText>Go</GradientText>
          <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            /upload-zip
          </span>
        </div>
        <div className="w-28" />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Share project <GradientText>Go</GradientText> via ZIP
          </motion.h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload ZIP proyek Golang, lalu bagikan link. Penerima bisa download
            tanpa login.
          </p>
        </div>

        {!result ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-2xl border border-border bg-card/70 p-5 shadow-xl backdrop-blur"
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 transition-colors",
                dragOver
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent/40"
              )}
            >
              <div className="relative rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg shadow-primary/30">
                <UploadCloud className="h-7 w-7" />
                <BorderBeam size={60} duration={8} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {file ? file.name : "Drop ZIP di sini, atau klik untuk pilih"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {file
                    ? formatBytes(file.size)
                    : `Maks ${MAX_MB} MB · hanya .zip`}
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Judul (opsional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="my-golang-api"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Deskripsi singkat (opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="REST API Go + chi router…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!file || uploading}
              onClick={() => void upload()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengunggah…
                </>
              ) : (
                <>
                  <FileArchive className="h-4 w-4" />
                  Upload & buat link
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 rounded-2xl border border-border bg-card/70 p-5 shadow-xl backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-400">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Upload berhasil</h2>
                <p className="text-sm text-muted-foreground">
                  {result.title} · {formatBytes(result.size)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Link share (tanpa login)
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={result.shareUrl}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none"
                />
                <Button variant="secondary" onClick={() => void copyShare()}>
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={result.shareUrl}>
                  <Share2 className="h-4 w-4" />
                  Buka halaman share
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={result.downloadUrl}>
                  <FileArchive className="h-4 w-4" />
                  Download langsung
                </a>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setTitle("");
                  setDescription("");
                }}
              >
                Upload lagi
              </Button>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Siapa pun dengan link bisa mengunduh. Tidak perlu akun. File
              disimpan di backend CursorGo
              {import.meta.env.PROD
                ? " (di Render, storage bisa hilang saat redeploy free tier)."
                : "."}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
