import { useState } from "react";
import { EyeOff } from "lucide-react";

interface CommentContentProps {
  body: string;
  isSpoiler?: boolean | null;
  imageUrl?: string | null;
}

export function CommentContent({ body, isSpoiler, imageUrl }: CommentContentProps) {
  const [revealed, setRevealed] = useState(false);
  const hidden = Boolean(isSpoiler) && !revealed;

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
            <p className="whitespace-pre-line text-sm text-muted-foreground">{body}</p>
          ) : null}
          {imageUrl ? (
            <img
              src={imageUrl}
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
