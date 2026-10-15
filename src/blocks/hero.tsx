import { PromptLauncher } from '@/components/agent/prompt-launcher';

export function Hero() {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden px-4 py-16 sm:py-20">
      <PromptLauncher className="mx-auto max-w-6xl" />
    </section>
  );
}
