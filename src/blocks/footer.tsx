import { Skull } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

export function Footer() {
  return (
    <footer className="border-border bg-background border-t px-6 py-7">
      <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-xs md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-rose-600 via-rose-500 to-amber-500">
            <Skull className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-foreground font-semibold">
            ZombieLoveStory.ai
          </span>
          <span>· All rights reserved © 2026</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 font-mono text-[11px]">
          <a
            href="/#generator"
            className="hover:text-foreground transition-colors"
          >
            Generator
          </a>
          <a
            href="/#sample"
            className="hover:text-foreground transition-colors"
          >
            Sample
          </a>
          <a
            href="/#prompts"
            className="hover:text-foreground transition-colors"
          >
            Storyboard
          </a>
          <a
            href="/zombie/order"
            className="hover:text-foreground transition-colors"
          >
            My orders
          </a>
          <a
            href="/#pricing"
            className="hover:text-foreground transition-colors"
          >
            Pricing
          </a>
          <a href="/#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
          <Link
            href="/privacy-policy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms-of-service"
            className="hover:text-foreground transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
