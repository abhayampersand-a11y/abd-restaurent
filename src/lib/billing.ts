/** Pure billing math: bill totals, coupon validation, loyalty. */
import { TAX_RATE } from "@/lib/constants";

export type BillLine = { unitPrice: number; quantity: number };

export type BillInput = {
  lines: BillLine[];
  couponDiscount?: number;
  loyaltyRedeem?: number;
  tip?: number;
};

export type Bill = {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  tip: number;
  total: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compute a full bill breakdown. Discounts are applied before tax. */
export function computeBill({
  lines,
  couponDiscount = 0,
  loyaltyRedeem = 0,
  tip = 0,
}: BillInput): Bill {
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const discount = round2(Math.min(subtotal, couponDiscount + loyaltyRedeem));
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * TAX_RATE);
  const total = round2(taxable + tax + tip);
  return { subtotal, discount, taxable, tax, tip: round2(tip), total };
}

export type CouponRow = {
  code: string;
  type: "percent" | "flat";
  value: string | number;
  minOrder: string | number;
  isActive: boolean;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  usageLimit: number | null;
  usedCount: number;
  happyHourStart: number | null;
  happyHourEnd: number | null;
};

export type CouponResult =
  | { ok: true; discount: number }
  | { ok: false; error: string };

/** Validate a coupon against the current subtotal and time; return its discount. */
export function evaluateCoupon(
  coupon: CouponRow,
  subtotal: number,
  now: Date = new Date(),
): CouponResult {
  if (!coupon.isActive) return { ok: false, error: "Coupon is inactive." };

  if (coupon.validFrom && new Date(coupon.validFrom) > now)
    return { ok: false, error: "Coupon is not active yet." };
  if (coupon.validTo && new Date(coupon.validTo) < now)
    return { ok: false, error: "Coupon has expired." };

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return { ok: false, error: "Coupon usage limit reached." };

  const minOrder = Number(coupon.minOrder);
  if (subtotal < minOrder)
    return { ok: false, error: `Minimum order ₹${minOrder} required.` };

  // Happy-hour window (inclusive start, exclusive end); supports overnight.
  if (coupon.happyHourStart != null && coupon.happyHourEnd != null) {
    const hour = now.getHours();
    const { happyHourStart: s, happyHourEnd: e } = coupon;
    const inWindow = s <= e ? hour >= s && hour < e : hour >= s || hour < e;
    if (!inWindow)
      return { ok: false, error: `Valid only ${s}:00–${e}:00 (happy hour).` };
  }

  const value = Number(coupon.value);
  const discount =
    coupon.type === "percent"
      ? round2(Math.min(subtotal, (subtotal * value) / 100))
      : round2(Math.min(subtotal, value));

  return { ok: true, discount };
}

/** Loyalty: 1 point per ₹100 spent (on the taxable amount). */
export function pointsEarned(taxable: number): number {
  return Math.floor(taxable / 100);
}

/** 1 point == ₹1 when redeeming, capped at the subtotal. */
export function redeemValue(points: number, subtotal: number): number {
  return Math.max(0, Math.min(points, Math.floor(subtotal)));
}
