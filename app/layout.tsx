import {CatalogProvider} from '@/components/catalog-provider';
import {readCatalog} from '@/lib/catalog-server';
import {seedProducts} from '@/lib/catalog';
import {database} from '@/lib/server';
import {PhotoProvider,type PhotoMap} from '@/components/managed-image';
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand-refresh.css";
import "./mobile-refinements.css";

export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};

export const metadata: Metadata = {
  metadataBase: new URL("https://bubu-moving.gudo-5451.chatgpt.site"),
  title: "步步搬家｜一條龍精緻搬家",
  description: "步步搬家，整合搬運、打包整理、包材配送與搬後清潔。一個窗口，陪你安頓每一步。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
      <body className="antialiased"><CatalogProvider products={products}><PhotoProvider photos={photos}>{children}</PhotoProvider></CatalogProvider></body>
    </html>
  );
}
