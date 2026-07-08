import { Check, ChevronDown, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AI_MODELS } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const current = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {current.label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Pilih Model</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {AI_MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onSelect={() => onChange(model.id)}
            className="flex-col items-start gap-0.5"
          >
            <div className="flex w-full items-center gap-2">
              <span className="font-medium">{model.label}</span>
              {model.badge && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {model.badge}
                </span>
              )}
              <Check
                className={cn(
                  "ml-auto h-4 w-4 text-primary",
                  value === model.id ? "opacity-100" : "opacity-0"
                )}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {model.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
