/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * To change pricing, edit this file and redeploy. Admin UI cannot alter prices.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
  /** Top-ups only make sense on top of a plan — checkout rejects these when
   *  the buyer has no active subscription. */
  requiresSubscription?: boolean;
};

/**
 * Default demo catalog. Replace with your real products when launching.
 * Keys MUST match what the pricing UI sends as product_id.
 */
/**
 * Live catalog. Credits are priced at 200 per US dollar, and a default 5-second
 * MiniMax H3 clip costs 550 credits — see AGENT_MODEL_OPTIONS for the per-model
 * rates. Yearly plans charge ten months and grant twelve months of credits.
 *
 * Video renders cost far more per unit than image renders: Lite's 2000 monthly
 * credits buy three default MiniMax H3 clips. Re-check the tiers against the
 * audience you are selling to before launch.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  lite_monthly: {
    productId: 'lite_monthly',
    productName: 'Lite',
    planName: 'Lite',
    description: 'Lite Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 990,
    currency: 'usd',
    credits: 2000,
    creditsValidDays: 30,
    plan: { name: 'Lite', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  pro_monthly: {
    productId: 'pro_monthly',
    productName: 'Pro',
    planName: 'Pro',
    description: 'Pro Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 1990,
    currency: 'usd',
    credits: 4800,
    creditsValidDays: 30,
    plan: { name: 'Pro', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  ultra_monthly: {
    productId: 'ultra_monthly',
    productName: 'Ultra',
    planName: 'Ultra',
    description: 'Ultra Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 3990,
    currency: 'usd',
    credits: 10000,
    creditsValidDays: 30,
    plan: { name: 'Ultra', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  lite_yearly: {
    productId: 'lite_yearly',
    productName: 'Lite',
    planName: 'Lite',
    description: 'Lite Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 10680,
    currency: 'usd',
    credits: 24000,
    creditsValidDays: 365,
    plan: { name: 'Lite', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  pro_yearly: {
    productId: 'pro_yearly',
    productName: 'Pro',
    planName: 'Pro',
    description: 'Pro Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 20280,
    currency: 'usd',
    credits: 57600,
    creditsValidDays: 365,
    plan: { name: 'Pro', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  ultra_yearly: {
    productId: 'ultra_yearly',
    productName: 'Ultra',
    planName: 'Ultra',
    description: 'Ultra Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 39480,
    currency: 'usd',
    credits: 120000,
    creditsValidDays: 365,
    plan: { name: 'Ultra', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  credits_10: {
    productId: 'credits_10',
    productName: 'Credits',
    planName: 'Credit top-up',
    description: '$10 credit top-up',
    type: PaymentType.ONE_TIME,
    priceInCents: 1000,
    currency: 'usd',
    credits: 2000,
    creditsValidDays: 365,
    requiresSubscription: true,
  },
  credits_50: {
    productId: 'credits_50',
    productName: 'Credits',
    planName: 'Credit top-up',
    description: '$50 credit top-up',
    type: PaymentType.ONE_TIME,
    priceInCents: 5000,
    currency: 'usd',
    // 10% more than the base rate
    credits: 11000,
    creditsValidDays: 365,
    requiresSubscription: true,
  },
  credits_100: {
    productId: 'credits_100',
    productName: 'Credits',
    planName: 'Credit top-up',
    description: '$100 credit top-up',
    type: PaymentType.ONE_TIME,
    priceInCents: 10000,
    currency: 'usd',
    // 20% more than the base rate
    credits: 24000,
    creditsValidDays: 365,
    requiresSubscription: true,
  },
};

/** The top-up packs offered in the credits page dialog, cheapest first. */
export const creditTopUps: PricingProduct[] = [
  pricingCatalog.credits_10,
  pricingCatalog.credits_50,
  pricingCatalog.credits_100,
];

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}
