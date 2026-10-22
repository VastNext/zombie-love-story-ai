import React from 'react';
import { createFileRoute } from '@tanstack/react-router';

/**
 * 私有订单页。
 *
 * 令牌只放在 URL fragment（`#o=..&t=..`）——fragment 不会随 Referer 或被服务端记录，
 * 页面在客户端读取后通过 `x-order-token` 头访问订单接口。
 */

interface OrderView {
  orderNo: string;
  status: string;
  sandbox: boolean;
  aspectRatio: string;
  priceCents: number;
  currency: string;
  hasEmail: boolean;
  completedAt: string | null;
  downloadExpireAt: string | null;
  canDownload: boolean;
  videoUrl: string | null;
  needsAttention: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  draft: '待支付',
  checkout_pending: '等待支付确认',
  paid: '已付款，排队中',
  queued: '排队中',
  submitted: '生成中',
  processing: '生成中',
  succeeded: '已完成',
  failed_needs_attention: '需要人工处理',
  refunded: '已退款',
  canceled: '已取消',
  expired: '已过期',
};

function readFragment(): { o: string; t: string } {
  if (typeof window === 'undefined') return { o: '', t: '' };
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const o = params.get('o') ?? '';
  let t = params.get('t') ?? '';
  if (o && !t) {
    try {
      const saved = JSON.parse(localStorage.getItem('zombie_orders') || '[]');
      t =
        saved.find(
          (item: { orderId: string; accessToken: string }) => item.orderId === o
        )?.accessToken ?? '';
    } catch {
      // 浏览器未保存订单时仍允许展示链接不完整的提示。
    }
  }
  return { o, t };
}

function MyOrders() {
  const [orders, setOrders] = React.useState<
    { orderId: string; orderNo: string; accessToken: string }[]
  >([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('zombie_orders');
      setOrders(raw ? JSON.parse(raw) : []);
    } catch {
      setOrders([]);
    }
  }, []);

  if (!orders.length) return null;

  return (
    <div className="border-border bg-card mt-8 rounded-xl border p-4">
      <h2 className="text-foreground mb-3 text-sm font-semibold">My orders</h2>
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.orderId}>
            <a
              className="text-xs text-rose-400 hover:text-rose-300"
              href={`/zombie/order#o=${encodeURIComponent(order.orderId)}&t=${encodeURIComponent(order.accessToken)}`}
            >
              {order.orderNo || order.orderId}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderPage() {
  const [order, setOrder] = React.useState<OrderView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const { o: orderId, t: token } = readFragment();

  const load = React.useCallback(async () => {
    if (!orderId || !token) {
      setError('订单链接不完整');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/zombie/orders/${encodeURIComponent(orderId)}`,
        {
          headers: { 'x-order-token': token },
        }
      );
      const json = await res.json();
      if (json?.code !== 0 || !json?.data) {
        setError(json?.message || '无法读取订单');
        return;
      }
      setOrder(json.data as OrderView);
      setError(null);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  React.useEffect(() => {
    load();
  }, [load]);

  // 生成中时轮询；完成或失败后停止
  React.useEffect(() => {
    if (!order || (order.sandbox && order.status === 'paid')) return;
    const active = [
      'draft',
      'checkout_pending',
      'paid',
      'queued',
      'submitted',
      'processing',
    ];
    if (!active.includes(order.status)) return;
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, [order, load]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/zombie/order#o=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略剪贴板失败
    }
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-lg">
        <a
          href="/"
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          ← Back to zombie-love.com
        </a>

        <h1 className="mt-4 text-2xl font-semibold">Your zombie love story</h1>

        {loading && (
          <p className="text-muted-foreground mt-6 text-sm">Loading…</p>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        {order && (
          <div className="border-border bg-card mt-6 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Order {order.orderNo}
              </span>
              <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-400">
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            <dl className="text-muted-foreground mt-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <dt>Aspect ratio</dt>
                <dd>{order.aspectRatio}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Price</dt>
                <dd>
                  ${(order.priceCents / 100).toFixed(2)}{' '}
                  {order.currency.toUpperCase()}
                </dd>
              </div>
              {order.downloadExpireAt && (
                <div className="flex justify-between">
                  <dt>Download until</dt>
                  <dd>{new Date(order.downloadExpireAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>

            {order.canDownload && order.videoUrl && (
              <div className="mt-5 space-y-3">
                <video
                  src={order.videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-lg"
                />
                <a
                  href={order.videoUrl}
                  download
                  className="inline-block rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Download video
                </a>
              </div>
            )}

            {order.needsAttention && (
              <p className="mt-4 text-xs text-amber-400">
                This order needs manual review. We will follow up with you.
              </p>
            )}

            {order.sandbox && order.status === 'paid' && (
              <p className="mt-4 text-xs text-emerald-400">
                Stripe sandbox payment confirmed. No real charge or video
                generation.
              </p>
            )}

            {!order.canDownload &&
              !order.needsAttention &&
              !['canceled', 'expired', 'refunded'].includes(order.status) &&
              !(order.sandbox && order.status === 'paid') && (
                <p className="text-muted-foreground mt-4 text-xs">
                  We are still working on your video. This page refreshes
                  automatically.
                </p>
              )}

            <button
              onClick={copyLink}
              className="border-border mt-5 w-full rounded-lg border py-2 text-xs hover:border-rose-500"
            >
              {copied ? 'Private link copied' : 'Copy private order link'}
            </button>
            <p className="text-muted-foreground mt-2 text-[10px] leading-relaxed">
              Keep this link private — anyone who has it can access this order.
              {!order.hasEmail &&
                ' You did not add an email, so this link is the only way back.'}
            </p>
          </div>
        )}

        <MyOrders />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/zombie/order')({
  component: OrderPage,
});
