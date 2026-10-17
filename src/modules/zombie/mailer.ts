/**
 * 邮件发送门面（可注入），供通知 worker 使用。
 *
 * 与 auth 模块的选择逻辑保持一致：Resend 优先，Cloudflare 次之；
 * 未配置时返回 null，调用方不得声称邮件通知可用。
 */

import { CloudflareEmailProvider } from '@/core/email/cloudflare';
import { ResendProvider } from '@/core/email/resend';
import { getAllConfigs } from '@/modules/config/service';

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface Mailer {
  send(mail: OutgoingMail): Promise<{ ok: boolean; error?: string }>;
}

export async function getDefaultMailer(): Promise<Mailer | null> {
  const configs = (await getAllConfigs()) as Record<string, string>;
  const selected = configs.email_provider || 'resend';

  if (selected === 'cloudflare') {
    const apiToken = configs.cloudflare_email_api_token;
    const accountId = configs.cloudflare_email_account_id;
    const from = configs.cloudflare_email_sender_email;
    if (!apiToken || !accountId || !from) return null;
    const provider = new CloudflareEmailProvider({
      apiToken,
      accountId,
      defaultFrom: from,
    });
    return wrap(provider);
  }

  const apiKey = configs.resend_api_key;
  const from = configs.resend_sender_email;
  if (!apiKey || !from) return null;
  const provider = new ResendProvider({ apiKey, defaultFrom: from });
  return wrap(provider);
}

function wrap(provider: {
  sendEmail: (mail: any) => Promise<{ success: boolean; error?: string }>;
}): Mailer {
  return {
    async send(mail: OutgoingMail) {
      const result = await provider.sendEmail({
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      return { ok: result.success, error: result.error };
    },
  };
}
