import { useLayoutEffect, useRef } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';

import { useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import { SupportWidget } from '@/blocks/support-widget';

/**
 * Signed-in? Decided from the session cookie alone — `useSession()` would
 * round-trip to /api/auth/get-session first, leaving the landing page on
 * screen for as long as that takes. A stale cookie just means /chat's own
 * guard sends them to sign-in instead.
 */
function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .some((part) =>
      part.trim().split('=')[0].endsWith('better-auth.session_token')
    );
}

function HomePage() {
  const router = useRouter();
  const redirected = useRef(false);

  // Signed-in visitors get the app, not the pitch. Client-side (and at layout
  // time, before paint) so the landing page still renders — and indexes — for
  // everyone else.
  useLayoutEffect(() => {
    if (redirected.current || !hasSessionCookie()) return;
    redirected.current = true;
    router.push('/chat');
  }, [router]);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

export const Route = createFileRoute('/')({
  // Client-side navigations to "/" (the logo, a back button) never render the
  // landing page at all. SSR has no document, so it falls through to the
  // component's hydration-time check.
  beforeLoad: () => {
    if (hasSessionCookie()) throw redirect({ to: '/chat' });
  },
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/`, { locale: loc as any }).href;
    return {
      meta: [
        {
          name: 'description',
          content: m['landing.hero.subheadline']({}, { locale: locale as any }),
        },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
  component: HomePage,
});
