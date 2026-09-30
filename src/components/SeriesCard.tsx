import { Link } from "@tanstack/react-router";
import { BookOpen, Star } from "lucide-react";
import { coverUrl } from "@/lib/media";

type Props = {
  slug: string;
  title: string;
  cover?: string | null;
  rating?: number | null;
  chapters?: number | null;
  progress?: number | null;
  badge?: string | null;
  showTitle?: boolean;
};

export function SeriesCard({
  slug,
  title,
  cover,
  rating,
  chapters,
  progress,
  badge,
  showTitle = true,
}: Props) {
  return (
    <Link to="/obra/$slug" params={{ slug }} className="card-hover group block w-full">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
        <img
          src={coverUrl(cover)}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {(rating || chapters) && (
          <div className="absolute left-1.5 top-1.5 flex gap-1">
            {rating ? (
              <span className="flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[11px] font-semibold">
                <Star className="h-3 w-3 fill-gold text-gold" />
                {Number(rating).toFixed(1).replace(".", ",")}
              </span>
            ) : null}
            {chapters ? (
              <span className="flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[11px] font-semibold">
                <BookOpen className="h-3 w-3 text-muted-foreground" />
                {chapters}
              </span>
            ) : null}
          </div>
        )}
        {badge ? (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
            {badge}
          </span>
        ) : null}
        {typeof progress === "number" ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-2 pt-6">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      {showTitle ? (
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
          {title}
        </p>
      ) : null}
    </Link>
  );
}
