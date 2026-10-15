import { Film } from 'lucide-react';

import { cn } from '@/lib/utils';

/** video-lite does not ship model marks, so both catalog entries stay neutral. */
export function ModelLogo({
  model: _model,
  className,
}: {
  model: string;
  className?: string;
}) {
  return <Film className={cn('text-foreground', className)} />;
}
