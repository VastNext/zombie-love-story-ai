'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';

import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type PricingFeature =
  | string
  | { icon?: IconComponent; label: string; tooltip?: string };

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  price: string;
  originalPrice?: string;
  /** Small line under the price, e.g. what actually gets charged. */
  priceNote?: string;
  currency?: string;
  interval?: string;
  featured?: boolean;
  badge?: string;
  features: PricingFeature[];
  buttonText?: string;
  productId?: string;
  productName?: string;
  paymentProvider?: string;
  priceInCents?: number;
  credits?: number;
  creditsValidDays?: number;
  plan?: {
    name: string;
    interval: string;
    intervalCount: number;
  };
}

export interface PricingGroup {
  key: string;
  label: string;
  /** Small pill next to the label, e.g. the yearly discount. */
  badge?: string;
  plans: PricingPlan[];
}

export function PricingTable({
  groups,
  defaultGroup,
  currentProductId,
  onCheckout,
}: {
  groups: PricingGroup[];
  /** Which tab opens first; defaults to the leftmost. */
  defaultGroup?: string;
  /** The plan the viewer already pays for — marked, and not sellable again. */
  currentProductId?: string | null;
  onCheckout?: (plan: PricingPlan) => void;
}) {
  const [activeGroup, setActiveGroup] = useState(
    defaultGroup || groups[0]?.key || ''
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const currentGroup = groups.find((g) => g.key === activeGroup) || groups[0];

  // Matched on the exact product, so a monthly subscriber viewing the yearly
  // tab still sees a real offer — switching interval is a genuine change.
  const isCurrent = (plan: PricingPlan) =>
    Boolean(currentProductId && plan.productId === currentProductId);

  const checkoutMutation = useMutation({
    mutationFn: (plan: PricingPlan) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: plan.productId,
        product_name: plan.productName || plan.name,
        plan_name: plan.plan?.name || plan.name,
        price: plan.priceInCents,
        currency: plan.currency || 'usd',
        type: plan.plan ? 'subscription' : 'one-time',
        description: plan.name,
        plan: plan.plan,
        credits: plan.credits,
        credits_valid_days: plan.creditsValidDays,
        payment_provider: plan.paymentProvider || 'stripe',
      }),
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onSettled: () => {
      setLoadingId(null);
    },
  });

  function handleCheckout(plan: PricingPlan) {
    if (onCheckout) {
      onCheckout(plan);
      return;
    }

    if (!plan.productId || !plan.priceInCents) return;

    setLoadingId(plan.id);
    checkoutMutation.mutate(plan);
  }

  return (
    <div className="space-y-10">
      {/* Group tabs — pill toggle */}
      {groups.length > 1 && (
        <div className="flex justify-center">
          <div className="border-border bg-muted/40 inline-flex items-center rounded-full border p-1">
            {groups.map((group) => (
              <button
                key={group.key}
                onClick={() => setActiveGroup(group.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-medium transition-colors',
                  activeGroup === group.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {group.label}
                {group.badge && (
                  <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs font-medium">
                    {group.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div
        className={cn(
          'mx-auto grid gap-6',
          currentGroup?.plans.length === 2
            ? 'max-w-3xl sm:grid-cols-2'
            : currentGroup?.plans.length === 3
              ? 'max-w-5xl sm:grid-cols-2 lg:grid-cols-3'
              : 'max-w-6xl sm:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {currentGroup?.plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'border-border relative flex flex-col rounded-lg border p-8 transition-all',
              plan.featured
                ? 'bg-card border-primary ring-primary/20 shadow-md ring-1'
                : 'bg-background hover:border-foreground/30',
              isCurrent(plan) && 'bg-card border-primary ring-primary/20 ring-1'
            )}
          >
            {/* Badge — the viewer's own plan outranks "popular"/savings */}
            {(isCurrent(plan) || plan.badge) && (
              <span className="bg-primary/10 text-primary absolute top-4 right-4 rounded-md px-2 py-0.5 text-xs font-medium">
                {isCurrent(plan)
                  ? m['common.pricing.current_plan']()
                  : plan.badge}
              </span>
            )}

            {/* Plan name */}
            {plan.name && (
              <p className="text-foreground mb-2 text-sm font-medium">
                {plan.name}
              </p>
            )}

            {/* Price */}
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-serif text-5xl tracking-tight">
                {plan.price}
              </span>
              {plan.interval && (
                <span className="text-muted-foreground text-sm">
                  /{plan.interval}
                </span>
              )}
            </div>
            <div className="mb-1 flex items-baseline gap-2">
              {plan.originalPrice && (
                <span className="text-muted-foreground text-sm line-through">
                  {plan.originalPrice}
                </span>
              )}
              {plan.priceNote && (
                <span className="text-muted-foreground text-sm">
                  {plan.priceNote}
                </span>
              )}
            </div>

            {/* Description */}
            {plan.description && (
              <p className="text-muted-foreground mb-8 text-sm">
                {plan.description}
              </p>
            )}

            {/* CTA — full-width pill */}
            <Button
              variant={
                plan.featured && !isCurrent(plan) ? 'default' : 'outline'
              }
              className="h-10 w-full rounded-full text-sm font-medium"
              onClick={() => handleCheckout(plan)}
              disabled={loadingId === plan.id || isCurrent(plan)}
            >
              {isCurrent(plan)
                ? m['common.pricing.current_plan']()
                : loadingId === plan.id
                  ? m['common.pricing.processing']()
                  : plan.buttonText || m['common.pricing.get_started']()}
            </Button>

            {/* Features */}
            <ul className="mt-8 space-y-3">
              {plan.features.map((feature, i) => {
                const isObj = typeof feature !== 'string';
                const Icon: IconComponent = (isObj && feature.icon) || Check;
                const label = isObj ? feature.label : feature;
                return (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    <span className="text-foreground/90">{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
