import { Link } from "@tanstack/react-router";
import { Flame, MessageSquare } from "lucide-react";
import { FramedAvatar } from "@/components/FramedAvatar";
import { CommentContent } from "@/components/CommentContent";
import { CommentReactions } from "@/components/CommentReactions";

export type CommentAuthor = {
  username: string;
  avatar_url: string | null;
  level?: number | null;
  avatar_frame?: string | null;
};

export type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  is_spoiler?: boolean | null;
  image_url?: string | null;
  author: CommentAuthor | null;
};

function levelChip(level: number) {
  if (level >= 50) return "border-amber-500/30 bg-amber-500/10 text-amber-200 [&_svg]:text-amber-300";
  if (level >= 25) return "border-purple-500/30 bg-purple-500/10 text-purple-200 [&_svg]:text-purple-300";
  if (level >= 10) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 [&_svg]:text-emerald-300";
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200 [&_svg]:text-cyan-300";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CommentItem({
  comment,
  userId,
  onReply,
}: {
  comment: CommentRow;
  userId?: string | undefined;
  onReply?: ((username: string) => void) | undefined;
}) {
  const author = comment.author;
  const username = author?.username ?? "leitor";
  const level = Math.max(1, Number(author?.level ?? 1));

  return (
    <li className="relative -mx-3 -my-1 scroll-mt-32 rounded-xl p-3">
      <div className="relative z-[1] flex items-start gap-3">
        <Link
          to="/u/$username"
          params={{ username }}
          title="Ver perfil"
          className="w-10 shrink-0 overflow-visible rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <FramedAvatar
            src={author?.avatar_url ?? null}
            frame={author?.avatar_frame}
            size={40}
            className="transition-all hover:ring-2 hover:ring-primary/50 rounded-full"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <Link
              to="/u/$username"
              params={{ username }}
              title="Ver perfil"
              className="shrink-0 truncate text-sm font-medium text-foreground hover:text-primary"
            >
              {username}
            </Link>
            <span
              title={`Nível ${level}`}
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums ${levelChip(level)}`}
            >
              <Flame className="h-[11px] w-[11px] shrink-0" />
              <span>Nv.&nbsp;{level}</span>
            </span>
            <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-white/40">
              {formatDate(comment.created_at)}
            </span>
          </div>
          <CommentContent
            body={comment.body}
            isSpoiler={comment.is_spoiler ?? null}
            imageUrl={comment.image_url ?? null}
          />
          <div className="relative z-10 mt-2 flex flex-wrap items-center gap-4">
            <CommentReactions commentId={comment.id} userId={userId} />
            {onReply ? (
              <button
                type="button"
                onClick={() => onReply(username)}
                className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Responder
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
