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

import { envConfigs } from '@/config';
import { formatZombiePrice } from '@/modules/zombie/types';
import { ZOMBIE_STORY_PROMPT } from '@/modules/zombie/video-spec';
import { apiPost } from '@/lib/api-client';

export function Hero() {
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
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [photo1File, setPhoto1File] = useState<File | null>(null);
  const [photo2File, setPhoto2File] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [testCode, setTestCode] = useState('');

  // 服务端模式：admin_test 只对管理员开放测试生成；live 走 Stripe 收款
  const [modeInfo, setModeInfo] = useState<{
    mode: string;
    canTest: boolean;
    canCheckout: boolean;
    generationPaused: boolean;
    priceCents: number;
  } | null>(null);

  const price = formatZombiePrice(modeInfo?.priceCents);

  React.useEffect(() => {
    fetch('/api/zombie/mode')
      .then((res) => res.json())
      .then((json) => setModeInfo(json?.data ?? null))
      .catch(() => setModeInfo(null));
  }, []);

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
          setPhoto1File(file);
        } else {
          setPhoto2(event.target?.result as string);
          setPhoto2Name(file.name);
          setPhoto2File(file);
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

  /** 记住本浏览器的订单入口（无账号用户也能找回）。 */
  const rememberOrder = (entry: {
    orderId: string;
    orderNo: string;
    accessToken: string;
  }) => {
    try {
      const raw = localStorage.getItem('zombie_orders');
      const list = raw ? JSON.parse(raw) : [];
      const next = [
        entry,
        ...list.filter((item: any) => item.orderId !== entry.orderId),
      ].slice(0, 20);
      localStorage.setItem('zombie_orders', JSON.stringify(next));
    } catch {
      throw new Error('无法保存私有订单入口，请允许浏览器本地存储后再支付。');
    }
  };

  const goToOrder = (orderId: string, accessToken: string) => {
    window.location.href = `/zombie/order#o=${encodeURIComponent(
      orderId
    )}&t=${encodeURIComponent(accessToken)}`;
  };

  // 真实生成入口：上传两图 → 建订单 → 管理员测试授权 / Stripe 收款
  const handleGenerate = async () => {
    if (!photo1File || !photo2File) {
      toast.error('Please upload both Photo 1 and Photo 2 to proceed.');
      return;
    }
    if (!modeInfo?.canTest && !modeInfo?.canCheckout) {
      toast.info('Generation is not open yet.');
      return;
    }
    if (modeInfo.canTest && !testCode.trim()) {
      toast.error('Enter the test code to start a test generation.');
      return;
    }

    try {
      setIsRedirectingToStripe(true);
      const direct =
        modeInfo?.mode === 'stripe_sandbox' || modeInfo?.mode === 'live';
      const form = new FormData();
      form.append('aspectRatio', aspectRatio);
      if (email.trim()) form.append('email', email.trim());
      form.append('photo1', photo1File);
      form.append('photo2', photo2File);

      const res = await fetch('/api/zombie/orders', {
        method: 'POST',
        ...(direct
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                aspectRatio,
                email: modeInfo?.mode === 'live' ? email.trim() : undefined,
                photos: [photo1File, photo2File].map(
                  ({ name, type, size }) => ({ name, type, size })
                ),
              }),
            }
          : { body: form }),
      });
      const json = await res.json().catch(() => {
        throw new Error(
          res.status === 413
            ? 'Photos exceed the server upload limit.'
            : 'Server returned an invalid response. Please try again.'
        );
      });
      if (json?.code !== 0 || !json?.data) {
        throw new Error(json?.message || 'Could not create order');
      }

      const { orderId, orderNo, accessToken } = json.data;
      rememberOrder({ orderId, orderNo, accessToken });

      if (modeInfo?.mode === 'live') {
        for (const [index, file] of [photo1File, photo2File].entries()) {
          const { uploadUrl } = await apiPost<{ uploadUrl: string }>(
            `/api/zombie/orders/${encodeURIComponent(orderId)}/upload`,
            {
              accessToken,
              slot: index + 1,
              photo: { name: file.name, type: file.type, size: file.size },
            }
          );
          const result = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type, 'If-None-Match': '*' },
            body: file,
          });
          if (!result.ok)
            throw new Error('Photo upload failed. Please try again.');
        }
      }

      // V1：管理员测试 —— 输入 Code 后跳过 Stripe 直接生成
      if (modeInfo?.canTest) {
        await apiPost('/api/zombie/admin-test', {
          orderId,
          code: testCode.trim(),
        });
        goToOrder(orderId, accessToken);
        return;
      }

      // V2：正式收款
      if (modeInfo?.canCheckout) {
        const result = await apiPost<{ checkoutUrl?: string }>(
          '/api/zombie/checkout',
          { orderId, accessToken }
        );
        if (result?.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }
        throw new Error('Could not start checkout');
      }

      toast.info('Coming soon — generation is not open yet.');
    } catch (err: any) {
      toast.error(err?.message || 'Generation could not be started.');
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
      prompt: ZOMBIE_STORY_PROMPT,
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
          Two portraits in, one cinematic match-cut out. One-time{' '}
          <strong className="font-semibold text-rose-400">{price}</strong> per
          video.
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
            <Film className="h-3.5 w-3.5 text-amber-400" /> Cinematic Match-Cut
          </span>
          <span className="bg-surface-1 border-border flex items-center gap-1.5 rounded border px-3 py-1">
            <Video className="h-3.5 w-3.5 text-cyan-400" /> 9:16 & 16:9 Formats
          </span>
          <span className="bg-surface-1 border-border flex items-center gap-1.5 rounded border px-3 py-1">
            <CreditCard className="h-3.5 w-3.5 text-emerald-400" /> {price}
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
                setIsModalOpen(true);
              }}
              disabled={!modeInfo?.canTest && !modeInfo?.canCheckout}
              className="group flex w-full min-w-[320px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 px-8 py-3.5 text-center text-xs font-semibold text-white shadow-lg shadow-rose-950/40 transition-all hover:from-rose-500 hover:to-amber-500 sm:w-auto sm:text-sm"
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span>
                {modeInfo?.mode === 'stripe_sandbox' && modeInfo.canCheckout
                  ? `Test payment · ${price} (sandbox)`
                  : `Generate Video · ${price}`}
              </span>
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

      {/* Sample video — only shown when a rights-cleared sample is configured */}
      <section id="sample" className="w-full max-w-5xl px-6 pt-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="font-mono text-xs tracking-wider text-rose-400 uppercase">
            See it first
          </span>
          <h2 className="text-foreground mt-1 text-3xl font-semibold tracking-tight">
            A real match-cut, end to end
          </h2>
        </div>
        {envConfigs.zombie_sample_video_url ? (
          <video
            src={envConfigs.zombie_sample_video_url}
            controls
            playsInline
            className="border-border mx-auto w-full max-w-md rounded-2xl border"
          />
        ) : (
          <div className="border-border bg-card mx-auto flex aspect-[9/16] w-full max-w-md items-center justify-center rounded-2xl border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Sample video coming soon. We publish a sample only once it is
              produced with our own pipeline and cleared for display.
            </p>
          </div>
        )}
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
            One video. One price.
          </h2>
          <p className="text-muted-foreground mt-2 text-xs sm:text-sm">
            No subscription traps. Pay once, get one zombie love story video.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <div className="bg-card border-border flex flex-col rounded-2xl border-2 border-rose-500/60 p-7 shadow-xl shadow-rose-950/20">
            <span className="font-mono text-xs tracking-wider text-rose-400 uppercase">
              Single Video
            </span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-foreground text-4xl font-bold">
                {price}
              </span>
              <span className="text-muted-foreground text-xs">/ one-time</span>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Two portraits in, one cinematic zombie love story match-cut out.
            </p>

            <ul className="text-muted-foreground mt-6 space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> 1×
                zombie love story video
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> 9:16
                Portrait or 16:9 Landscape
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> Two
                portraits: survivor + infected partner
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{' '}
                14-day private download link
              </li>
            </ul>

            <button
              onClick={() => {
                if (modeInfo?.canTest || modeInfo?.canCheckout) {
                  document
                    .getElementById('generator')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              disabled={!modeInfo?.canTest && !modeInfo?.canCheckout}
              className="mt-8 w-full cursor-pointer rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-950 transition-all hover:from-rose-500 hover:to-amber-500"
            >
              {modeInfo?.mode === 'stripe_sandbox' && modeInfo.canCheckout
                ? 'Test payment (sandbox)'
                : `Generate my video · ${price}`}
            </button>
            <p className="text-muted-foreground mt-3 text-center text-[10px]">
              No account required. Email optional for delivery.
            </p>
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
              How does a purchase work?
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Upload two portraits, pick 9:16 or 16:9, and pay {price} once.
              After payment is confirmed we generate your video and give you a
              private order page with a 14-day download link. No account is
              required, and an email is optional for delivery.
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
                    Zombie Love Story · {aspectRatio}
                  </h3>
                  <p className="text-muted-foreground text-[11px]">
                    {price} one-time · 1 video
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  {modeInfo?.canTest ? (
                    <>
                      <strong>Test generation:</strong> no charge. Enter the
                      test code to run a real generation on your account.
                    </>
                  ) : modeInfo?.mode === 'stripe_sandbox' &&
                    modeInfo.canCheckout ? (
                    <>
                      <strong>Stripe sandbox:</strong> test payment only. No
                      real charge or video generation.
                    </>
                  ) : modeInfo?.mode === 'live' ? (
                    <>
                      <strong>One-time payment.</strong> You will be redirected
                      to Stripe. Generation starts once payment is confirmed.
                    </>
                  ) : (
                    <>
                      <strong>Coming soon.</strong> Generation is not open to
                      the public yet.
                    </>
                  )}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {modeInfo?.mode !== 'stripe_sandbox' && (
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[11px]">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-background border-border text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-rose-500"
                    />
                    <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">
                      Add an email to receive your private video link. Leave it
                      blank and save the private link shown after checkout —
                      this browser can reopen the order from My orders.
                    </p>
                  </div>
                )}

                {modeInfo?.canTest && (
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[11px]">
                      Test code
                    </label>
                    <input
                      type="text"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value)}
                      placeholder="Test code"
                      className="bg-background border-border text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={isRedirectingToStripe}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-950 transition-all hover:from-rose-500 hover:to-amber-500 disabled:opacity-50"
                >
                  {isRedirectingToStripe ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Working…</span>
                    </>
                  ) : modeInfo?.canTest ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Start test generation</span>
                    </>
                  ) : modeInfo?.mode === 'stripe_sandbox' &&
                    modeInfo.canCheckout ? (
                    <>
                      <LockIcon className="h-3.5 w-3.5" />
                      <span>Test payment with Stripe</span>
                    </>
                  ) : (
                    <>
                      <LockIcon className="h-3.5 w-3.5" />
                      <span>Pay {price} with Stripe</span>
                    </>
                  )}
                </button>
              </div>

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
