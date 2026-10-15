'use client';

import { useState } from 'react';
import { Menu, Skull, X, Zap } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteUserMenu } from '@/components/site-user-menu';
import { ThemeToggle } from '@/components/theme-toggle';

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  const navItems = [
    { label: 'Generator', href: '/#generator' },
    { label: 'Match-Cut Anatomy', href: '/#storyboard' },
    { label: 'Prompt Catalog', href: '/#prompts' },
    { label: 'Trend Variations', href: '/#longtail' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'FAQ', href: '/#faq' },
  ];

  return (
    <header className="border-border sticky top-0 z-50 w-full border-b bg-[#010103]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-600 via-rose-500 to-amber-500 shadow-md shadow-rose-950/40 transition-transform group-hover:scale-105">
            <Skull className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tracking-tight text-white">
              Zombie<span className="font-bold text-rose-500">Love</span>Story
              <span className="font-mono text-xs text-slate-500">.ai</span>
            </span>
            <span className="hidden rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase sm:inline-block">
              Trend v2
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 sm:flex">
          <LocaleSelector />
          <ThemeToggle />
          {user ? (
            <SiteUserMenu
              name={user.name || 'User'}
              email={user.email}
              image={user.image}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                Sign Up
              </Link>
            </div>
          )}

          <a
            href="/#pricing"
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-rose-500"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Pre-order · $6.99</span>
          </a>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex p-2 text-slate-400 hover:text-white lg:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-border border-b bg-[#010103] px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="py-1 text-sm font-medium text-slate-300 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <div className="border-border flex items-center justify-between border-t pt-3">
              {user ? (
                <SiteUserMenu
                  name={user.name || 'User'}
                  email={user.email}
                  image={user.image}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/sign-in"
                    className="text-xs font-medium text-slate-300 hover:text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="text-xs font-medium text-slate-300 hover:text-white"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
              <a
                href="/#pricing"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Zap className="h-3 w-3" />
                <span>Pre-order · $6.99</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
