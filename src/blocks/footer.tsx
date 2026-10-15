import { LifeBuoy } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import {
  SiteFooter,
  type FooterColumn,
  type FooterSocial,
} from '@/components/site-footer';

export function Footer() {
  const columns: FooterColumn[] = [
    {
      title: m['landing.footer.features'](),
      links: [
        { label: m['landing.nav.create'](), href: '/chat' },
        { label: m['landing.footer.gallery'](), href: '/library' },
      ],
    },
    {
      title: m['landing.footer.products'](),
      links: [
        // Sibling products, not this one — a footer that links to the site
        // you are already on is just noise.
        { label: 'ShipAny', href: 'https://shipany.ai' },
        { label: 'ImgAny', href: 'https://imgany.ai' },
      ],
    },
    {
      title: m['landing.footer.legal'](),
      links: [
        { label: m['landing.footer.privacy'](), href: '/privacy-policy' },
        { label: m['landing.footer.terms'](), href: '/terms-of-service' },
      ],
    },
  ];

  const socials: FooterSocial[] = [
    {
      icon: LifeBuoy,
      href: '/settings/tickets',
      label: m['settings.tickets.title'](),
    },
  ];

  return (
    <SiteFooter
      tagline={m['landing.footer.tagline']()}
      columns={columns}
      socials={socials}
    />
  );
}
