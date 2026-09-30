import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex items-center gap-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" /> Anterior
      </button>
      <span className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold">
        {page}/{pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="flex items-center gap-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40"
      >
        Próxima <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
