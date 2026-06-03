/**
 * Human-readable card brand for donation / batch labels (Stripe `card.brand` values are lowercase enums).
 */
export function formatStripeCardBrand(brand: string | undefined | null): string {
  const b = (brand || "").toString().trim().toLowerCase();
  if (!b) return "Card";
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    american_express: "Amex",
    discover: "Discover",
    diners: "Diners Club",
    diners_club: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
    cartes_bancaires: "Cartes Bancaires",
    elo: "Elo",
    link: "Link"
  };
  if (map[b]) return map[b];
  return b.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Card brand + last4 from a PaymentIntent-shaped object (API response or webhook payload). */
export function stripeCardFromPaymentIntentLike(intent: any): { brand: string; last4: string } | null {
  if (!intent || typeof intent !== "object") return null;

  const pm = intent.payment_method;
  if (pm && typeof pm === "object") {
    if (pm.type === "card" && pm.card) {
      const brand = (pm.card.brand || "").toString();
      const last4 = (pm.card.last4 || "").toString();
      if (brand || last4) return { brand, last4 };
    }
  }

  const chargeCard = intent?.charges?.data?.[0]?.payment_method_details?.card;
  if (chargeCard && (chargeCard.brand || chargeCard.last4)) {
    return {
      brand: (chargeCard.brand || "").toString(),
      last4: (chargeCard.last4 || "").toString()
    };
  }

  return null;
}
