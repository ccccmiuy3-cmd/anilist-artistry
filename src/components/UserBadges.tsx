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
    <span className="inline-flex shrink-0 flex-wrap items-center gap-1">
      <SubscriptionSeal tier={tier} size={size} />
      {extra.map((badge) => (
        <img
          key={badge.id}
          src={badge.image_url}
          alt={badge.name}
          title={badge.name}
          style={{ width: size, height: size }}
          className="inline-block shrink-0 cursor-help object-contain transition-transform hover:scale-110"
          loading="lazy"
        />
      ))}
      {isAdmin ? (
        <span
          title="Administrador"
          className="inline-flex cursor-help items-center rounded border border-blue-700 bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white shadow-sm"
        >
          Admin
        </span>
      ) : null}
    </span>
  );
}
