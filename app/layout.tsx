import {AnalyticsEvents} from '@/components/analytics-events';
import {CatalogProvider} from '@/components/catalog-provider';
import {readCatalog} from '@/lib/catalog-server';
import {seedProducts} from '@/lib/catalog';
import {database} from '@/lib/server';
import {PhotoProvider,type PhotoMap} from '@/components/managed-image';
import {TagManager} from '@/components/tag-manager';
import {brandName, companyName, defaultOgAlt, defaultOgHeight, defaultOgImage, defaultOgWidth, siteUrl} from '@/lib/site';
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand-refresh.css";
import "./mobile-refinements.css";

export const dynamic = "force-dynamic";
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};

const description = "步步搬家源自居家整聊，整合搬運、打包整理、包材配送與搬後清潔。一個窗口，陪你安頓每一步。不承接純搬運。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "步步搬家｜一條龍精緻搬家",
  description,
  applicationName: brandName,
  authors: [{name: brandName, url: siteUrl}],
  creator: brandName,
  publisher: companyName,
  formatDetection: {telephone: false, email: false, address: false},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: brandName,
    title: "步步搬家｜一條龍精緻搬家",
    description,
    images: [{url: defaultOgImage, width: defaultOgWidth, height: defaultOgHeight, alt: defaultOgAlt}],
  },
  twitter: {
    card: "summary_large_image",
    title: "步步搬家｜一條龍精緻搬家",
    description,
    images: [defaultOgImage],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let products=seedProducts;try{products=await readCatalog()}catch{console.error('Catalog unavailable; original display retained')}
  const photos:PhotoMap={};
  try{const {results}=await database().prepare('SELECT source,asset_id,alt FROM site_photos WHERE asset_id IS NOT NULL').all<{source:string;asset_id:string;alt:string}>();for(const r of results)photos[r.source]={url:'/api/media/'+r.asset_id,alt:r.alt}}catch{console.error('Photo settings unavailable; using original images')}
  return (
    <html lang="zh-Hant">
      <body className="antialiased"><TagManager /><AnalyticsEvents /><CatalogProvider products={products}><PhotoProvider photos={photos}>{children}</PhotoProvider></CatalogProvider></body>
    </html>
  );
}
