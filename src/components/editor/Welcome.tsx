import { motion } from "framer-motion";
import {
  FilePlus2,
  FolderOpen,
  Keyboard,
  Sparkles,
  Zap,
} from "lucide-react";
import { BorderBeam } from "@/components/magicui/border-beam";
import { GradientText } from "@/components/magicui/gradient-text";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { Button } from "@/components/ui/button";

interface Props {
  onOpenFolder: () => void;
  onOpenFiles: () => void;
  onOpenAi: () => void;
  supported: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Welcome({ onOpenFolder, onOpenFiles, onOpenAi, supported }: Props) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-background px-6">
      <DotPattern className="opacity-50 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]" />
      <div className="absolute left-1/2 top-1/3 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full max-w-xl flex-col items-center text-center"
      >
        <motion.div variants={item}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <AnimatedShinyText className="text-xs">
              AI-native code editor di browser
            </AnimatedShinyText>
          </div>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Cursor<GradientText>Go</GradientText>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-3 max-w-md text-balance text-sm text-muted-foreground sm:text-base"
        >
          Editor kode mirip VSCode + Cursor yang berjalan penuh di browser.
          Buka file lokal, edit, dan berkolaborasi dengan AI Agent.
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {supported ? (
            <>
              <ShimmerButton onClick={onOpenFolder} className="text-sm font-medium">
                <FolderOpen className="mr-2 h-4 w-4" />
                Buka Folder
              </ShimmerButton>
              <Button variant="outline" size="lg" onClick={onOpenFiles}>
                <FilePlus2 className="h-4 w-4" />
                Buka File
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Browser tidak mendukung akses file. Gunakan Chrome / Edge / Brave terbaru.
            </div>
          )}
        </motion.div>

        <motion.div
          variants={item}
          className="relative mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <FeatureCard
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            title="AI Agent"
            desc="Composer 2.5 & mode Auto"
            onClick={onOpenAi}
          />
          <FeatureCard
            icon={<Zap className="h-4 w-4 text-amber-400" />}
            title="Cepat"
            desc="Monaco + streaming"
          />
          <FeatureCard
            icon={<Keyboard className="h-4 w-4 text-emerald-400" />}
            title="Shortcuts"
            desc="Cmd+S simpan, Cmd+I AI"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-4 text-left backdrop-blur transition-colors hover:border-primary/40"
    >
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background/80">
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
      {onClick && <BorderBeam size={80} duration={8} />}
    </button>
  );
}
