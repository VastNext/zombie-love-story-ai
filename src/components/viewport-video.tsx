import { useEffect, useRef, useState } from 'react';

/**
 * Loads and plays a muted looping preview only while it is near the viewport.
 * This keeps the masonry gallery lively without downloading every clip at once.
 */
export function ViewportVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            void video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { rootMargin: '240px', threshold: 0.01 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    video.load();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void video.play().catch(() => {});
    }
  }, [shouldLoad, src]);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      loop
      muted
      playsInline
      preload="none"
      className={className}
    />
  );
}
