import { useState } from "react";
import { Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { AiSettings } from "@/lib/types";
import { AI_MODELS, CURSOR_PROXY_URL } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AiSettings;
  onSave: (s: AiSettings) => void;
}

export function SettingsDialog({ open, onOpenChange, settings, onSave }: Props) {
  const [draft, setDraft] = useState<AiSettings>(settings);
  const [showKey, setShowKey] = useState(false);

  const update = (patch: Partial<AiSettings>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const selectProvider = (provider: AiSettings["provider"]) => {
    if (provider === "cursor") {
      update({ provider, baseUrl: CURSOR_PROXY_URL });
    } else if (provider === "openai") {
      update({ provider, baseUrl: "https://api.openai.com/v1" });
    } else {
      update({ provider });
    }
  };

  const useRealApi = draft.provider !== "demo";

  const handleSave = () => {
    onSave({
      ...draft,
      provider: draft.apiKey ? (draft.provider === "demo" ? "cursor" : draft.provider) : "demo",
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(settings);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pengaturan AI Agent
          </DialogTitle>
          <DialogDescription>
            Default memakai <strong>Cursor</strong> (via backend proxy lokal). API key
            disimpan di browser (localStorage) & hanya diteruskan ke backend lokal kamu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">Gunakan API sungguhan</div>
              <div className="text-xs text-muted-foreground">
                Nonaktif = Demo Mode (offline, tanpa key)
              </div>
            </div>
            <Switch
              checked={useRealApi}
              onCheckedChange={(c) =>
                c ? selectProvider("cursor") : update({ provider: "demo" })
              }
            />
          </div>

          <div className={cn("space-y-4", !useRealApi && "pointer-events-none opacity-50")}>
            <Field label="Provider">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "cursor", label: "Cursor" },
                    { id: "openai", label: "OpenAI" },
                    { id: "custom", label: "Custom" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProvider(p.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      draft.provider === p.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {p.label}
                    {p.id === "cursor" && (
                      <span className="ml-1 text-[10px] text-primary">★</span>
                    )}
                  </button>
                ))}
              </div>
            </Field>

            {draft.provider === "cursor" && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Langkah pakai Cursor:</p>
                <ol className="list-decimal space-y-0.5 pl-4">
                  <li>
                    Jalankan backend:{" "}
                    <code className="rounded bg-muted px-1 text-primary">npm run server</code>
                  </li>
                  <li>
                    Ambil API key di{" "}
                    <a
                      href="https://cursor.com/dashboard/integrations"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      cursor.com/dashboard/integrations
                    </a>
                  </li>
                  <li>Tempel key di bawah, pilih model, lalu Simpan.</li>
                </ol>
              </div>
            )}

            <Field label="Base URL">
              <input
                value={draft.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                placeholder={CURSOR_PROXY_URL}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </Field>

            <Field label={draft.provider === "cursor" ? "Cursor API Key" : "API Key"}>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showKey ? "text" : "password"}
                  value={draft.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value })}
                  placeholder={draft.provider === "cursor" ? "key_..." : "sk-..."}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pl-9 pr-10 text-sm outline-none focus:border-primary/60"
                />
                <button
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="Model default">
              <select
                value={draft.model}
                onChange={(e) => update({ model: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave}>Simpan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
