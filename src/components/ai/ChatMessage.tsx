import { motion } from "framer-motion";
import { FileText, Sparkles, User } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { ChatMarkdown } from "./ChatMarkdown";
import { cn } from "@/lib/utils";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3 px-3 py-3"
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold">
            {isUser ? "Anda" : "CursorGo Agent"}
          </span>
          {message.model && !isUser && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {message.model}
            </span>
          )}
        </div>

        {message.context && message.context.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {message.context.map((path) => (
              <span
                key={path}
                className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                <FileText className="h-3 w-3" />
                {path.split("/").pop()}
              </span>
            ))}
          </div>
        )}

        <div
          className={cn(
            "text-foreground/90",
            message.error && "text-destructive"
          )}
        >
          {message.content ? (
            <ChatMarkdown content={message.content} />
          ) : message.streaming ? (
            <TypingDots />
          ) : null}
          {message.streaming && message.content && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
