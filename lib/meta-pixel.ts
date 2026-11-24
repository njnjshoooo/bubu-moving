import {isMetaPixelExcluded, metaPixelId} from '@/lib/analytics-config';

const serviceCodePattern = /^[A-Z][A-Z0-9]{1,8}(?:,[A-Z][A-Z0-9]{1,8})*$/;

export type MetaPixelState = {
  booted?: number;
  snippetPage?: string;
  last?: string;
  leftPublic?: boolean;
};

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (command: string, event: string, data?: Record<string, string>, options?: {eventID?: string}) => void;
  disablePushState?: boolean;
};

function pixelWindow() {
  return window as Window & {fbq?: Fbq; __bubuMetaPixel?: MetaPixelState};
}

export function metaPixelState(): MetaPixelState {
  const host = pixelWindow();
  if (!host.__bubuMetaPixel) host.__bubuMetaPixel = {};
  return host.__bubuMetaPixel;
}

// disablePushState keeps the pixel from tracking history changes itself.
// Private routes such as /admin would otherwise get a PageView. The route listener sends public ones.
export function metaPixelBootstrap(value: string | undefined) {
  const id = metaPixelId(value);
  return `try{!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
(function(){var w=window;w.__bubuMetaPixel=w.__bubuMetaPixel||{};if(w.__bubuMetaPixel.booted)return;w.__bubuMetaPixel.booted=1;w.__bubuMetaPixel.snippetPage=location.pathname+location.search;fbq.disablePushState=true;fbq('init',${JSON.stringify(id)});fbq('track','PageView');})();}catch(e){}`;
}

export function metaPixelNoscriptSrc(value: string | undefined) {
  return `https://www.facebook.com/tr?id=${metaPixelId(value)}&ev=PageView&noscript=1`;
}

// The base snippet already sends the first PageView. Later calls cover App Router navigations.
export function decidePageView(pixel: MetaPixelState, key: string, fbqReady: boolean, snippetKey = key): 'wait' | 'skip' | 'send' {
  if (pixel.snippetPage && (pixel.snippetPage === key || pixel.snippetPage === snippetKey)) {
    pixel.snippetPage = undefined;
    pixel.last = key;
    pixel.leftPublic = false;
    return 'skip';
  }
  if (!pixel.booted || !fbqReady) return 'wait';
  if (pixel.last === key && !pixel.leftPublic) return 'skip';
  pixel.last = key;
  pixel.leftPublic = false;
  pixel.snippetPage = undefined;
  return 'send';
}

function eventId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `meta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

export function metaFbqReady() {
  try {
    const fbq = pixelWindow().fbq;
    // The stub exists before fbevents.js finishes loading. Wait for callMethod so a
    // later PageView is not queued and then discarded as a duplicate of the first one.
    return typeof fbq === 'function' && typeof fbq.callMethod === 'function';
  } catch {
    return false;
  }
}

export function sendMetaPageView() {
  try {
    const fbq = pixelWindow().fbq;
    if (typeof fbq !== 'function') return;
    // The pixel records only one plain PageView per load. Later route changes use the
    // same allowDuplicatePageViews context as the pixel's own history listener.
    if (typeof fbq.callMethod === 'function') {
      fbq.callMethod.call({allowDuplicatePageViews: true}, 'track', 'PageView');
      return;
    }
    fbq('track', 'PageView');
  } catch {
    /* Pixel blocked or unavailable. */
  }
}

function metaArgs(event: string, params: Record<string, string>, options: {eventID: string}) {
  if (event === 'generate_lead') {
    const data: Record<string, string> = {};
    const service = params.service ?? '';
    if (serviceCodePattern.test(service)) data.content_name = service;
    return ['track', 'Lead', data, options] as const;
  }
  if (event === 'line_click') return ['track', 'Contact', {method: 'line'}, options] as const;
  if (event === 'phone_click') return ['track', 'Contact', {method: 'phone'}, options] as const;
  return null;
}

export function trackMetaEvent(event: string, params: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    if (isMetaPixelExcluded(window.location?.pathname ?? '')) return;
    const args = metaArgs(event, params, {eventID: eventId()});
    if (!args) return;
    const send = () => {
      const fbq = pixelWindow().fbq;
      if (typeof fbq !== 'function') return false;
      fbq(...args);
      return true;
    };
    try {
      if (send()) return;
    } catch {
      return;
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      let stop = false;
      try {
        stop = send() || tries >= 20;
      } catch {
        stop = true;
      }
      if (stop) window.clearInterval(timer);
    }, 100);
  } catch {
    /* Meta Pixel must not block the page when the tag is blocked. */
  }
}
