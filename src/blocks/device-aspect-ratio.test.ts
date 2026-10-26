import { describe, expect, it } from 'vitest';

import { getDeviceAspectRatio } from './device-aspect-ratio';

describe('设备默认画幅', () => {
  it.each([
    [
      'Android 手机',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
      '9:16',
    ],
    [
      'iPhone',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      '9:16',
    ],
    [
      'Windows 桌面',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36',
      '16:9',
    ],
    [
      'macOS 桌面',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15',
      '16:9',
    ],
    [
      'iPad',
      'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',
      '16:9',
    ],
    [
      'Android 平板',
      'Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/130.0 Safari/537.36',
      '16:9',
    ],
  ])('%s 使用 %s 对应的画幅', (_device, userAgent, expected) => {
    expect(getDeviceAspectRatio({ userAgent })).toBe(expected);
  });

  it('UA-CH 的 true 优先于桌面 UA', () => {
    expect(
      getDeviceAspectRatio({
        userAgent: 'Windows NT 10.0',
        userAgentData: { mobile: true },
      })
    ).toBe('9:16');
  });

  it('UA-CH 的 false 优先于手机 UA', () => {
    expect(
      getDeviceAspectRatio({
        userAgent: 'iPhone',
        userAgentData: { mobile: false },
      })
    ).toBe('16:9');
  });

  it('SSR 无 navigator 时安全返回横屏', () => {
    expect(getDeviceAspectRatio()).toBe('16:9');
  });

  it('桌面小窗口不影响设备判断', () => {
    const device = { userAgent: 'Windows NT 10.0', innerWidth: 375 };
    expect(getDeviceAspectRatio(device)).toBe('16:9');
  });
});
