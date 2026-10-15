"use client";

import React, { useState } from "react";
import {
  Upload,
  Sparkles,
  Heart,
  Video,
  Copy,
  Check,
  CreditCard,
  Film,
  Zap,
  HelpCircle,
  ShieldCheck,
  Clock,
  ChevronRight,
  User,
  Skull,
  Mail,
  AlertCircle,
  Share2,
  ArrowRight,
  Sliders,
  Layers,
  CheckCircle2,
  Bookmark
} from "lucide-react";

export default function Home() {
  // State for image uploads
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo1Name, setPhoto1Name] = useState<string>("");
  const [photo2Name, setPhoto2Name] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [storyPreset, setStoryPreset] = useState<"couple" | "dog" | "comrades">("couple");

  // Prompt copy states
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  // Modal State for Early Access / Payment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string; videos: string; discount?: string } | null>(null);
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

  const openCheckout = (plan: { name: string; price: string; videos: string; discount?: string }) => {
    setSelectedPlan(plan);
    setPaymentSuccess(false);
    setIsModalOpen(true);
  };

  // Structured Long-Tail SEO Keywords Matrix
  const longTailKeywords = [
    { tag: "zombie love story ai", desc: "Original Viral Trend Concept" },
    { tag: "ai zombie video trend", desc: "TikTok & Reels Editing Formula" },
    { tag: "zombie match cut ai video", desc: "Hard Match-Cut Technical Prompt" },
    { tag: "ai zombie video generator", desc: "Two-Photo Web Rendering Tool" },
    { tag: "zombie dog trend", desc: "Loyal Pet Reunion Storyline" },
    { tag: "zombie pet ai video", desc: "Dog & Cat Memory Rescue Match-Cut" },
    { tag: "zombie love story ai prompt", desc: "Copyable Prompts for Kling & Luma" },
    { tag: "zombie love story reels editing", desc: "Instagram & CapCut Audio Workflow" }
  ];

  // Comprehensive Prompts Library for Long-tail queries
  const promptsList = [
    {
      keyword: "zombie love story ai prompt",
      title: "1. The Viral Match-Cut: Romantic Couple (25-Second Cinematic)",
      badge: "Most Viral",
      targetTools: "Luma Dream Machine, Kling 1.5, Runway Gen-3, Sora",
      description: "Survivor lowers defense in a ruined shelter; infected lover lunges; instantaneous match cut at the collision frame into a sunlit meadow.",
      prompt: `[SHOT 1 - Post-Apocalyptic Ruins (0-10s)]: Cold volumetric blue light through shattered concrete window. Subject 1 (survivor) aims weapon with trembling hands, crying. Subject 2 approaches with milky pale eyes, dark veins, torn clothing, walking with unstable zombie gait. At 7s, Subject 1 lowers the weapon and steps forward with wide open arms. Subject 2 lunges forward into an embrace. Right at 10.0s as their shoulders collide and hands grasp each other:
[MATCH-CUT at 10.0s]: Seamless hard transition preserving exact physical momentum and contact point into:
[SHOT 2 - Radiant Golden Meadow (10-25s)]: Warm sunset lighting over alpine wildflower meadow. Both subjects are 100% healthy, smiling through joyful tears, spinning in a tight emotional hug. 720p/1080p, natural ambient wind and footsteps audio, cinematic 35mm lens.`
    },
    {
      keyword: "zombie dog trend / zombie pet ai video",
      title: "2. Zombie Dog Match Cut: Pet Memory Rescue (15-Second Story)",
      badge: "Pet Edition",
      targetTools: "Kling 1.5, Minimax Hailuo, Pika 2.0",
      description: "Dedicated to the pet trend: infected dog lunges down a desolate hallway, continuing the airborne trajectory into a joyful sunny backyard jump.",
      prompt: `[Act 1 (0-8s)]: Dark desolate corridor. Owner (Subject 1) kneels with tears in eyes. Infected dog (Subject 2, cloudy eyes, matted fur, restrained infection styling) accelerates and leaps into the air toward owner's chest. Owner keeps both arms wide open without flinching.
[Hard Match-Cut at 8.0s]: Same airborne trajectory and reaching paws connect immediately into:
[Act 2 (8-15s)]: Lush golden hour backyard. Dog is completely healthy and clean, landing happily in owner's loving embrace, tail wagging eagerly. Highly realistic fur textures, emotional depth of field, 9:16 vertical video.`
    },
    {
      keyword: "zombie love story reels editing",
      title: "3. Apocalypse Brothers / Comrades Match-Cut",
      badge: "Brothers / Friendship",
      targetTools: "Kling 1.5, Luma, Midjourney V6 to Video",
      description: "Two military survivors separated by infection, reuniting at a nostalgic pre-war campfire.",
      prompt: `[Act 1 - Military Bunker (0-10s)]: Flickering red emergency sirens. Soldier A drops tactical rifle, pulling infected Comrade Soldier B into a tight helmet-to-shoulder grasp.
[Hard Match-Cut at 10.0s]: The grasp continues seamlessly into:
[Act 2 - Lakeside Campfire (10-25s)]: Warm campfire glow at dusk, both healthy comrades laughing heartily, clinking canteen mugs in everlasting brotherhood. Photorealistic, 8k cinematic lighting.`
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#010103] text-[#e8eaf0] flex flex-col font-sans subtle-grid">
      {/* Linear Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 ambient-glow-top z-0" />
      <div className="pointer-events-none fixed inset-0 ambient-glow-bottom z-0" />

      {/* Top Notice Banner */}
      <div className="relative z-30 bg-[#0c0e14] border-b hairline-border py-2 px-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        <span>
          GPU Batch Pipeline v2.4 in closed beta. Lock in <strong className="text-rose-400 font-semibold">$6.99 Early Access Pass</strong> before public launch price ($12.99).
        </span>
      </div>

      {/* Global Header (Linear Style: 48px/64px crisp bar) */}
      <header className="relative z-20 border-b hairline-border bg-[#010103]/80 backdrop-blur-xl sticky top-0 px-6 py-3.5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-md shadow-rose-950/40">
            <Skull className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-sm text-white">
              Zombie<span className="text-rose-500 font-bold">Love</span>Story<span className="text-slate-500 font-mono text-xs">.ai</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 hairline-border text-slate-400">
              Trend v2
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-400">
          <a href="#generator" className="hover:text-white transition-colors">
            Generator
          </a>
          <a href="#storyboard" className="hover:text-white transition-colors">
            Match-Cut Anatomy
          </a>
          <a href="#prompts" className="hover:text-white transition-colors">
            Prompt Catalog
          </a>
          <a href="#longtail" className="hover:text-white transition-colors">
            Trend Variations
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openCheckout({ name: "Single Video Pass", price: "$6.99", videos: "1 HD Video" })}
            className="text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Pre-order Pass · $6.99</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-5xl px-6 pt-20 pb-16 text-center flex flex-col items-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a0d14] hairline-border text-[11px] text-slate-300 font-medium mb-6 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>The #1 Viral Trend on TikTok & Instagram Reels</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400">Match-Cut Formula</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white max-w-4xl leading-[1.08]">
            Two Photos. One Fatal Virus.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-300 to-amber-300">
              One Eternal Embrace.
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Recreate the viral <strong className="text-slate-200">zombie love story ai</strong> match-cut video: an impending infected attack turns into an emotional, sunlit reunion embrace.
          </p>

          {/* Quick Technical Specs Ribbon */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-400 font-mono">
            <span className="px-3 py-1 rounded bg-[#0b0e14] hairline-border flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-rose-400" /> 2 Photos Required
            </span>
            <span className="px-3 py-1 rounded bg-[#0b0e14] hairline-border flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-amber-400" /> 25s 720P Match-Cut
            </span>
            <span className="px-3 py-1 rounded bg-[#0b0e14] hairline-border flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-cyan-400" /> 9:16 & 16:9 Formats
            </span>
            <span className="px-3 py-1 rounded bg-[#0b0e14] hairline-border flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> $6.99 One-Time (No Sub)
            </span>
          </div>
        </section>

        {/* Generator Interactive Box (Linear Surface-1 & Hairline design) */}
        <section id="generator" className="w-full max-w-4xl px-4 py-6">
          <div className="rounded-2xl hairline-border bg-[#0a0d14]/90 backdrop-blur-xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Header of Generator */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b hairline-border">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  AI Match-Cut Video Generator
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign character roles and select aspect ratio for your story.
                </p>
              </div>

              {/* Story Preset Selector */}
              <div className="flex items-center gap-1.5 bg-[#010103] p-1 rounded-lg hairline-border text-xs">
                <button
                  type="button"
                  onClick={() => setStoryPreset("couple")}
                  className={`px-3 py-1 rounded font-medium transition-all cursor-pointer ${
                    storyPreset === "couple" ? "bg-rose-600/30 text-rose-300 hairline-border" : "text-slate-400 hover:text-white"
                  }`}
                >
                  💑 Couple Story
                </button>
                <button
                  type="button"
                  onClick={() => setStoryPreset("dog")}
                  className={`px-3 py-1 rounded font-medium transition-all cursor-pointer ${
                    storyPreset === "dog" ? "bg-amber-600/30 text-amber-300 hairline-border" : "text-slate-400 hover:text-white"
                  }`}
                >
                  🐕 Pet / Dog Trend
                </button>
              </div>
            </div>

            {/* Upload Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Photo 1: Human Survivor */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Photo 1 · Human Survivor
                  </span>
                  <span className="text-[11px] text-slate-500">You / Protagonist</span>
                </div>
                <label className="group relative flex flex-col items-center justify-center h-60 rounded-xl hairline-border hover:border-slate-600 bg-[#07090f] transition-all cursor-pointer overflow-hidden">
                  {photo1 ? (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo1}
                        alt="Survivor portrait"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-xs font-medium text-white">
                        <Upload className="w-5 h-5 mb-1 text-cyan-400" />
                        Click to Replace Photo
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#111622] hairline-border flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="text-xs font-medium text-slate-200">
                        Upload Human Portrait
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
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
                  <span className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 truncate font-mono">
                    <CheckCircle2 className="w-3 h-3" /> {photo1Name}
                  </span>
                )}
              </div>

              {/* Photo 2: Partner / Pet */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Skull className="w-3.5 h-3.5 text-rose-500" /> Photo 2 · {storyPreset === "dog" ? "Your Dog or Cat" : "Partner / Lover"}
                  </span>
                  <span className="text-[11px] text-rose-400">Infected → Restored in Memory</span>
                </div>
                <label className="group relative flex flex-col items-center justify-center h-60 rounded-xl hairline-border hover:border-slate-600 bg-[#07090f] transition-all cursor-pointer overflow-hidden">
                  {photo2 ? (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo2}
                        alt="Partner or pet portrait"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-xs font-medium text-white">
                        <Upload className="w-5 h-5 mb-1 text-rose-400" />
                        Click to Replace Photo
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#111622] hairline-border flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5 text-rose-500" />
                      </div>
                      <span className="text-xs font-medium text-slate-200">
                        {storyPreset === "dog" ? "Upload Dog or Cat Photo" : "Upload Partner Photo"}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
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
                  <span className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 truncate font-mono">
                    <CheckCircle2 className="w-3 h-3" /> {photo2Name}
                  </span>
                )}
              </div>
            </div>

            {/* Video Format & Options */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#07090f] hairline-border">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-300 font-medium">Aspect Ratio:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`text-xs px-3.5 py-1.5 rounded font-medium transition-all cursor-pointer ${
                    aspectRatio === "9:16"
                      ? "bg-slate-800 text-white hairline-border-strong shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📱 9:16 Vertical (Reels / TikTok / Shorts)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={`text-xs px-3.5 py-1.5 rounded font-medium transition-all cursor-pointer ${
                    aspectRatio === "16:9"
                      ? "bg-slate-800 text-white hairline-border-strong shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🖥️ 16:9 Landscape (YouTube)
                </button>
              </div>
            </div>

            {/* CTA Execution */}
            <div className="mt-8 flex flex-col items-center">
              <button
                onClick={() => {
                  if (!photo1 || !photo2) {
                    alert("Please upload both Photo 1 and Photo 2 to proceed.");
                    return;
                  }
                  openCheckout({
                    name: storyPreset === "dog" ? "Zombie Pet Pass (15s Video)" : "Single Video Pass (25s Video)",
                    price: "$6.99",
                    videos: "1 HD Video"
                  });
                }}
                className="w-full sm:w-auto min-w-[320px] text-center font-semibold text-xs sm:text-sm bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white py-3.5 px-8 rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Queue Up & Generate Video · $6.99</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> One-time payment
                </span>
                <span>•</span>
                <span>No recurring subscription</span>
                <span>•</span>
                <span>14-day private cloud link</span>
              </div>
            </div>
          </div>
        </section>

        {/* Narrative Match-Cut Breakdown (Storyboard Anatomy) */}
        <section id="storyboard" className="w-full max-w-5xl px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-rose-400 uppercase tracking-wider">
              Cinematic Architecture
            </span>
            <h2 className="text-3xl font-semibold text-white tracking-tight mt-1">
              The Anatomy of the Viral Match-Cut
            </h2>
            <p className="mt-3 text-slate-400 text-xs sm:text-sm">
              Why this video trend captures millions of views: the physical collision of impending terror and nostalgic love.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-xl bg-[#0a0d14] hairline-border flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono font-semibold text-rose-400 uppercase tracking-wider mb-2">
                  00:00 – 00:08 · Act I: The Horror
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  1. Confronting The Infected
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ruined room, cold dust and darkness. Survivor aims with shaking hands, facing their infected partner slowly staggering forward.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t hairline-border text-[11px] text-slate-500 font-mono">
                Prompt Anchor: Pale milky eyes, grey veins, laboured breath.
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl bg-[#0f121a] hairline-border-strong flex flex-col justify-between relative shadow-lg shadow-rose-950/20">
              <div className="absolute -top-3 right-4 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono uppercase">
                The Match-Cut Pivot
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-amber-400 uppercase tracking-wider mb-2">
                  00:08 – 00:10 · Act II: The Surrender
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  2. Arms Wide Open
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Instead of shooting or fleeing, the survivor drops all weapons and opens both arms. The infected lunges for the kill.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t hairline-border text-[11px] text-amber-300/80 font-mono">
                Hard Cut Frame: Body collision & shoulder grasp at 10.0s.
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl bg-[#0a0d14] hairline-border flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  00:10 – 00:25 · Act III: The Memory
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  3. Golden Alpine Meadow
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The exact physical momentum continues in a sunny mountain meadow. Both are healthy and smiling through tears in an eternal hug.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t hairline-border text-[11px] text-slate-500 font-mono">
                Emotional Payoff: Endless nostalgic love transcends death.
              </div>
            </div>
          </div>
        </section>

        {/* Free Prompt Library (Targeting 'zombie love story ai prompt') */}
        <section id="prompts" className="w-full max-w-5xl px-6 py-16 border-t hairline-border">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                Keyword: zombie love story ai prompt
              </span>
              <h2 className="text-3xl font-semibold text-white tracking-tight mt-1">
                Curated AI Video Prompt Recipes
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Compatible with Sora, Kling 1.5, Luma Dream Machine, Runway Gen-3, and Seedance. Copy and run directly in your own tools.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {promptsList.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-[#0a0d14] hairline-border hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 hairline-border">
                        {item.badge}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {item.targetTools}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyPrompt(item.prompt, idx)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-200 hairline-border transition-all cursor-pointer self-start sm:self-center shrink-0"
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

                <div className="mt-4 p-4 rounded-lg bg-[#040508] hairline-border font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                  {item.prompt}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Long-Tail Keywords Matrix & SEO Landing Context */}
        <section id="longtail" className="w-full max-w-5xl px-6 py-16 border-t hairline-border">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Trend Ecosystem
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mt-1">
              Explore All Zombie AI Trend Variations
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              From TikTok couple stories to Instagram pet rescue match-cuts, browse how creators build their videos.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {longTailKeywords.map((kw, i) => (
              <div
                key={i}
                className="p-3.5 rounded-lg bg-[#080a10] hairline-border hover:border-slate-600 transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 text-slate-200 text-xs font-medium">
                  <Bookmark className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="truncate">{kw.tag}</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block">
                  {kw.desc}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing / Early Access Passes (Linear Style) */}
        <section id="pricing" className="w-full max-w-5xl px-6 py-20 border-t hairline-border">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
              Transparent Pricing
            </span>
            <h2 className="text-3xl font-semibold text-white tracking-tight mt-1">
              One-Time Early Access Passes
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              No subscription traps. Pay once per video pass with priority queue rendering locked in for early supporters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Plan 1 */}
            <div className="rounded-2xl p-7 bg-[#0a0d14] hairline-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Casual Single
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">$6.99</span>
                  <span className="text-xs text-slate-500">/ one-time</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Create one 25-second couple or 15-second pet match-cut reel.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 1× 25-Second 720P HD Video
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 9:16 Portrait or 16:9 Landscape
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Built-in Natural Scene Audio
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 14-Day Media Cloud Retention
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
                className="mt-8 w-full py-2.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] hairline-border text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Get 1 Video Pass ($6.99)
              </button>
            </div>

            {/* Plan 2: Most Popular */}
            <div className="rounded-2xl p-7 bg-[#0f121a] hairline-border-strong flex flex-col justify-between relative shadow-xl shadow-rose-950/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow">
                Best Value (Save 30%)
              </div>

              <div>
                <span className="text-xs font-mono text-rose-400 uppercase tracking-wider">
                  Storyteller 3-Pack
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">$14.99</span>
                  <span className="text-xs text-slate-500">/ 3 videos ($4.99/ea)</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Test couple, pet dog, and friendship variations to maximize reach.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" /> 3× 25-Second 720P HD Videos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Priority GPU Render Queue
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Both 9:16 and 16:9 Renders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Private Discord Prompt Guide
                  </li>
                </ul>
              </div>

              <button
                onClick={() =>
                  openCheckout({
                    name: "Storyteller 3-Video Bundle",
                    price: "$14.99",
                    videos: "3 HD Videos ($4.99/ea)",
                    discount: "Save 30%"
                  })
                }
                className="mt-8 w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-950 transition-all cursor-pointer"
              >
                Claim 3-Video Bundle ($14.99)
              </button>
            </div>

            {/* Plan 3 */}
            <div className="rounded-2xl p-7 bg-[#0a0d14] hairline-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Creator Agency
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">$29.99</span>
                  <span className="text-xs text-slate-500">/ 8 videos</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  For creators running multiple accounts, client edits, or agency campaigns.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 8× 25-Second 720P HD Videos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Full Commercial Resell Rights
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Instant VIP Queue Priority
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Permanent Cloud Storage
                  </li>
                </ul>
              </div>

              <button
                onClick={() =>
                  openCheckout({
                    name: "Creator Agency Pass",
                    price: "$29.99",
                    videos: "8 HD Videos"
                  })
                }
                className="mt-8 w-full py-2.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] hairline-border text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Get Creator Pass ($29.99)
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full max-w-4xl px-6 py-16 border-t hairline-border">
          <div className="text-center mb-12">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Answers & Help
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-[#0a0d14] hairline-border">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                What is the Zombie Love Story AI trend?
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                It is a viral cinematic video format on TikTok and Reels. It uses two reference photos: one represents a human survivor, and the other represents an infected lover or pet. The video begins with an impending zombie attack, but instead of fleeing, the survivor embraces the zombie, triggering a hard match-cut transition into a sunlit memory of them happily together.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0a0d14] hairline-border">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                Do I need to upload photos of someone dressed as a zombie?
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                No. You only need normal, healthy photos with clear facial features. The AI model automatically transforms Photo 2 into the infected state for the first 10 seconds of the film, and restores their healthy appearance in the memory sequence.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0a0d14] hairline-border">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                Can I use this for dogs and cats (Zombie Dog Trend)?
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Yes! The pet version is one of the highest-viewed variants of this trend. Simply select the &quot;Pet / Dog Trend&quot; preset at the top of the generator, upload your portrait as Photo 1 and your dog or cat as Photo 2.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0a0d14] hairline-border">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500" />
                How does the Early Access purchase work?
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Our automated GPU generation queue is rolling out in cohorts. Purchasing an Early Access pass guarantees your position at the top of the queue with lifetime locked-in pricing ($6.99 vs public launch price of $12.99). You will receive generation credits and private access via your email.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t hairline-border bg-[#010103] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Skull className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-semibold text-slate-300">ZombieLoveStory.ai</span>
            <span>· All rights reserved © 2026</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-mono text-[11px]">
            <a href="#generator" className="hover:text-slate-300">Generator</a>
            <a href="#prompts" className="hover:text-slate-300">Prompt Catalog</a>
            <a href="#longtail" className="hover:text-slate-300">Long-Tail Index</a>
            <a href="#pricing" className="hover:text-slate-300">Pricing</a>
            <a href="#faq" className="hover:text-slate-300">FAQ</a>
          </div>
        </div>
      </footer>

      {/* Checkout / Early Access Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b0e14] hairline-border-strong rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-lg font-bold cursor-pointer"
            >
              ×
            </button>

            {paymentSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 hairline-border flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white">Order Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  We&apos;ve reserved your priority queue slot for{" "}
                  <strong className="text-rose-400">{emailInput}</strong>. You will receive an email confirmation with your private task access key.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-6 w-full py-2 rounded-lg bg-[#141824] hover:bg-[#1a2030] hairline-border text-white font-medium text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-2 rounded bg-rose-500/10 text-rose-400 hairline-border">
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {selectedPlan ? selectedPlan.name : "Join Early Access Queue"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedPlan ? `${selectedPlan.price} · ${selectedPlan.videos}` : "Be first when video generation opens"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 hairline-border text-amber-300 text-xs mt-3 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    <strong>Beta Notice:</strong> Video rendering pipeline is currently under high GPU demand. Early pass holders get priority rendering immediately as slots open.
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!emailInput) return;
                    setPaymentSuccess(true);
                  }}
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Delivery & Notification Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-[#040508] hairline-border rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs shadow-md shadow-rose-950 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LockIcon className="w-3 h-3" />
                      <span>
                        Confirm & Continue to Payment ({selectedPlan ? selectedPlan.price : "$6.99"})
                      </span>
                    </button>
                    <p className="text-[10px] text-center text-slate-600 mt-2 font-mono">
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
