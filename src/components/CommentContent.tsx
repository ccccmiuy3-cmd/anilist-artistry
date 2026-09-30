import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { EyeOff } from "lucide-react";
import { getCommentImageUrl } from "@/lib/comments";

interface CommentContentProps {
  body: string;
  isSpoiler?: boolean | null;
  imageUrl?: string | null;
  usernames?: string[];
}

function renderBody(body: string, usernames: string[]): ReactNode[] {
  const sorted = [...usernames].sort((a, b) => b.length - a.length);
  const nodes: ReactNode[] = [];
  let rest = body;
  let key = 0;
  while (rest.length > 0) {
    const at = rest.indexOf("@");
    if (at === -1) {
      nodes.push(rest);
      break;
    }
    if (at > 0) nodes.push(rest.slice(0, at));
    const after = rest.slice(at + 1);
    const match = sorted.find((name) => after.startsWith(name));
    if (match) {
      nodes.push(
        <Link
          key={key++}
          to="/u/$username"
          params={{ username: match }}
          className="rounded bg-primary/15 px-1 font-semibold text-primary transition-colors hover:bg-primary/25"
        >
          @{match}
        </Link>,
      );
      rest = after.slice(match.length);
    } else {
      nodes.push("@");
      rest = after;
    }
  }
  return nodes;
}

export function CommentContent({ body, isSpoiler, imageUrl, usernames = [] }: CommentContentProps) {
  const [revealed, setRevealed] = useState(false);
  const hidden = Boolean(isSpoiler) && !revealed;

  const image = useQuery({
    queryKey: ["comment-image", imageUrl],
    enabled: Boolean(imageUrl) && !hidden,
    staleTime: Infinity,
    queryFn: () => getCommentImageUrl(imageUrl!),
  });

  return (
    <div className="mt-1">
      {hidden ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <EyeOff className="h-3.5 w-3.5" /> Spoiler — clique para revelar
        </button>
      ) : (
        <>
          {body ? (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {renderBody(body, usernames)}
            </p>
          ) : null}
          {image.data ? (
            <img
              src={image.data}
              alt="Imagem do comentário"
              loading="lazy"
              className="mt-2 max-h-64 rounded-lg border border-border"
            />
          ) : null}
        </>
      )}
    </div>
  );
}
