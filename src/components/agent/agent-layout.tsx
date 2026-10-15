import { useEffect, useRef } from 'react';
import { Clapperboard, Pencil } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { usePathname, useRouter } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import {
  AgentHeaderProvider,
  useAgentHeader,
} from '@/components/agent/agent-header-context';
import { ChatsSidebar } from '@/components/agent/chats-sidebar';
import { PreviewPane } from '@/components/agent/preview-pane';
import {
  PreviewPaneProvider,
  usePreviewPane,
} from '@/components/agent/preview-pane-context';
import { Button } from '@/components/ui/button';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export function AgentLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const showPreview =
    pathname.includes('/chat/') || pathname.endsWith('/library');
  const signInRedirected = useRef(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (isPending) return;
    if (userId) {
      signInRedirected.current = false;
      return;
    }
    if (signInRedirected.current) return;
    signInRedirected.current = true;
    router.push('/sign-in');
  }, [isPending, userId, router]);

  if (isPending || !userId) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
      <PreviewPaneProvider>
        <AgentHeaderProvider>
          <ChatsSidebar />
          {/* No fixed h-dvh here: the inset carries `m-2` in inset variant, so
              pinning it to the full viewport height pushes its bottom margin
              off-screen. Stretching inside the h-dvh provider keeps the gap. */}
          <SidebarInset className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
            <AgentHeader showGallery={showPreview} />
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {children}
            </div>
          </SidebarInset>
          {showPreview && <PreviewPane />}
        </AgentHeaderProvider>
      </PreviewPaneProvider>
    </SidebarProvider>
  );
}

function AgentHeader({ showGallery }: { showGallery: boolean }) {
  const { content } = useAgentHeader();
  const { open, images, setOpen, clearMedia } = usePreviewPane();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      {content.title && (
        <div className="ml-2 flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-medium">{content.title}</span>
          {content.onEditClick && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={content.onEditClick}
              className="text-muted-foreground hover:text-foreground size-7 rounded-md"
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Page actions sit with the gallery toggle at the right edge. */}
      <div className="ml-auto flex items-center gap-1">
        {content.actions}
        {/* The pane has its own close button, so this only shows while it's
            hidden. */}
        {showGallery && !open && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              clearMedia();
              setOpen(true);
            }}
            aria-label={m['agent.preview.open_gallery']()}
            title={m['agent.preview.open_gallery']()}
            className="text-muted-foreground hover:text-foreground size-8 shrink-0 rounded-md"
          >
            <Clapperboard className="size-4" />
            {images.length > 0 && (
              <span className="text-muted-foreground ml-1 text-xs">
                {images.length}
              </span>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
