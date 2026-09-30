import { subscriptionSeal } from "@/lib/subscription";

export function SubscriptionSeal({
  tier,
  size = 18,
}: {
  tier: string | null | undefined;
  size?: number;
}) {
  const seal = subscriptionSeal(tier);
  if (!seal) return null;
  return (
    <img
      src={seal.seal}
      alt={`Assinante ${seal.label}`}
      title={`Assinante ${seal.label}`}
      style={{ width: size, height: size }}
      className="inline-block shrink-0 object-contain"
    />
  );
}
