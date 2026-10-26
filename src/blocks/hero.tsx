import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { formatZombiePrice } from '@/modules/zombie/types';
import { ZOMBIE_STORY_PROMPT } from '@/modules/zombie/video-spec';
import { apiPost } from '@/lib/api-client';

import './hero.css';

export function Hero() {
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo1Name, setPhoto1Name] = useState('');
  const [photo2Name, setPhoto2Name] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [photo1File, setPhoto1File] = useState<File | null>(null);
  const [photo2File, setPhoto2File] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [testCode, setTestCode] = useState('');
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  // 服务端模式决定测试或收款权限，页面不改变授权语义。
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

  React.useEffect(() => {
    if (isModalOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [isModalOpen]);

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
    window.location.href = `/zombie/order#o=${encodeURIComponent(orderId)}&t=${encodeURIComponent(accessToken)}`;
  };

  // 保留既有直传 R2、私有订单和 Stripe 链路。
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
      if (modeInfo?.canTest) {
        await apiPost('/api/zombie/admin-test', {
          orderId,
          code: testCode.trim(),
        });
        goToOrder(orderId, accessToken);
        return;
      }
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

  return (
    <div className="zombie-studio">
      <section className="studio-intro" aria-labelledby="story-title">
        <p className="studio-eyebrow">A love story at the end of the world</p>
        <h1 id="story-title">
          Two faces. <em>One last embrace.</em>
        </h1>
        <p>
          Turn two portraits into a zombie love story. From a ruined world to a
          sunlit memory.
        </p>
        <div className="studio-specs" aria-label="Video specifications">
          <span>25-second video</span>
          <span>9:16 or 16:9</span>
          <span>{price} once · no subscription</span>
        </div>
        <p className="studio-access">
          Private order page · Email optional · No account needed
        </p>
      </section>

      <div className="studio-workspace">
        <section
          id="sample"
          className="studio-screen"
          aria-labelledby="sample-title"
        >
          <div className="studio-section-label">
            <h2 id="sample-title">The story, in motion</h2>
            <span>DEMO / 01</span>
          </div>
          <video
            src="/videos/zombie-love-sample.mp4"
            poster="/images/zombie-love-poster.jpg"
            controls
            playsInline
            preload="metadata"
            width="1280"
            height="720"
            aria-label="Zombie love story demonstration, 21 seconds"
            aria-describedby="sample-caption"
          />
          <p id="sample-caption" className="studio-caption">
            21-second demo · 16:9 · Sound on when you press play. Your order
            uses a 25-second generation specification; AI results vary.
          </p>
          <div className="studio-storyline" aria-label="Story sequence">
            <span>01 / The encounter</span>
            <span>02 / The embrace</span>
            <span>03 / The memory</span>
          </div>
          <p className="studio-note">
            One story. Two adult characters.
            <br />A familiar face on either side of the apocalypse.
          </p>
        </section>

        <section
          id="generator"
          className="studio-generator"
          aria-labelledby="generator-title"
        >
          <div className="studio-section-label">
            <h2 id="generator-title">Cast your story</h2>
            <span>2 PORTRAITS</span>
          </div>
          <div className="studio-uploads">
            {([1, 2] as const).map((slot) => {
              const photo = slot === 1 ? photo1 : photo2;
              const name = slot === 1 ? photo1Name : photo2Name;
              return (
                <div key={slot} className="studio-upload-slot">
                  <label className="studio-upload">
                    <span className="studio-role">
                      Subject {slot}
                      <strong>
                        {slot === 1 ? 'The survivor' : 'The infected partner'}
                      </strong>
                    </span>
                    {photo ? (
                      <img
                        src={photo}
                        alt={`Subject ${slot} portrait preview`}
                      />
                    ) : (
                      <Upload aria-hidden="true" size={21} />
                    )}
                    <span className="studio-upload-action">
                      {photo ? 'Replace portrait' : `Upload Photo ${slot}`}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={`Photo ${slot}: ${slot === 1 ? 'survivor' : 'infected partner'}`}
                      onChange={(e) => handleFileUpload(e, slot)}
                    />
                  </label>
                  {name && (
                    <p className="studio-filename" title={name}>
                      {name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="studio-caption">
            Clear adult faces, one per photo. Use healthy portraits you have
            permission to use. JPG, PNG or WebP.
          </p>
          <fieldset className="studio-ratio">
            <legend>Choose your frame</legend>
            {(['9:16', '16:9'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                aria-pressed={aspectRatio === ratio}
                onClick={() => setAspectRatio(ratio)}
              >
                {ratio}{' '}
                <span>{ratio === '9:16' ? 'Vertical' : 'Landscape'}</span>
              </button>
            ))}
          </fieldset>
          <div id="pricing" className="studio-price">
            <span>
              One video. Yours to keep.
              <small>One-time payment · no subscription</small>
            </span>
            <strong>{price}</strong>
          </div>
          <button
            className="studio-primary"
            disabled={!modeInfo?.canTest && !modeInfo?.canCheckout}
            onClick={() => {
              if (!photo1 || !photo2) {
                toast.error(
                  'Please upload both Photo 1 and Photo 2 to proceed.'
                );
                return;
              }
              setIsModalOpen(true);
            }}
          >
            {modeInfo?.canTest
              ? 'Review test generation'
              : modeInfo?.mode === 'stripe_sandbox'
                ? 'Review sandbox payment'
                : 'Create my video'}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <p className="studio-privacy">
            Private order page · Email optional · No account needed.
            <br />
            Save your order link or reopen <a href="/zombie/order">
              My orders
            </a>{' '}
            in this browser.
          </p>
          {modeInfo && !modeInfo.canTest && !modeInfo.canCheckout && (
            <p role="status" className="studio-caption">
              Generation is currently unavailable. You can still watch the
              sample.
            </p>
          )}
        </section>
      </div>

      <section
        id="how-it-works"
        className="studio-process"
        aria-labelledby="process-title"
      >
        <h2 id="process-title">From portraits to premiere</h2>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Cast two people</h3>
              <p>Upload the survivor and partner. Choose your frame.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Pay once</h3>
              <p>Review your order, then pay {price} securely with Stripe.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Return for your film</h3>
              <p>
                Follow generation on your private order page. Download within 14
                days of completion.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section
        id="storyboard"
        className="studio-details"
        aria-label="Story and generation prompt"
      >
        <details id="prompts">
          <summary>
            The storyboard & full generation prompt <span>Read the script</span>
          </summary>
          <div className="studio-details-body">
            <p>
              The survivor lowers their weapon. An embrace cuts from cold ruins
              to a golden meadow. This is the single two-person story used for
              generation; no pet or alternative templates are offered.
            </p>
            <button
              className="studio-copy"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(ZOMBIE_STORY_PROMPT);
                  setCopied(true);
                } catch {
                  toast.error('无法复制，请手动选择分镜文本。');
                }
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy full prompt'}
            </button>
            <pre>{ZOMBIE_STORY_PROMPT}</pre>
          </div>
        </details>
      </section>

      <section id="faq" className="studio-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Before you roll</h2>
        <div>
          <details>
            <summary>What photos should I use?</summary>
            <p>
              Two clear portraits of adults who consent to their use. Photo 1 is
              the survivor; Photo 2 is the infected partner. A normal, healthy
              portrait is enough. This version supports two people, not pets.
            </p>
          </details>
          <details>
            <summary>What do I get for {price}?</summary>
            <p>
              One video generated with a 25-second specification in your chosen
              9:16 or 16:9 format. This is a one-time purchase, not a
              subscription. The sample is a 21-second demonstration, not a
              guarantee of identical results.
            </p>
          </details>
          <details>
            <summary>Do I need an account or email?</summary>
            <p>
              No. Email is optional at checkout for delivery notifications. Keep
              your private order link safe. My orders can reopen orders saved in
              this browser; clearing browser storage removes that shortcut.
            </p>
          </details>
          <details>
            <summary>
              How private is my video, and when should I download?
            </summary>
            <p>
              Your order page is protected by a private access link. Download
              within 14 days after completion. This is the lifetime of this
              site's download entry, not a promise that the provider's asset URL
              is private or deleted after 14 days.
            </p>
          </details>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="studio-checkout"
        aria-labelledby="checkout-title"
        onClose={() => setIsModalOpen(false)}
      >
        <button
          className="studio-close"
          aria-label="Close checkout"
          onClick={() => setIsModalOpen(false)}
        >
          ×
        </button>
        <p className="studio-eyebrow">Review your story</p>
        <h2 id="checkout-title">Zombie Love Story · {aspectRatio}</h2>
        <p>{price} one-time · 1 video</p>
        <p className="studio-checkout-notice">
          {modeInfo?.canTest
            ? 'Test generation: no charge. Enter your test code to run a real generation.'
            : modeInfo?.mode === 'stripe_sandbox'
              ? 'Stripe sandbox: test payment only. No real charge or video generation.'
              : 'You will be redirected to Stripe. Generation starts once payment is confirmed.'}
        </p>
        {modeInfo?.mode !== 'stripe_sandbox' && (
          <div>
            <label htmlFor="delivery-email">Email (optional)</label>
            <input
              id="delivery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="studio-caption">
              For delivery notifications. Without email, save your private order
              link or use My orders in this browser.
            </p>
          </div>
        )}
        {modeInfo?.canTest && (
          <div>
            <label htmlFor="test-code">Test code</label>
            <input
              id="test-code"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
            />
          </div>
        )}
        <button
          className="studio-primary"
          onClick={handleGenerate}
          disabled={isRedirectingToStripe}
        >
          {isRedirectingToStripe ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Working…
            </>
          ) : modeInfo?.canTest ? (
            'Start test generation'
          ) : modeInfo?.mode === 'stripe_sandbox' ? (
            'Test payment with Stripe'
          ) : (
            `Pay ${price} with Stripe`
          )}
        </button>
      </dialog>
    </div>
  );
}
