import type {MetadataRoute} from 'next';
import {publishedCases} from '@/lib/case-data';
import {readPosts} from '@/lib/content-server';
import {guides} from '@/lib/editorial';
import {news} from '@/lib/news';
import {services, serviceHref} from '@/lib/services';
import {siteUrl} from '@/lib/site';

export const dynamic = 'force-dynamic';

const staticPaths = [
  '',
  '/about',
  '/services',
  '/process',
  '/pricing',
  '/faq',
  '/contact',
  '/guides',
  '/cases',
  '/news',
  '/service-care',
  '/materials',
  '/storage',
  '/providers',
  '/partners',
  '/course',
  '/privacy',
  '/terms',
];

const contentPublished = '2026-09-19';

function modified(value?: string) {
  if (!value) return new Date(`${contentPublished}T00:00:00.000Z`);
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(parsed.getTime()) ? new Date(`${contentPublished}T00:00:00.000Z`) : parsed;
}

function latest(values: Array<string | undefined>, fallback = contentPublished) {
  const times = values.map(value => modified(value).getTime());
  return new Date(times.length ? Math.max(...times) : modified(fallback).getTime());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let guideRecords = guides.map(guide => ({id: guide.id, date: contentPublished}));
  let newsRecords = news.map(item => ({id: item.id, date: item.date}));
  let caseRecords: {id: string; updatedAt: string}[] = [];
  try {
    const publishedGuides = await readPosts('guide');
    if (publishedGuides.length) guideRecords = publishedGuides.map(guide => ({id: guide.id, date: guide.date}));
  } catch {
    console.error('Sitemap guides unavailable; using built-in guides');
  }
  try {
    const posts = await readPosts('news');
    if (posts.length) newsRecords = posts.map(item => ({id: item.id, date: item.date}));
  } catch {
    console.error('Sitemap news unavailable; using built-in news');
  }
  try {
    const {cases, unavailable, updatedAt} = await publishedCases();
    if (!unavailable) caseRecords = cases.map(item => ({id: item.id, updatedAt: updatedAt[item.id] || ''}));
  } catch {
    console.error('Sitemap cases unavailable');
  }
  const guidePaths = guideRecords.map(guide => `/guides/${guide.id}`);
  const newsPaths = newsRecords.map(item => `/news/${item.id}`);
  const casePaths = caseRecords.map(item => `/cases/${item.id}`);
  const paths = [...new Set([...staticPaths, ...services.map(service => serviceHref(service.id)), ...guidePaths, ...newsPaths, ...casePaths])];
  const dates = new Map<string, Date>(paths.map(path => [path, modified(path === '/privacy' ? '2026-09-18' : contentPublished)]));
  for (const guide of guideRecords) dates.set(`/guides/${guide.id}`, modified(guide.date));
  dates.set('/guides', latest(guideRecords.map(guide => guide.date)));
  for (const item of newsRecords) dates.set(`/news/${item.id}`, modified(item.date));
  dates.set('/news', latest(newsRecords.map(item => item.date)));
  for (const item of caseRecords) dates.set(`/cases/${item.id}`, modified(item.updatedAt));
  if (caseRecords.length) dates.set('/cases', latest(caseRecords.map(item => item.updatedAt)));
  return paths.map(path => ({
    url: `${siteUrl}${path}`,
    lastModified: dates.get(path),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path.startsWith('/services') || path === '/pricing' || path === '/process' ? 0.8 : 0.6,
  }));
}
