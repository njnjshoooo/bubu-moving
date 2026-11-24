import type {MetadataRoute} from 'next';
import {siteUrl} from '@/lib/site';

const privatePaths = ['/admin', '/api/', '/inquiry', '/quote/'];
const crawlers = ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];

export default function robots(): MetadataRoute.Robots {
  const rule = {allow: '/', disallow: privatePaths};
  return {
    rules: [
      {userAgent: '*', ...rule},
      {userAgent: crawlers, ...rule},
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
