/** 成片完成通知邮件（纯字符串构造，不依赖 React 渲染）。 */

import { DOWNLOAD_WINDOW_DAYS } from './types';

export function buildCompletionEmail(args: { order: any; orderUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const { order, orderUrl } = args;
  const orderNo = order?.orderNo ?? '';
  const subject = `Your zombie love story is ready (${orderNo})`;

  const expire = order?.downloadExpireAt
    ? new Date(order.downloadExpireAt).toISOString().slice(0, 10)
    : '';
  const expiryLine = expire
    ? `Please download it within ${DOWNLOAD_WINDOW_DAYS} days (until ${expire}).`
    : `Please download it within ${DOWNLOAD_WINDOW_DAYS} days.`;

  const text = [
    'Your zombie love story video is ready.',
    '',
    `Order: ${orderNo}`,
    `Download: ${orderUrl}`,
    '',
    expiryLine,
    'Keep this private link — anyone who has it can access your order.',
    '',
    'Note: the video may remain available on our generation provider beyond this window.',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#010103;color:#f5f5f7;padding:24px">
  <div style="max-width:520px;margin:0 auto">
    <h1 style="font-size:20px;margin:0 0 8px">Your zombie love story is ready</h1>
    <p style="color:#a1a1aa;margin:0 0 20px">Order ${orderNo}</p>
    <p style="margin:0 0 20px">${expiryLine}</p>
    <p style="margin:0 0 24px">
      <a href="${orderUrl}" style="display:inline-block;background:#e11d48;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Open my video</a>
    </p>
    <p style="color:#71717a;font-size:13px;margin:0">
      This is a private link — anyone who has it can access your order.
      The video may remain available on our generation provider beyond the download window.
    </p>
  </div>
</body></html>`;

  return { subject, html, text };
}
