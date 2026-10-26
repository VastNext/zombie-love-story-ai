import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

import { ZOMBIE_STORY_PROMPT } from '@/modules/zombie/video-spec';

import { Hero } from './hero';

vi.mock('@/config', () => ({ envConfigs: {} }));
vi.mock('@/lib/api-client', () => ({ apiPost: vi.fn() }));

it('首页展示统一的新售价和完整共享分镜，不残留旧价', () => {
  const html = renderToStaticMarkup(React.createElement(Hero));
  expect(html).toContain('$9.90');
  expect(html).not.toContain('$4.99');
  expect(html).toContain(ZOMBIE_STORY_PROMPT);
});

it('样片保持原比例且由用户控制播放，分镜默认折叠', () => {
  const html = renderToStaticMarkup(React.createElement(Hero));
  expect(html).toContain('src="/videos/zombie-love-sample.mp4"');
  expect(html).toContain('poster="/images/zombie-love-poster.jpg"');
  expect(html).toMatch(
    /<video[^>]*controls=""[^>]*playsInline=""[^>]*preload="metadata"/
  );
  expect(html).not.toMatch(/<video[^>]*autoPlay/);
  expect(html).toContain('21-second demo');
  expect(html).toContain('<details id="prompts">');
});

it('仅提供双人角色，保留两种画幅和私有订单入口', () => {
  const html = renderToStaticMarkup(React.createElement(Hero));
  expect(html.match(/type="file"/g) || []).toHaveLength(2);
  expect(html).toContain('Photo 1: survivor');
  expect(html).toContain('Photo 2: infected partner');
  expect(html).toContain('aria-pressed="true">9:16');
  expect(html).toContain('aria-pressed="false">16:9');
  expect(html).toContain('href="/zombie/order"');
  expect(html).toContain('Email optional');
  expect(html).not.toContain('Pet / Dog Trend');
  expect(html).not.toContain('id="longtail"');
});
