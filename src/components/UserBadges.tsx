import { SubscriptionSeal } from "@/components/SubscriptionSeal";

export type Badge = { id: string; name: string; image_url: string };

/**
 * Fileira de selos ao lado do nome do usuário: selo de assinatura,
 * selos extras (emblemas) e o selo de cargo ADMIN.
 */
export function UserBadges({
  tier,
  badges,
  isAdmin,
  size = 24,
}: {
  tier?: string | null | undefined;
  badges?: Badge[] | undefined;
  isAdmin?: boolean | undefined;
  size?: number;
}) {
  const extra = badges ?? [];
  return (
    <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <SubscriptionSeal tier={tier} size={size} />
      {extra.map((badge) => (
        <span
          key={badge.id}
          title={badge.name}
          className="grid shrink-0 place-items-center rounded-lg border border-border bg-surface-2/70 p-1.5 shadow-[var(--shadow-card)] transition-transform motion-safe:hover:-translate-y-0.5"
        >
          <img
            src={badge.image_url}
            alt={badge.name}
            style={{ width: size, height: size }}
            className="block object-contain"
            loading="lazy"
          />
        </span>
      ))}
      {isAdmin ? (
        <span
          title="Administrador"
          className="inline-flex h-8 shrink-0 cursor-help items-center rounded-md border border-primary/40 bg-primary/15 px-2.5 text-[10px] font-extrabold uppercase leading-none text-primary shadow-[var(--shadow-card)]"
        >
          Admin
        </span>
      ) : null}
    </span>
  );
}
