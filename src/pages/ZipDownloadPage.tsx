import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  FileArchive,
  Loader2,
  Share2,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { GradientText } from "@/components/magicui/gradient-text";
import { formatBytes } from "@/lib/utils";

interface ZipMeta {
  id: string;
  title: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  description?: string;
  downloadUrl: string;
}

export function ZipDownloadPage() {
  const { id = "" } = useParams();
  const [meta, setMeta] = useState<ZipMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID tidak valid.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/zips/${encodeURIComponent(id)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error?.message || `Tidak ditemukan (${res.status})`);
        }
        if (!cancelled) {
          setMeta({
            id: json.id,
            title: json.title,
            originalName: json.originalName,
            size: json.size,
            uploadedAt: json.uploadedAt,
            description: json.description,
            downloadUrl:
              json.downloadUrl ||
              `${API_BASE_URL}/zips/${encodeURIComponent(id)}/download`,
          });
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Gagal memuat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dateLabel = meta?.uploadedAt
    ? new Date(meta.uploadedAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

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
          Editor
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <img src="/logo.svg" alt="" className="h-4 w-4" />
          Cursor<GradientText>Go</GradientText>
        </div>
        <Link
          to="/upload-zip"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Upload ZIP
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat…
          </div>
        )}

        {!loading && error && (
          <div className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="font-medium text-destructive">File tidak tersedia</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link to="/upload-zip">Upload ZIP baru</Link>
            </Button>
          </div>
        )}

        {!loading && meta && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-5 rounded-2xl border border-border bg-card/70 p-6 text-center shadow-xl backdrop-blur"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-primary/30">
              <FileArchive className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">{meta.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {meta.originalName} · {formatBytes(meta.size)}
              </p>
              {dateLabel && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Diunggah {dateLabel}
                </p>
              )}
            </div>

            {meta.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {meta.description}
              </p>
            ) : null}

            <Button asChild size="lg" className="w-full">
              <a href={meta.downloadUrl}>
                <Download className="h-4 w-4" />
                Download ZIP
              </a>
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Share2 className="h-3 w-3" />
              Tidak perlu login — link publik
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
