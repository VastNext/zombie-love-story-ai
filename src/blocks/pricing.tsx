import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import {
  PricingTable,
  type PricingGroup,
  type PricingPlan,
} from '@/components/pricing-table';

const ALL_PROVIDERS: PaymentProvider[] = [
  'stripe',
  'creem',
  'paypal',
  'alipay',
  'wechat',
];

interface TierConfig {
  key: string;
  name: string;
  price: string;
  /** Struck-through anchor shown next to the price. */
  originalPrice: string;
  tagline: string;
  cta: string;
  popular?: boolean;
  /** Credits granted per month (200 credits = US$1); the yearly plan grants
   *  twelve of them. */
  monthlyCredits: number;
  /** Per-month price when paying yearly; the yearly charge is twelve of it. */
  yearlyMonthlyPrice: number;
}

/** Same for every tier — only the price and the credit grant differ. */
function sharedFeatures(): string[] {
  return [
    m['landing.pricing.feature_generation'](),
    m['landing.pricing.feature_models'](),
    m['landing.pricing.feature_license'](),
  ];
}

function getTiers(): TierConfig[] {
  return [
    {
      key: 'lite',
      name: m['landing.pricing.lite_name'](),
      price: m['landing.pricing.lite_price'](),
      originalPrice: m['landing.pricing.lite_original_price'](),
      tagline: m['landing.pricing.lite_tagline'](),
      cta: m['landing.pricing.lite_cta'](),
      yearlyMonthlyPrice: 8.9,
      monthlyCredits: 2_000,
    },
    {
      key: 'pro',
      name: m['landing.pricing.pro_name'](),
      price: m['landing.pricing.pro_price'](),
      originalPrice: m['landing.pricing.pro_original_price'](),
      tagline: m['landing.pricing.pro_tagline'](),
      cta: m['landing.pricing.pro_cta'](),
      yearlyMonthlyPrice: 16.9,
      popular: true,
      monthlyCredits: 4_800,
    },
    {
      key: 'ultra',
      name: m['landing.pricing.ultra_name'](),
      price: m['landing.pricing.ultra_price'](),
      originalPrice: m['landing.pricing.ultra_original_price'](),
      tagline: m['landing.pricing.ultra_tagline'](),
      cta: m['landing.pricing.ultra_cta'](),
      yearlyMonthlyPrice: 32.9,
      monthlyCredits: 10_000,
    },
  ];
}

function buildPlans(
  tiers: TierConfig[],
  intervalSuffix: 'monthly' | 'yearly'
): PricingPlan[] {
  const yearly = intervalSuffix === 'yearly';

  return tiers.map((tier) => {
    // Yearly is quoted per month too, so the two tabs compare like for like:
    // the monthly price is what's struck through, the note says what actually
    // gets charged, and the badge names the discount.
    const symbol = tier.price.replace(/[0-9.]/g, '');
    const monthly = parseFloat(tier.price.replace(/[^0-9.]/g, ''));
    const yearTotal = tier.yearlyMonthlyPrice * 12;
    const savedPercent = Math.round(
      (1 - tier.yearlyMonthlyPrice / monthly) * 100
    );
    // Round to cents, then let Number drop the trailing zeros: 106.80 → 106.8,
    // 96.00 → 96.
    const money = (value: number) => `${symbol}${Number(value.toFixed(2))}`;

    const credits = yearly ? tier.monthlyCredits * 12 : tier.monthlyCredits;

    return {
      id: `${tier.key}-${intervalSuffix}`,
      name: tier.name,
      description: tier.tagline,
      price: yearly ? money(tier.yearlyMonthlyPrice) : tier.price,
      // Yearly is compared against paying month to month; monthly against the
      // list price.
      originalPrice: yearly ? tier.price : tier.originalPrice,
      priceNote: yearly
        ? m['landing.pricing.billed_yearly']({ total: money(yearTotal) })
        : undefined,
      interval: m['landing.pricing.interval_month'](),
      featured: !!tier.popular,
      badge: yearly
        ? m['landing.pricing.save_percent']({ percent: savedPercent })
        : tier.popular
          ? m['landing.pricing.popular']()
          : undefined,
      features: [
        yearly
          ? m['landing.pricing.credits_yearly']({
              credits: credits.toLocaleString(),
            })
          : m['landing.pricing.credits_monthly']({
              credits: credits.toLocaleString(),
            }),
        ...sharedFeatures(),
      ],
      buttonText: tier.cta,
      productId: `${tier.key}_${intervalSuffix}`,
      priceInCents: Math.round((yearly ? yearTotal : monthly) * 100),
      currency: 'usd',
      credits,
      creditsValidDays: yearly ? 365 : 30,
      plan: {
        name: tier.name,
        interval: yearly ? 'year' : 'month',
        intervalCount: 1,
      },
    } satisfies PricingPlan;
  });
}

export function Pricing({
  title,
  compact = false,
  redirect,
}: {
  title?: string;
  /** Drop the section chrome (heading + page padding) when embedded. */
  compact?: boolean;
  /** Same-origin path to land on after a successful payment. */
  redirect?: string;
} = {}) {
  const router = useRouter();
  const { data: session } = useSession();

  // Same cache entry the sidebar and the credits page use, so the plan the
  // viewer already pays for is known without another request.
  const { data: subscription } = useQuery({
    queryKey: ['user-subscription', 'current'],
    queryFn: () =>
      apiGet<{ productId?: string | null } | null>(
        '/api/user/subscriptions/current'
      ),
    enabled: Boolean(session?.user),
  });

  const { data: configsData } = usePublicConfig();
  const configs = configsData ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);

  const enabledProviders = useMemo<PaymentProvider[]>(
    () => ALL_PROVIDERS.filter((p) => configs[`${p}_enabled`] === 'true'),
    [configs]
  );

  const tiers = getTiers();

  const groups: PricingGroup[] = [
    {
      key: 'monthly',
      label: m['landing.pricing.monthly'](),
      plans: buildPlans(tiers, 'monthly'),
    },
    {
      key: 'yearly',
      label: m['landing.pricing.yearly'](),
      // The best discount on offer — tiers differ, so it's "up to".
      badge: m['landing.pricing.save_up_to']({
        percent: Math.max(
          ...tiers.map((tier) =>
            Math.round(
              (1 -
                tier.yearlyMonthlyPrice /
                  parseFloat(tier.price.replace(/[^0-9.]/g, ''))) *
                100
            )
          )
        ),
      }),
      plans: buildPlans(tiers, 'yearly'),
    },
  ];

  const checkoutMutation = useMutation({
    mutationFn: ({
      plan,
      provider,
    }: {
      plan: PricingPlan;
      provider: PaymentProvider;
    }) =>
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
        payment_provider: provider,
        redirect,
      }),
    onSuccess: (data) => {
      if (!data?.checkout_url) {
        toast.error('Checkout failed');
        setLoadingProvider(null);
        return;
      }
      window.location.href = data.checkout_url;
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Checkout failed');
      setLoadingProvider(null);
    },
  });

  function startCheckout(plan: PricingPlan, provider: PaymentProvider) {
    setLoadingProvider(provider);
    checkoutMutation.mutate({ plan, provider });
  }

  async function handleCheckout(plan: PricingPlan) {
    // Free tier — no checkout, just funnel to sign-up.
    if (!plan.productId || !plan.priceInCents) {
      router.push('/sign-up');
      return;
    }

    if (!session?.user) {
      const redirect = encodeURIComponent(
        typeof window !== 'undefined' ? window.location.pathname : '/pricing'
      );
      router.push(`/sign-in?redirect=${redirect}`);
      return;
    }

    const selectEnabled = configs.select_payment_enabled === 'true';
    const defaultProvider = (configs.default_payment_provider ||
      enabledProviders[0] ||
      'stripe') as PaymentProvider;

    if (selectEnabled && enabledProviders.length > 1) {
      setPendingPlan(plan);
      setModalOpen(true);
      return;
    }

    await startCheckout(plan, defaultProvider);
  }

  function handleProviderSelect(provider: PaymentProvider) {
    if (!pendingPlan) return;
    startCheckout(pendingPlan, provider);
  }

  const table = (
    /* Yearly is the better deal, so it's what the page opens on. */
    <PricingTable
      groups={groups}
      defaultGroup="yearly"
      currentProductId={subscription?.productId}
      onCheckout={handleCheckout}
    />
  );

  const providerModal = (
    <PaymentProviderModal
      open={modalOpen}
      onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) {
          setPendingPlan(null);
          setLoadingProvider(null);
        }
      }}
      providers={enabledProviders.length ? enabledProviders : ['stripe']}
      loadingProvider={loadingProvider}
      onSelect={handleProviderSelect}
      planName={pendingPlan?.name}
      price={pendingPlan?.price}
    />
  );

  if (compact) {
    return (
      <>
        {table}
        {providerModal}
      </>
    );
  }

  return (
    <section id="pricing" className="px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl lg:text-5xl">
            {title ?? m['landing.pricing.title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base">
            {m['landing.pricing.description']()}
          </p>
        </div>
        <div className="mt-12">{table}</div>
      </div>
      {providerModal}
    </section>
  );
}
