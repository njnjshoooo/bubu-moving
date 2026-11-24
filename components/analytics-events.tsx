'use client';

import {useEffect} from 'react';
import {track} from '@/lib/analytics';

function locationOf(link: Element) {
  return link.getAttribute('data-cta') || 'inline';
}

export function AnalyticsEvents() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const page_path = window.location.pathname;
      const cta_location = locationOf(link);
      let url: URL | null = null;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        url = null;
      }
      if (url && (url.hostname === 'lin.ee' || url.hostname === 'line.me' || url.hostname.endsWith('.line.me'))) {
        track('line_click', {page_path, cta_location});
      }
      if (href.startsWith('tel:') || url?.protocol === 'tel:') {
        track('phone_click', {page_path, cta_location});
      }
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
