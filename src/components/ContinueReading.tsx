import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl, formatChapter } from "@/lib/media";
import { toast } from "sonner";

export type ContinueRow = {
  progress: number;
  updated_at: string;
  chapter_id: string | null;
  chapters: { id: string; number: number } | null;
  series: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    chapters: Array<{ id: string }>;
  };
};

export function ContinueReading({ rows, userId }: { rows: ContinueRow[]; userId: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [hiding, setHiding] = useState<string | null>(null);

  const scrollBy = (delta: number) =>
    scroller.current?.scrollBy({ left: delta, behavior: "smooth" });

  async function hide(seriesId: string) {
    setHiding(seriesId);
    const { error } = await supabase
      .from("reading_history")
      .delete()
      .eq("user_id", userId)
      .eq("series_id", seriesId);
    setHiding(null);
    if (error) {
      toast.error("Não foi possível ocultar.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["history", userId] });
  }

  if (rows.length === 0) return null;

  return (
    <section aria-label="Continue lendo" className="relative min-w-0 max-w-full pb-4 md:pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BookMarked className="h-[18px] w-[18px]" />
          </div>
          <h2 className="shrink-0 text-lg font-bold">Continue Lendo</h2>
        </div>
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            title="Anterior"
            onClick={() => scrollBy(-420)}
            className="cursor-pointer rounded-full border border-foreground/10 bg-card/40 p-2 text-muted-foreground shadow-sm transition-all duration-200 hover:scale-110 hover:border-foreground/20 hover:bg-card/60 hover:text-foreground active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Próximo"
            onClick={() => scrollBy(420)}
            className="cursor-pointer rounded-full border border-foreground/10 bg-card/40 p-2 text-muted-foreground shadow-sm transition-all duration-200 hover:scale-110 hover:border-foreground/20 hover:bg-card/60 hover:text-foreground active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative -mx-4 py-3">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background to-transparent md:w-16" />
        <div ref={scroller} className="no-scrollbar overflow-x-auto pb-4 pl-4 pr-2 pt-1">
          <div className="flex gap-4 sm:gap-6">
            {rows.map((row) => {
              const total = row.series.chapters.length;
              const current = row.chapters?.number ?? 0;
              const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
              return (
                <div
                  key={row.series.id}
                  className="group flex h-full w-[160px] min-w-[160px] max-w-[160px] shrink-0 cursor-pointer flex-col rounded-[1.35rem] transition-all duration-200 ease-out hover:z-[5] hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/50"
                >
                  <Link
                    to="/obra/$slug"
                    params={{ slug: row.series.slug }}
                    className="relative block aspect-[2/3] w-full shrink-0 overflow-hidden rounded-[1.35rem] border border-foreground/10 bg-card/60 text-left no-underline transition-transform duration-200 ease-out active:scale-[0.98]"
                  >
                    <img
                      src={coverUrl(row.series.cover_url)}
                      alt={row.series.title}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover transition-[transform,filter] duration-300 ease-out group-hover:scale-[1.04] group-hover:brightness-110"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                    <button
                      type="button"
                      title="Ocultar do Continue lendo"
                      disabled={hiding === row.series.id}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void hide(row.series.id);
                      }}
                      className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-black/45 text-foreground/60 shadow-md backdrop-blur-md transition-all hover:border-destructive/40 hover:bg-black/70 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className="pointer-events-none absolute bottom-2 left-2 z-[12] inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-black/30 px-2 py-1 shadow-[0_2px_14px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                      <BookMarked className="h-2.5 w-2.5 shrink-0 text-white" strokeWidth={2.5} />
                      <span className="text-[10px] font-extrabold tabular-nums leading-none text-white">
                        {formatChapter(current)}/{formatChapter(total)}
                      </span>
                    </span>
                  </Link>
                  <div className="mt-2 px-0.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-1 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="pb-2" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
