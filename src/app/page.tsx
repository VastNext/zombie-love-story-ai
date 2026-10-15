"use client";

import React, { useState } from "react";
import {
  Upload,
  Play,
  Sparkles,
  Heart,
  Video,
  Copy,
  Check,
  CreditCard,
  Film,
  Zap,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  ChevronRight,
  User,
  Skull,
  Mail,
  AlertCircle
} from "lucide-react";

export default function Home() {
  // State for image uploads
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo1Name, setPhoto1Name] = useState<string>("");
  const [photo2Name, setPhoto2Name] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  // Modal State for Early Access / Payment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"checkout" | "waitlist">("checkout");
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string; videos: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // File upload handlers
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

  const openCheckout = (plan: { name: string; price: string; videos: string }) => {
    setSelectedPlan(plan);
    setModalType("checkout");
    setPaymentSuccess(false);
    setIsModalOpen(true);
  };

  const openWaitlist = () => {
    setModalType("waitlist");
    setPaymentSuccess(false);
    setIsModalOpen(true);
  };

  const promptsList = [
    {
      title: "Master Match-Cut: Couple (Lover to Memory)",
      description: "The viral TikTok & Reels formula: Human lover faces infected partner in ruins, drops defense to embrace, match-cut into sunlit golden meadow.",
      prompt: `[Scene 1 - Ruined Shelter (0-10s)]: Dark abandoned concrete building, dust motes in cold volumetric light. Subject 1 (survivor) holds weapon with shaking hands, crying. Subject 2 approaches with milky pale eyes, grey veins, torn clothes, moving slowly with zombie gait. At 7s, Subject 1 lowers hands, stepping forward with open arms. Subject 2 lunges for an embrace. Right as their bodies collide and hands grasp shoulders at 10.0s [HARD MATCH-CUT]:
[Scene 2 - Sunny Meadow (10-25s)]: Exactly same physical contact angle and momentum seamlessly continues in a vibrant golden sunlit alpine meadow with wildflowers. Both subjects are completely healthy, glowing, dressed in clean casual clothes. The embrace turns into a warm, joyful spinning hug, laughing through happy tears. High-fidelity cinematic 4k render, photorealistic, natural ambient footsteps and outdoor wind sound, emotional acoustic soundtrack.`
    },
    {
      title: "Pet Match-Cut: Loyal Dog / Cat Rescue",
      description: "Owner faces infected pet lunging in an abandoned hallway, transforming into a playful sunny park jump.",
      prompt: `[Act 1 (0-9s)]: Desolate apocalypse hallway. Owner kneels with tearful eyes. Infected dog (Subject 2, pale eyes, matted fur, slight snarling posture) accelerates and leaps toward owner's chest. Owner keeps arms wide open in total acceptance.
[Match Cut at 9.0s]: Same airborne arc connects directly into a radiant golden hour backyard. Dog is completely healthy, tail wagging, leaping into owner's arms with enthusiastic barks and loving embrace. Cinematic film grain, emotional depth of field, 720p 9:16 vertical.`
    },
    {
      title: "Apocalypse Siblings / Comrades Tribute",
      description: "Two frontline survivors parted by infection, reuniting in pre-war campfire memories.",
      prompt: `[Act 1]: Broken bunker corridor, cold blue emergency lights. Soldier A confronts infected comrade Soldier B. Hands trembling, Soldier A drops tactical rifle, pulls Soldier B into a helmet-to-helmet shoulder embrace.
[Match Cut at 10s]: Cut seamlessly onto a peaceful lakeside campfire at dusk. Both soldiers healthy, laughing, clinking canteen mugs in brotherhood. Photorealistic cinematic lighting, match cut on shoulder contact.`
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans film-grain">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 radial-glow z-0" />
      <div className="pointer-events-none absolute inset-0 amber-glow z-0" />

      {/* Navigation */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#07090e]/80 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Skull className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-lg text-white">
              Zombie<span className="text-rose-500">Love</span>Story
            </span>
            <span className="ml-2 text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              AI Generator
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#generator" className="hover:text-white transition-colors">
            Generator
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#prompts" className="hover:text-white transition-colors">
            Prompt Library
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Early Access Pricing
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openCheckout({ name: "Single Video Pass", price: "$6.99", videos: "1 HD Video" })}
            className="text-xs md:text-sm font-semibold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-rose-900/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Pre-order Pass ($6.99)</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-6xl px-4 pt-16 pb-12 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-xs text-rose-400 font-medium mb-6 backdrop-blur">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            The #1 Viral Trend on TikTok, Instagram Reels & YouTube Shorts
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.08]">
            Two Photos. One Fatal Apocalypse.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400">
              One Eternal Embrace.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
            Upload your portrait and your loved one&apos;s photo. Recreate the viral
            match-cut short film: an infected lunging attack transforms into an emotional, sunlit reunion embrace.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <User className="w-3.5 h-3.5 text-rose-400" /> 2 Photos Required
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Film className="w-3.5 h-3.5 text-amber-400" /> 25s Cinematic Match-Cut
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Video className="w-3.5 h-3.5 text-cyan-400" /> 9:16 Vertical & 16:9
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> $6.99 One-Time (No Sub)
            </span>
          </div>
        </section>

        {/* Generator Interactive Box */}
        <section id="generator" className="w-full max-w-4xl px-4 py-8">
          <div className="rounded-3xl border border-slate-800 bg-[#0d111a]/90 backdrop-blur-xl p-6 sm:p-10 shadow-2xl shadow-black/80 relative overflow-hidden">
            {/* Top Badge: Coming Soon status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                  AI Match-Cut Video Generator
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Assign character roles and select aspect ratio for your story.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                GPU Node Pipeline in Beta (Coming Soon)
              </div>
            </div>

            {/* Upload Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Photo 1: Survivor */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-cyan-400" /> Photo 1 · Human Survivor
                  </span>
                  <span className="text-[11px] text-slate-500">You / Protagonist</span>
                </div>
                <label className="group relative flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-900/50 hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden">
                  {photo1 ? (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo1}
                        alt="Survivor portrait"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-xs font-semibold text-white">
                        <Upload className="w-6 h-6 mb-1 text-cyan-400" />
                        Click to Replace Photo
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-cyan-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-200">
                        Upload Human Portrait
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        Clear face, natural lighting (PNG, JPG, WebP)
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
                  <span className="text-[11px] text-slate-400 mt-1 truncate">
                    ✓ {photo1Name}
                  </span>
                )}
              </div>

              {/* Photo 2: Partner / Infected */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Skull className="w-4 h-4 text-rose-500" /> Photo 2 · Partner / Pet
                  </span>
                  <span className="text-[11px] text-rose-400">Becomes Zombie then Healthy</span>
                </div>
                <label className="group relative flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-700 hover:border-rose-500/60 bg-slate-900/50 hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden">
                  {photo2 ? (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo2}
                        alt="Partner portrait"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-xs font-semibold text-white">
                        <Upload className="w-6 h-6 mb-1 text-rose-400" />
                        Click to Replace Photo
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-rose-500" />
                      </div>
                      <span className="text-sm font-semibold text-slate-200">
                        Upload Partner or Pet
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        Ordinary healthy photo is enough (AI applies zombie VFX)
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
                  <span className="text-[11px] text-slate-400 mt-1 truncate">
                    ✓ {photo2Name}
                  </span>
                )}
              </div>
            </div>

            {/* Video Format Controls */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">
                Render Format:
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                    aspectRatio === "9:16"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-950"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  📱 9:16 Vertical (Reels / TikTok / Shorts)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                    aspectRatio === "16:9"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-950"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  🖥️ 16:9 Landscape (YouTube)
                </button>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8 flex flex-col items-center">
              <button
                onClick={() => {
                  if (!photo1 || !photo2) {
                    alert("Please upload both Photo 1 and Photo 2 first!");
                    return;
                  }
                  openWaitlist();
                }}
                className="w-full sm:w-auto min-w-[280px] text-center font-bold text-base bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white py-4 px-8 rounded-2xl shadow-xl shadow-rose-950/60 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-white animate-spin" />
                <span>Queue Up & Generate Video ($6.99)</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[12px] text-slate-500 mt-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                One-time payment • No subscription • Private delivery link
              </p>
            </div>
          </div>
        </section>

        {/* Narrative Match-Cut Breakdown */}
        <section id="how-it-works" className="w-full max-w-5xl px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              The Anatomy of the Viral Match-Cut
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Why this video trend captures millions of views: the physical collision of fear and nostalgia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
              <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">
                00:00 – 00:08 · The Terror
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                1. Confronting The Infected
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Cold ruins, dust in the air. The survivor faces the infected partner slowly approaching. Tears flow, but fear paralyzes.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
                Visual focus: Pale milky eyes, subtle grey veins, heavy breathing.
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/40 to-slate-900/80 border border-rose-500/40 flex flex-col shadow-lg shadow-rose-950/20">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
                00:08 – 00:10 · The Choice
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                2. Dropping Defenses
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Rather than shooting or running, the survivor drops weapons and extends both arms. The infected lunges forward into the embrace.
              </p>
              <div className="mt-4 pt-4 border-t border-rose-900/40 text-xs text-amber-300">
                The turning point: The body impact creates the exact frame for the match cut.
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
                00:10 – 00:25 · The Memory
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                3. The Golden Meadow
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                At the collision frame, surroundings hard-cut to warm summer mountains. Both characters are healthy, spinning in an emotional reunion.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
                Ending feeling: Unforgettable heartbreak and enduring love.
              </div>
            </div>
          </div>
        </section>

        {/* Free Prompt Library */}
        <section id="prompts" className="w-full max-w-5xl px-4 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                Open Access Knowledge
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                Free AI Video Prompts (Luma / Kling / Runway / Seedance)
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Want to generate manually in your own AI tools? Copy our optimized prompt recipes below.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {promptsList.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-rose-500" />
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyPrompt(item.prompt, idx)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shrink-0"
                  >
                    {copiedPromptIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-black/60 border border-slate-950 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                  {item.prompt}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing / Early Access Passes */}
        <section id="pricing" className="w-full max-w-5xl px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Transparent, One-Time Early Access
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              No sneaky recurring subscriptions. Pay once per video pass, with guaranteed queue priority when cloud rendering goes live.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Tier 1 */}
            <div className="rounded-3xl p-8 bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Casual Creator
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$6.99</span>
                  <span className="text-xs text-slate-400">/ 1 video</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Perfect for turning one couple or pet memory into a viral reel.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> 1× 25-Second 720P HD Video
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Choice of 9:16 or 16:9
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Natural Scene Audio & SFX
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> 14-Day Private Cloud Storage
                  </li>
                </ul>
              </div>

              <button
                onClick={() =>
                  openCheckout({
                    name: "Single Video Pass",
                    price: "$6.99",
                    videos: "1 HD Video"
                  })
                }
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Get 1 Video Pass ($6.99)
              </button>
            </div>

            {/* Tier 2: Popular */}
            <div className="rounded-3xl p-8 bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-900 border-2 border-rose-500 flex flex-col justify-between relative shadow-2xl shadow-rose-950/30">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow">
                Most Popular
              </div>

              <div>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                  Storyteller Bundle
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$14.99</span>
                  <span className="text-xs text-slate-400">/ 3 videos ($5/ea)</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Test couple, pet, and friendship variations to see what goes viral.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-rose-400 shrink-0" /> 3× 25-Second 720P HD Videos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-rose-400 shrink-0" /> Priority GPU Render Queue
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-rose-400 shrink-0" /> Both Vertical & Landscape formats
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-rose-400 shrink-0" /> VIP Discord & Prompt Presets
                  </li>
                </ul>
              </div>

              <button
                onClick={() =>
                  openCheckout({
                    name: "Storyteller 3-Video Bundle",
                    price: "$14.99",
                    videos: "3 HD Videos ($4.99/ea)"
                  })
                }
                className="mt-8 w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                Claim 3-Video Bundle ($14.99)
              </button>
            </div>

            {/* Tier 3 */}
            <div className="rounded-3xl p-8 bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Studio / Agency Pass
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$29.99</span>
                  <span className="text-xs text-slate-400">/ 8 videos</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  For creators running multiple client or niche social media channels.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> 8× 25-Second 720P HD Videos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Commercial Usage Rights
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Instant VIP Queue Bypass
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Permanent Cloud Archive
                  </li>
                </ul>
              </div>

              <button
                onClick={() =>
                  openCheckout({
                    name: "Studio Creator Pass",
                    price: "$29.99",
                    videos: "8 HD Videos"
                  })
                }
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Get Studio Pass ($29.99)
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full max-w-4xl px-4 py-16 border-t border-slate-800/80">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-400 mt-2">Everything you need to know about the Zombie Love Story AI trend.</p>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                What is the Zombie Love Story AI trend?
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                It is a viral cinematic video format on TikTok and Reels. It uses two reference photos: one represents a human survivor, and the other represents an infected lover or pet. The video begins with an impending zombie attack, but instead of fleeing, the survivor embraces the zombie, triggering a hard match-cut transition into a sunlit memory of them happily together.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                Do I need to upload a photo of someone dressed as a zombie?
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                No. You only need normal, healthy photos with clear facial features. The AI model automatically transforms Photo 2 into the infected state for the first 10 seconds of the film, and restores their healthy appearance in the memory sequence.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                How does the Early Access purchase work?
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Our automated GPU generation queue is rolling out in cohorts. Purchasing an Early Access pass guarantees your position at the top of the queue with lifetime locked-in pricing ($6.99 vs public launch price of $12.99). You will receive generation credits and private access via your email.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                Can I use this for dogs and cats?
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Yes! The pet version is one of the highest-viewed variants of this trend. Simply upload your portrait as Photo 1 and your dog or cat as Photo 2.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#07090e] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Skull className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-slate-300">ZombieLoveStory.ai</span>
            <span>· All rights reserved © 2026</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#prompts" className="hover:text-slate-300">Prompt Catalog</a>
            <a href="#generator" className="hover:text-slate-300">Web Generator</a>
            <a href="#pricing" className="hover:text-slate-300">Early Access Pass</a>
            <a href="#faq" className="hover:text-slate-300">FAQ</a>
          </div>
        </div>
      </footer>

      {/* Checkout / Early Access Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1422] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
            >
              ×
            </button>

            {paymentSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white">Order Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  We&apos;ve reserved your priority queue slot for{" "}
                  <strong className="text-rose-400">{emailInput}</strong>. You will receive an email confirmation with your private task access key.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <CreditCard className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedPlan ? selectedPlan.name : "Join Early Access Queue"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {selectedPlan ? `${selectedPlan.price} · ${selectedPlan.videos}` : "Be first when video generation opens"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mt-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Beta Notice:</strong> Video rendering pipeline is currently under high GPU demand. Early pass holders get priority rendering immediately as slots open.
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!emailInput) return;
                    setPaymentSuccess(true);
                  }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Delivery & Notification Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LockIcon className="w-3.5 h-3.5" />
                      <span>
                        Confirm & Continue to Payment ({selectedPlan ? selectedPlan.price : "$6.99"})
                      </span>
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      Secured by Stripe & 256-bit SSL encryption
                    </p>
                  </div>
                </form>
              </div>
            )}
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
      width={16}
      height={16}
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
