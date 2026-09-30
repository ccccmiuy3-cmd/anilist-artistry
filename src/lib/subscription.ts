export type SubscriptionTier = "none" | "bronze" | "prata" | "ouro" | "diamante";

export const SUBSCRIPTION_TIERS: Record<
  Exclude<SubscriptionTier, "none">,
  { label: string; seal: string }
> = {
  bronze: {
    label: "Bronze",
    seal: "https://cdn.mediocrescan.com/usuario-tags/df923735a91920ef9e5dc62484b4e7d5ff1510db.webp",
  },
  prata: {
    label: "Prata",
    seal: "https://cdn.mediocrescan.com/usuario-tags/0c80f1a523d2af16e5038793e357b5d25661836a.webp",
  },
  ouro: {
    label: "Ouro",
    seal: "https://cdn.mediocrescan.com/usuario-tags/4373bb15df38ecfe198ecfdf9615d33415ec9093.webp",
  },
  diamante: {
    label: "Diamante",
    seal: "https://cdn.mediocrescan.com/usuario-tags/4928eda209a6bb3b158c44e1e9797fd4bb0b8ecf.webp",
  },
};

export function subscriptionSeal(tier: string | null | undefined) {
  if (!tier || tier === "none") return null;
  return SUBSCRIPTION_TIERS[tier as Exclude<SubscriptionTier, "none">] ?? null;
}
