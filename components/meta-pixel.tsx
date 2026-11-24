'use client';

import {Suspense, useEffect} from 'react';
import Script from 'next/script';
import {usePathname, useSearchParams} from 'next/navigation';
import {isMetaPixelExcluded, metaPixelId} from '@/lib/analytics-config';
import {decidePageView, metaFbqReady, metaPixelBootstrap, metaPixelNoscriptSrc, metaPixelState, sendMetaPageView} from '@/lib/meta-pixel';

// Loaded from the site in both analytics modes (direct gtag, and GTM when
// NEXT_PUBLIC_GTM_ID is set). Do not add a second Meta Pixel tag in GTM.
const pixelId = metaPixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID);
const pixelBootstrap = metaPixelBootstrap(pixelId);
const pixelNoscriptSrc = metaPixelNoscriptSrc(pixelId);

function MetaPixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pixel = metaPixelState();
    if (isMetaPixelExcluded(pathname)) {
      pixel.leftPublic = true;
      return;
    }
    const search = searchParams.toString();
    const key = search ? `${pathname}?${search}` : pathname;
    let cancelled = false;
    let timer = 0;

    const consider = () => {
      if (cancelled) return true;
      let decision: 'wait' | 'skip' | 'send' = 'wait';
      try {
        decision = decidePageView(pixel, key, metaFbqReady(), window.location.pathname + window.location.search);
      } catch {
        return true;
      }
      if (decision === 'send') sendMetaPageView();
      return decision !== 'wait';
    };

    if (!consider()) {
      let tries = 0;
      timer = window.setInterval(() => {
        tries += 1;
        if (consider() || tries >= 30) window.clearInterval(timer);
      }, 100);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  const pathname = usePathname();
  return (
    <>
      {isMetaPixelExcluded(pathname) ? null : (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {pixelBootstrap}
          </Script>
          <noscript>
            {/* Meta's no-JS pixel. next/image cannot run when JavaScript is disabled. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" height={1} width={1} style={{display: 'none'}} src={pixelNoscriptSrc} />
          </noscript>
        </>
      )}
      <Suspense fallback={null}>
        <MetaPixelPageView />
      </Suspense>
    </>
  );
}
