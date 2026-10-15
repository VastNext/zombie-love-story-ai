import React, { useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Film,
  Heart,
  HelpCircle,
  Loader2,
  Mail,
  Share2,
  ShieldCheck,
  Skull,
  Sliders,
  Sparkles,
  Upload,
  User,
  Video,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { apiPost } from '@/lib/api-client';

export function Hero() {
  const { data: session } = useSession();
  const router = useRouter();

  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo1Name, setPhoto1Name] = useState<string>('');
  const [photo2Name, setPhoto2Name] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [storyPreset, setStoryPreset] = useState<'couple' | 'dog' | 'comrades'>(
    'couple'
  );

  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(
    null
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    productId: string;
    name: string;
    price: string;
    videos: string;
    discount?: string;
  } | null>(null);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (slot === 1) {
          setPhoto1(event.target?.result as string);
          setPhoto1Name(file.name);
        } else {
          setPhoto2(event.target?.result as string);
          setPhoto2Name(file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIndex(index);
    setTimeout(() => setCopiedPromptIndex(null), 2000);
  };

  const openCheckout = (plan: {
    productId: string;
    name: string;
    price: string;
    videos: string;
    discount?: string;
  }) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  // Real Stripe Checkout Trigger
  const handleStripeCheckout = async () => {
    if (!selectedPlan) return;

    // If not signed in, guide user to sign in first with return redirect
    if (!session?.user) {
      toast.info('Please sign in or create an account to secure your order.');
      router.push(`/sign-in?redirect=/#pricing`);
      return;
    }

    try {
      setIsRedirectingToStripe(true);
      const res = await apiPost<{ url?: string; orderNo?: string }>(
        '/api/payment/checkout',
        {
          product_id: selectedPlan.productId,
          redirect: '/settings/payments',
        }
      );

      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.success('Order created successfully!');
        router.push('/settings/payments');
      }
    } catch (err: any) {
      toast.error(
        err?.message ||
          'Payment initiation failed. Please check Stripe configuration in admin panel.'
      );
    } finally {
      setIsRedirectingToStripe(false);
    }
  };

  const longTailKeywords = [
    { tag: 'zombie love story ai', desc: 'Original Viral Trend Concept' },
    { tag: 'ai zombie video trend', desc: 'TikTok & Reels Editing Formula' },
    {
      tag: 'zombie match cut ai video',
      desc: 'Hard Match-Cut Technical Prompt',
    },
    { tag: 'ai zombie video generator', desc: 'Two-Photo Web Rendering Tool' },
    { tag: 'zombie dog trend', desc: 'Loyal Pet Reunion Storyline' },
    { tag: 'zombie pet ai video', desc: 'Dog & Cat Memory Rescue Match-Cut' },
    {
      tag: 'zombie love story ai prompt',
      desc: 'Copyable Prompts for Kling & Luma',
    },
    {
      tag: 'zombie love story reels editing',
      desc: 'Instagram & CapCut Audio Workflow',
    },
  ];

  const promptsList = [
    {
      keyword: 'zombie love story ai prompt',
      title: '1. The Viral Match-Cut: Romantic Couple (25-Second Cinematic)',
      badge: 'Most Viral',
      targetTools: 'Luma Dream Machine, Kling 1.5, Runway Gen-3, Sora',
      description:
        'Survivor lowers defense in a ruined shelter; infected lover lunges; instantaneous match cut at the collision frame into a sunlit meadow.',
      prompt: `[SHOT 1 - Post-Apocalyptic Ruins (0-10s)]: Cold volumetric blue light through shattered concrete window. Subject 1 (survivor) aims weapon with trembling hands, crying. Subject 2 approaches with milky pale eyes, dark veins, torn clothing, walking with unstable zombie gait. At 7s, Subject 1 lowers the weapon and steps forward with wide open arms. Subject 2 lunges forward into an embrace. Right at 10.0s as their shoulders collide and hands grasp each other:
[MATCH-CUT at 10.0s]: Seamless hard transition preserving exact physical momentum and contact point into:
[SHOT 2 - Radiant Golden Meadow (10-25s)]: Warm sunset lighting over alpine wildflower meadow. Both subjects are 100% healthy, smiling through joyful tears, spinning in a tight emotional hug. 720p/1080p, natural ambient wind and footsteps audio, cinematic 35mm lens.`,
    },
    {
      keyword: 'zombie dog trend / zombie pet ai video',
      title: '2. Zombie Dog Match Cut: Pet Memory Rescue (15-Second Story)',
      badge: 'Pet Edition',
      targetTools: 'Kling 1.5, Minimax Hailuo, Pika 2.0',
      description:
        'Dedicated to the pet trend: infected dog lunges down a desolate hallway, continuing the airborne trajectory into a joyful sunny backyard jump.',
      prompt: `[Act 1 (0-8s)]: Dark desolate corridor. Owner (Subject 1) kneels with tears in eyes. Infected dog (Subject 2, cloudy eyes, matted fur, restrained infection styling) accelerates and leaps into the air toward owner's chest. Owner keeps both arms wide open without flinching.
[Hard Match-Cut at 8.0s]: Same airborne trajectory and reaching paws connect immediately into:
[Act 2 (8-15s)]: Lush golden hour backyard. Dog is completely healthy and clean, landing happily in owner's loving embrace, tail wagging eagerly. Highly realistic fur textures, emotional depth of field, 9:16 vertical video.`,
    },
    {
      keyword: 'zombie love story reels editing',
      title: '3. Apocalypse Brothers / Comrades Match-Cut',
      badge: 'Brothers / Friendship',
      targetTools: 'Kling 1.5, Luma, Midjourney V6 to Video',
      description:
        'Two military survivors separated by infection, reuniting at a nostalgic pre-war campfire.',
      prompt: `[Act 1 - Military Bunker (0-10s)]: Flickering red emergency sirens. Soldier A drops tactical rifle, pulling infected Comrade Soldier B into a tight helmet-to-shoulder grasp.
[Hard Match-Cut at 10.0s]: The grasp continues seamlessly into:
[Act 2 - Lakeside Campfire (10-25s)]: Warm campfire glow at dusk, both healthy comrades laughing heartily, clinking canteen mugs in everlasting brotherhood. Photorealistic, 8k cinematic lighting.`,
    },
  ];

  return (
    <div className="flex w-full flex-col items-center">
      {/* Top Notice Banner */}
      <div className="border-border text-muted-foreground flex w-full items-center justify-center gap-2 border-b bg-[#0c0e14] px-4 py-2 text-center text-xs">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-rose-500" />
        <span>
          GPU Batch Pipeline v2.4 in closed beta. Lock in{' '}
          <strong className="font-semibold text-rose-400">
            $6.99 Early Access Pass
          </strong>{' '}
          before public launch price ($12.99).
        </span>
      </div>

      {/* Hero Header Pitch */}
      <section className="flex w-full max-w-5xl flex-col items-center px-6 pt-16 pb-12 text-center">
        <div className="bg-surface-1 border-border text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span>The #1 Viral Trend on TikTok & Instagram Reels</span>
          <span className="text-muted-foreground/60">|</span>
          <span className="text-amber-400">Match-Cut Formula</span>
        </div>

        <h1 className="text-foreground max-w-4xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl md:text-7xl">
          Two Photos. One Fatal Virus.{' '}
          <span className="bg-gradient-to-r from-rose-500 via-rose-300 to-amber-300 bg-clip-text text-transparent">
            One Eternal Embrace.
          </span>
        </h1>

        <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-relaxed sm:text-lg">
          Recreate the viral{' '}
          <strong className="text-foreground">zombie love story ai</strong>{' '}
          match-cut video: an impending infected attack turns into an emotional,
          sunlit reunion embrace.
        </p>

        <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-2.5 font-mono text-xs">
          <span className="bg-surface-1 border-border flex items-center gap-1.5 rounded border px-3 py-1">
            <User className="h-3.5 w-3.5 text-rose-400" /> 2 Photos Required
          </span>
          <span className="bg-surface-1 border-border flex items-center gap-1.5 rounded border px-3 py-1">
            <Film className="h-3.5 w-3.5 text-amber-400" /> 25s 720P Match-Cut
          </span>
          <span className="bg-surface-1 border-border flex items-center gap-1.5 rounded border px-3 py-1">
            <Video className="h-3.5 w-3.5 text-cyan-400" /> 9:16 & 16:9 Formats
          </span>
          <span className="bg-surface-1 border-border flex items-center gap-1.5 rounded border px-3 py-1">
            <CreditCard className="h-3.5 w-3.5 text-emerald-400" /> $6.99
            One-Time (No Sub)
          </span>
        </div>
      </section>

      {/* Generator Interactive Box */}
      <section id="generator" className="w-full max-w-4xl px-4 py-6">
        <div className="bg-card/90 border-border relative overflow-hidden rounded-2xl border p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="border-border flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold sm:text-xl">
                <Sparkles className="h-4 w-4 text-rose-500" />
                AI Match-Cut Video Generator
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Assign character roles and select aspect ratio for your story.
              </p>
            </div>

            <div className="bg-background border-border flex items-center gap-1.5 rounded-lg border p-1 text-xs">
              <button
                type="button"
                onClick={() => setStoryPreset('couple')}
                className={`cursor-pointer rounded px-3 py-1 font-medium transition-all ${
                  storyPreset === 'couple'
                    ? 'border border-rose-500/30 bg-rose-600/30 text-rose-300'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                💑 Couple Story
              </button>
              <button
                type="button"
                onClick={() => setStoryPreset('dog')}
                className={`cursor-pointer rounded px-3 py-1 font-medium transition-all ${
                  storyPreset === 'dog'
                    ? 'border border-amber-500/30 bg-amber-600/30 text-amber-300'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🐕 Pet / Dog Trend
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Photo 1 */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                  <User className="h-3.5 w-3.5 text-cyan-400" /> Photo 1 · Human
                  Survivor
                </span>
                <span className="text-muted-foreground text-[11px]">
                  You / Protagonist
                </span>
              </div>
              <label className="border-border bg-background group relative flex h-60 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border transition-all hover:border-slate-500">
                {photo1 ? (
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo1}
                      alt="Survivor portrait"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload className="mb-1 h-5 w-5 text-cyan-400" />
                      Click to Replace Photo
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-surface-2 border-border mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border transition-transform group-hover:scale-105">
                      <Upload className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span className="text-foreground text-xs font-medium">
                      Upload Human Portrait
                    </span>
                    <span className="text-muted-foreground mt-1 text-[11px]">
                      Clear face, balanced lighting (JPG, PNG, WebP)
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 1)}
                />
              </label>
              {photo1Name && (
                <span className="mt-1.5 flex items-center gap-1 truncate font-mono text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {photo1Name}
                </span>
              )}
            </div>

            {/* Photo 2 */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                  <Skull className="h-3.5 w-3.5 text-rose-500" /> Photo 2 ·{' '}
                  {storyPreset === 'dog'
                    ? 'Your Dog or Cat'
                    : 'Partner / Lover'}
                </span>
                <span className="text-[11px] text-rose-400">
                  Infected → Restored in Memory
                </span>
              </div>
              <label className="border-border bg-background group relative flex h-60 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border transition-all hover:border-slate-500">
                {photo2 ? (
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo2}
                      alt="Partner or pet portrait"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload className="mb-1 h-5 w-5 text-rose-400" />
                      Click to Replace Photo
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-surface-2 border-border mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border transition-transform group-hover:scale-105">
                      <Upload className="h-5 w-5 text-rose-500" />
                    </div>
                    <span className="text-foreground text-xs font-medium">
                      {storyPreset === 'dog'
                        ? 'Upload Dog or Cat Photo'
                        : 'Upload Partner Photo'}
                    </span>
                    <span className="text-muted-foreground mt-1 text-[11px]">
                      Healthy photo is enough (AI generates zombie state)
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 2)}
                />
              </label>
              {photo2Name && (
                <span className="mt-1.5 flex items-center gap-1 truncate font-mono text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {photo2Name}
                </span>
              )}
            </div>
          </div>

          <div className="border-border bg-background mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border p-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Sliders className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-foreground text-xs font-medium">
                Aspect Ratio:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`cursor-pointer rounded px-3.5 py-1.5 text-xs font-medium transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📱 9:16 Vertical (Reels / TikTok / Shorts)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`cursor-pointer rounded px-3.5 py-1.5 text-xs font-medium transition-all ${
                  aspectRatio === '16:9'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🖥️ 16:9 Landscape (YouTube)
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={() => {
                if (!photo1 || !photo2) {
                  toast.error(
                    'Please upload both Photo 1 and Photo 2 to proceed.'
                  );
                  return;
                }
                openCheckout({
                  productId: 'zombie_single',
                  name:
                    storyPreset === 'dog'
                      ? 'Zombie Pet Pass (15s Video)'
                      : 'Single Video Pass (25s Video)',
                  price: '$6.99',
                  videos: '1 HD Video',
                });
              }}
              className="group flex w-full min-w-[320px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 px-8 py-3.5 text-center text-xs font-semibold text-white shadow-lg shadow-rose-950/40 transition-all hover:from-rose-500 hover:to-amber-500 sm:w-auto sm:text-sm"
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span>Queue Up & Generate Video · $6.99</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <div className="text-muted-foreground mt-3 flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />{' '}
                One-time payment
              </span>
              <span>•</span>
              <span>No recurring subscription</span>
              <span>•</span>
              <span>14-day private cloud link</span>
            </div>
          </div>
        </div>
      </section>

      {/* Narrative Match-Cut Breakdown */}
      <section id="storyboard" className="w-full max-w-5xl px-6 py-20">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="font-mono text-xs tracking-wider text-rose-400 uppercase">
            Cinematic Architecture
          </span>
          <h2 className="text-foreground mt-1 text-3xl font-semibold tracking-tight">
            The Anatomy of the Viral Match-Cut
          </h2>
          <p className="text-muted-foreground mt-3 text-xs sm:text-sm">
            Why this video trend captures millions of views: the physical
            collision of impending terror and nostalgic love.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-card border-border flex flex-col justify-between rounded-xl border p-6">
            <div>
              <div className="mb-2 font-mono text-[11px] font-semibold tracking-wider text-rose-400 uppercase">
                00:00 – 00:08 · Act I: The Horror
              </div>
              <h3 className="text-foreground mb-2 text-base font-semibold">
                1. Confronting The Infected
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Ruined room, cold dust and darkness. Survivor aims with shaking
                hands, facing their infected partner slowly staggering forward.
              </p>
            </div>
            <div className="border-border text-muted-foreground mt-6 border-t pt-4 font-mono text-[11px]">
              Prompt Anchor: Pale milky eyes, grey veins, laboured breath.
            </div>
          </div>

          <div className="bg-card relative flex flex-col justify-between rounded-xl border-2 border-rose-500/40 p-6 shadow-lg shadow-rose-950/20">
            <div className="absolute -top-3 right-4 rounded bg-rose-600 px-2 py-0.5 font-mono text-[10px] text-white uppercase">
              The Match-Cut Pivot
            </div>
            <div>
              <div className="mb-2 font-mono text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
                00:08 – 00:10 · Act II: The Surrender
              </div>
              <h3 className="text-foreground mb-2 text-base font-semibold">
                2. Arms Wide Open
              </h3>
              <p className="text-xs leading-relaxed text-slate-200">
                Instead of shooting or fleeing, the survivor drops all weapons
                and opens both arms. The infected lunges for the kill.
              </p>
            </div>
            <div className="border-border mt-6 border-t pt-4 font-mono text-[11px] text-amber-300">
              Hard Cut Frame: Body collision & shoulder grasp at 10.0s.
            </div>
          </div>

          <div className="bg-card border-border flex flex-col justify-between rounded-xl border p-6">
            <div>
              <div className="mb-2 font-mono text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                00:10 – 00:25 · Act III: The Memory
              </div>
              <h3 className="text-foreground mb-2 text-base font-semibold">
                3. Golden Alpine Meadow
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                The exact physical momentum continues in a sunny mountain
                meadow. Both are healthy and smiling through tears in an eternal
                hug.
              </p>
            </div>
            <div className="border-border text-muted-foreground mt-6 border-t pt-4 font-mono text-[11px]">
              Emotional Payoff: Endless nostalgic love transcends death.
            </div>
          </div>
        </div>
      </section>

      {/* Free Prompt Library */}
      <section
        id="prompts"
        className="border-border w-full max-w-5xl border-t px-6 py-16"
      >
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="font-mono text-xs tracking-wider text-amber-400 uppercase">
              Keyword: zombie love story ai prompt
            </span>
            <h2 className="text-foreground mt-1 text-3xl font-semibold tracking-tight">
              Curated AI Video Prompt Recipes
            </h2>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Compatible with Sora, Kling 1.5, Luma Dream Machine, Runway Gen-3,
              and Seedance. Copy and run directly in your own tools.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {promptsList.map((item, idx) => (
            <div
              key={idx}
              className="bg-card border-border rounded-xl border p-6 transition-all hover:border-slate-700"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-400">
                      {item.badge}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {item.targetTools}
                    </span>
                  </div>
                  <h3 className="text-foreground mt-1.5 text-base font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() => handleCopyPrompt(item.prompt, idx)}
                  className="bg-surface-2 hover:bg-surface-3 text-foreground border-border flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-lg border px-3 py-1.5 text-xs font-medium transition-all sm:self-center"
                >
                  {copiedPromptIndex === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="text-muted-foreground h-3.5 w-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-background border-border text-muted-foreground mt-4 rounded-lg border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
                {item.prompt}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Long-Tail Keywords Matrix */}
      <section
        id="longtail"
        className="border-border w-full max-w-5xl border-t px-6 py-16"
      >
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="font-mono text-xs tracking-wider text-cyan-400 uppercase">
            Trend Ecosystem
          </span>
          <h2 className="text-foreground mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Explore All Zombie AI Trend Variations
          </h2>
          <p className="text-muted-foreground mt-2 text-xs">
            From TikTok couple stories to Instagram pet rescue match-cuts,
            browse how creators build their videos.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {longTailKeywords.map((kw, i) => (
            <div
              key={i}
              className="bg-card border-border flex flex-col justify-between rounded-lg border p-3.5 transition-colors hover:border-slate-600"
            >
              <div className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                <Bookmark className="h-3 w-3 shrink-0 text-rose-500" />
                <span className="truncate">{kw.tag}</span>
              </div>
              <span className="text-muted-foreground mt-2 block text-[10px]">
                {kw.desc}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing / Early Access Passes */}
      <section
        id="pricing"
        className="border-border w-full max-w-5xl border-t px-6 py-20"
      >
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="font-mono text-xs tracking-wider text-emerald-400 uppercase">
            Transparent Pricing
          </span>
          <h2 className="text-foreground mt-1 text-3xl font-semibold tracking-tight">
            One-Time Early Access Passes
          </h2>
          <p className="text-muted-foreground mt-2 text-xs sm:text-sm">
            No subscription traps. Pay once per video pass with priority queue
            rendering locked in for early supporters.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {/* Plan 1 */}
          <div className="bg-card border-border flex flex-col justify-between rounded-2xl border p-7">
            <div>
              <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                Casual Single
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-foreground text-3xl font-bold">
                  $6.99
                </span>
                <span className="text-muted-foreground text-xs">
                  / one-time
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Create one 25-second couple or 15-second pet match-cut reel.
              </p>

              <ul className="text-muted-foreground mt-6 space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> 1×
                  25-Second 720P HD Video
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{' '}
                  9:16 Portrait or 16:9 Landscape
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{' '}
                  Built-in Natural Scene Audio
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{' '}
                  14-Day Media Cloud Retention
                </li>
              </ul>
            </div>

            <button
              onClick={() =>
                openCheckout({
                  productId: 'zombie_single',
                  name: 'Single Video Pass',
                  price: '$6.99',
                  videos: '1 HD Video',
                })
              }
              className="bg-surface-2 hover:bg-surface-3 border-border text-foreground mt-8 w-full cursor-pointer rounded-lg border py-2.5 text-xs font-medium transition-colors"
            >
              Get 1 Video Pass ($6.99)
            </button>
          </div>

          {/* Plan 2: Most Popular */}
          <div className="bg-card relative flex flex-col justify-between rounded-2xl border-2 border-rose-500/60 p-7 shadow-xl shadow-rose-950/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-3 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase shadow">
              Best Value (Save 30%)
            </div>

            <div>
              <span className="font-mono text-xs tracking-wider text-rose-400 uppercase">
                Storyteller 3-Pack
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-foreground text-3xl font-bold">
                  $14.99
                </span>
                <span className="text-muted-foreground text-xs">
                  / 3 videos ($4.99/ea)
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Test couple, pet dog, and friendship variations to maximize
                reach.
              </p>

              <ul className="text-muted-foreground mt-6 space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-rose-400" /> 3×
                  25-Second 720P HD Videos
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-rose-400" />{' '}
                  Priority GPU Render Queue
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-rose-400" /> Both
                  9:16 and 16:9 Renders
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-rose-400" />{' '}
                  Private Discord Prompt Guide
                </li>
              </ul>
            </div>

            <button
              onClick={() =>
                openCheckout({
                  productId: 'zombie_bundle',
                  name: 'Storyteller 3-Video Bundle',
                  price: '$14.99',
                  videos: '3 HD Videos ($4.99/ea)',
                  discount: 'Save 30%',
                })
              }
              className="mt-8 w-full cursor-pointer rounded-lg bg-rose-600 py-2.5 text-xs font-medium text-white shadow-md shadow-rose-950 transition-all hover:bg-rose-500"
            >
              Claim 3-Video Bundle ($14.99)
            </button>
          </div>

          {/* Plan 3 */}
          <div className="bg-card border-border flex flex-col justify-between rounded-2xl border p-7">
            <div>
              <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                Creator Agency
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-foreground text-3xl font-bold">
                  $29.99
                </span>
                <span className="text-muted-foreground text-xs">
                  / 8 videos
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                For creators running multiple accounts, client edits, or agency
                campaigns.
              </p>

              <ul className="text-muted-foreground mt-6 space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> 8×
                  25-Second 720P HD Videos
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{' '}
                  Full Commercial Resell Rights
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{' '}
                  Instant VIP Queue Priority
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{' '}
                  Permanent Cloud Storage
                </li>
              </ul>
            </div>

            <button
              onClick={() =>
                openCheckout({
                  productId: 'zombie_agency',
                  name: 'Creator Agency Pass',
                  price: '$29.99',
                  videos: '8 HD Videos',
                })
              }
              className="bg-surface-2 hover:bg-surface-3 border-border text-foreground mt-8 w-full cursor-pointer rounded-lg border py-2.5 text-xs font-medium transition-colors"
            >
              Get Creator Pass ($29.99)
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="border-border w-full max-w-4xl border-t px-6 py-16"
      >
        <div className="mb-12 text-center">
          <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
            Answers & Help
          </span>
          <h2 className="text-foreground mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          <div className="bg-card border-border rounded-xl border p-5">
            <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 text-rose-500" />
              What is the Zombie Love Story AI trend?
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              It is a viral cinematic video format on TikTok and Reels. It uses
              two reference photos: one represents a human survivor, and the
              other represents an infected lover or pet. The video begins with
              an impending zombie attack, but instead of fleeing, the survivor
              embraces the zombie, triggering a hard match-cut transition into a
              sunlit memory of them happily together.
            </p>
          </div>

          <div className="bg-card border-border rounded-xl border p-5">
            <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 text-rose-500" />
              Do I need to upload photos of someone dressed as a zombie?
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              No. You only need normal, healthy photos with clear facial
              features. The AI model automatically transforms Photo 2 into the
              infected state for the first 10 seconds of the film, and restores
              their healthy appearance in the memory sequence.
            </p>
          </div>

          <div className="bg-card border-border rounded-xl border p-5">
            <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 text-rose-500" />
              Can I use this for dogs and cats (Zombie Dog Trend)?
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Yes! The pet version is one of the highest-viewed variants of this
              trend. Simply select the &quot;Pet / Dog Trend&quot; preset at the
              top of the generator, upload your portrait as Photo 1 and your dog
              or cat as Photo 2.
            </p>
          </div>

          <div className="bg-card border-border rounded-xl border p-5">
            <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 text-rose-500" />
              How does the Early Access purchase work?
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Our automated GPU generation queue is rolling out in cohorts.
              Purchasing an Early Access pass guarantees your position at the
              top of the queue with lifetime locked-in pricing ($6.99 vs public
              launch price of $12.99). You will receive generation credits and
              private order management via your account dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Stripe Checkout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="bg-card border-border relative w-full max-w-md rounded-2xl border p-6 shadow-2xl sm:p-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4 cursor-pointer text-lg font-bold"
            >
              ×
            </button>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-foreground text-sm font-semibold">
                    {selectedPlan ? selectedPlan.name : 'Early Access Pass'}
                  </h3>
                  <p className="text-muted-foreground text-[11px]">
                    {selectedPlan
                      ? `${selectedPlan.price} · ${selectedPlan.videos}`
                      : 'Secure your video generation pass'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  <strong>Stripe Direct Checkout:</strong> You will be securely
                  redirected to Stripe to complete payment. Order credits will
                  be credited instantly upon payment confirmation.
                </span>
              </div>

              {session?.user ? (
                <div className="mt-5 space-y-4">
                  <div className="bg-background border-border rounded-lg border p-3 text-xs">
                    <span className="text-muted-foreground block text-[11px]">
                      Purchasing as:
                    </span>
                    <strong className="text-foreground">
                      {session.user.email}
                    </strong>
                  </div>

                  <button
                    onClick={handleStripeCheckout}
                    disabled={isRedirectingToStripe}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-950 transition-all hover:from-rose-500 hover:to-amber-500 disabled:opacity-50"
                  >
                    {isRedirectingToStripe ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Redirecting to Stripe...</span>
                      </>
                    ) : (
                      <>
                        <LockIcon className="h-3.5 w-3.5" />
                        <span>Pay {selectedPlan?.price} with Stripe</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Please sign in or register to link your purchase and video
                    delivery to your account.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href="/sign-in?redirect=/#pricing"
                      className="flex-1 rounded-lg bg-rose-600 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-rose-500"
                    >
                      Sign In to Buy
                    </Link>
                    <Link
                      href="/sign-up?redirect=/#pricing"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2 text-center text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                    >
                      Register Account
                    </Link>
                  </div>
                </div>
              )}

              <p className="text-muted-foreground mt-3 text-center font-mono text-[10px]">
                Secured by Stripe & 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width={18} height={11} x={3} y={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
