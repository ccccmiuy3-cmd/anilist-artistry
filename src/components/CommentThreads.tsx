import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CommentItem, type CommentRow } from "@/components/CommentItem";

type Props = {
  comments: CommentRow[];
  userId?: string | undefined;
  onReply?: ((comment: CommentRow) => void) | undefined;
};

export function CommentThreads({ comments, userId, onReply }: Props) {
  const { roots, repliesByRoot } = useMemo(() => {
    const byId = new Map(comments.map((c) => [c.id, c]));
    const rootOf = (c: CommentRow): string => {
      let cur = c;
      const seen = new Set<string>();
      while (cur.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parent_id)!;
      }
      return cur.id;
    };
    const roots: CommentRow[] = [];
    const repliesByRoot = new Map<string, CommentRow[]>();
    for (const c of comments) {
      const r = rootOf(c);
      if (r === c.id) roots.push(c);
      else repliesByRoot.set(r, [...(repliesByRoot.get(r) ?? []), c]);
    }
    for (const list of repliesByRoot.values())
      list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { roots, repliesByRoot };
  }, [comments]);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {roots.map((root) => {
        const replies = repliesByRoot.get(root.id) ?? [];
        const isHidden = hidden.has(root.id);
        return (
          <li key={root.id} className="list-none">
            <ul>
              <CommentItem
                comment={root}
                userId={userId}
                onReply={onReply}
                footerExtra={
                  replies.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggle(root.id)}
                      className="flex items-center gap-1 text-xs font-medium text-primary/80 transition-colors hover:text-primary"
                    >
                      {isHidden ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      {isHidden
                        ? `Ver ${replies.length} resposta${replies.length > 1 ? "s" : ""}`
                        : "Ocultar respostas"}
                    </button>
                  ) : null
                }
              />
            </ul>
            {replies.length > 0 && !isHidden ? (
              <ul className="ml-5 mt-3 space-y-4 border-l-2 border-primary/20 pl-4 sm:ml-12">
                {replies.map((r) => (
                  <CommentItem key={r.id} comment={r} userId={userId} onReply={onReply} />
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </>
  );
}
