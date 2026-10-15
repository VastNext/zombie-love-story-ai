import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { toast } from 'sonner';

import { creditTopUps } from '@/config/pricing';
import { apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CheckoutResponse {
  checkout_url?: string;
}

/**
 * Buy extra credits on top of a plan. The packs come from the same
 * authoritative catalog the checkout API validates against, so the amounts
 * shown here are the amounts granted.
 */
export function CreditTopUpDialog({
  open,
  onOpenChange,
  redirect = '/settings/credits',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where checkout lands afterwards — a chat top-up returns to the chat. */
  redirect?: string;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const checkout = useMutation({
    mutationFn: (productId: string) =>
      apiPost<CheckoutResponse>('/api/payment/checkout', {
        product_id: productId,
        redirect,
      }),
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setPendingId(null);
      toast.error(m['settings.credits.topup_failed']());
    },
    onError: (error: Error) => {
      setPendingId(null);
      toast.error(error.message || m['settings.credits.topup_failed']());
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m['settings.credits.topup_title']()}</DialogTitle>
          <DialogDescription>
            {m['settings.credits.topup_description']()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {creditTopUps.map((pack) => (
            <div
              key={pack.productId}
              className="border-border flex items-center gap-3 rounded-lg border p-4"
            >
              <Coins className="text-muted-foreground size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  ${(pack.priceInCents / 100).toLocaleString()}
                </p>
                <p className="text-muted-foreground text-sm">
                  {m['settings.credits.topup_credits']({
                    credits: pack.credits.toLocaleString(),
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={checkout.isPending}
                onClick={() => {
                  setPendingId(pack.productId);
                  checkout.mutate(pack.productId);
                }}
              >
                {pendingId === pack.productId
                  ? m['common.pricing.processing']()
                  : m['settings.credits.topup_action']()}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          {m['settings.credits.topup_note']()}
        </p>
      </DialogContent>
    </Dialog>
  );
}
