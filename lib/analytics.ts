import {sendGTMEvent} from '@next/third-parties/google';
import {trackMetaEvent} from '@/lib/meta-pixel';

export type AnalyticsEvent = 'line_click' | 'phone_click' | 'generate_lead';
type AnalyticsMode = 'gtm' | 'ga4';

function analyticsMode(): AnalyticsMode {
  const mode = (window as Window & {__bubuAnalytics?: {mode?: AnalyticsMode}}).__bubuAnalytics?.mode;
  return mode === 'gtm' ? 'gtm' : 'ga4';
}

function queueGtag(event: AnalyticsEvent, params: Record<string, string>) {
  const host = window as Window & {dataLayer?: unknown[]};
  host.dataLayer = host.dataLayer || [];
  const gtag = function gtag() {
    // gtag.js reads the Arguments object, matching the official snippet.
    // eslint-disable-next-line prefer-rest-params
    host.dataLayer?.push(arguments);
  } as (...args: unknown[]) => void;
  gtag('event', event, params);
}

export function track(event: AnalyticsEvent, params: Record<string, string | undefined>) {
  if (typeof window === 'undefined') return;
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) payload[key] = value;
  }
  try {
    if (analyticsMode() === 'gtm') {
      try {
        sendGTMEvent({event, ...payload});
      } catch {
        const host = window as Window & {dataLayer?: unknown[]};
        host.dataLayer = host.dataLayer || [];
        host.dataLayer.push({event, ...payload});
      }
    } else {
      queueGtag(event, payload);
    }
  } catch {
    /* Analytics must not block the page when the tag is unavailable. */
  }
  // Pixel events fire in both modes. GTM must not also install a Meta Pixel tag.
  try {
    trackMetaEvent(event, payload);
  } catch {
    /* Meta Pixel must not block the page when the tag is blocked. */
  }
}
