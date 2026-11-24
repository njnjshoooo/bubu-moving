import {GoogleAnalytics, GoogleTagManager} from '@next/third-parties/google';
import {gaMeasurementId, tagManagerId} from '@/lib/analytics-config';

const gtmId = tagManagerId(process.env.NEXT_PUBLIC_GTM_ID);
const measurementId = gaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

export function TagManager() {
  const mode = gtmId ? 'gtm' : 'ga4';
  const bootstrap = `window.__bubuAnalytics=${JSON.stringify({mode})};`;
  return (
    <>
      <script dangerouslySetInnerHTML={{__html: bootstrap}} />
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : <GoogleAnalytics gaId={measurementId} />}
    </>
  );
}
