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
