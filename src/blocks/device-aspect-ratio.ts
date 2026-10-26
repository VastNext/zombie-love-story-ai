export function getDeviceAspectRatio(device?: {
  userAgent: string;
  userAgentData?: { mobile: boolean };
}): '9:16' | '16:9' {
  const mobile =
    device?.userAgentData?.mobile ??
    /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(device?.userAgent ?? '');
  // UA-CH 优先；兜底时 iPad 与不带 Mobile 的 Android 平板使用横屏。
  return mobile ? '9:16' : '16:9';
}
