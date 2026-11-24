import type {Metadata} from 'next';
import {brandName, companyName, defaultOgAlt, defaultOgHeight, defaultOgImage, defaultOgWidth, lineUrl, siteUrl} from '@/lib/site';

export function absoluteUrl(path: string) {
  if (path.startsWith('https://') || path.startsWith('http://')) return path;
  return new URL(path.startsWith('/') ? path : `/${path}`, siteUrl).toString();
}

export function pageMetadata({
  path,
  title,
  description,
  index = true,
  follow = true,
  image,
  type = 'website',
  publishedTime,
}: {
  path: string;
  title: string;
  description: string;
  index?: boolean;
  follow?: boolean;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
}): Metadata {
  const canonical = absoluteUrl(path);
  const imageUrl = image && image.length > 0 ? image : defaultOgImage;
  const imageAlt = image ? title : defaultOgAlt;
  return {
    title,
    description,
    alternates: {canonical},
    robots: {index, follow},
    openGraph: {
      type,
      locale: 'zh_TW',
      siteName: brandName,
      title,
      description,
      url: canonical,
      images: [{url: imageUrl, alt: imageAlt, ...(image ? {} : {width: defaultOgWidth, height: defaultOgHeight})}],
      ...(type === 'article' && publishedTime ? {publishedTime} : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export type JsonLd = Record<string, unknown>;

export function breadcrumbJsonLd(items: {name: string; path: string}[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd(prices: {moving: number | null; organizing: number | null}): JsonLd {
  const offers: JsonLd[] = [];
  if (prices.moving !== null) {
    offers.push({
      '@type': 'Offer',
      name: '一條龍搬家搬運費',
      priceCurrency: 'TWD',
      url: absoluteUrl('/pricing'),
      description: `搬運費每車 NT$${prices.moving.toLocaleString('zh-Hant')} 起。打包服務費與包材費另計，不是整趟固定價格，不承接純搬運。`,
      priceSpecification: {
        '@type': 'PriceSpecification',
        minPrice: prices.moving,
        priceCurrency: 'TWD',
        unitText: '車',
        description: '每車起價',
      },
    });
  }
  if (prices.organizing !== null) {
    offers.push({
      '@type': 'Offer',
      name: '整理服務',
      price: prices.organizing,
      priceCurrency: 'TWD',
      url: absoluteUrl('/pricing'),
      description: `整理服務每人 NT$${prices.organizing.toLocaleString('zh-Hant')}。服務時長與工作範圍於估價時確認。`,
    });
  }
  return {
    '@context': 'https://schema.org',
    '@type': ['MovingCompany', 'Organization'],
    '@id': `${siteUrl}/#organization`,
    name: brandName,
    legalName: companyName,
    alternateName: 'BU BU MOVING',
    url: siteUrl,
    logo: absoluteUrl(defaultOgImage),
    image: absoluteUrl(defaultOgImage),
    description: '步步搬家源自居家整聊，是整聊師與專業搬運搭配的一條龍精緻搬家品牌。從舊家打包到新家上架，搬運、打包與包材分項報價，不承接純搬運。',
    slogan: '把每一步，搬得更好。',
    brand: {'@type': 'Brand', name: brandName},
    sameAs: [lineUrl],
    knowsLanguage: 'zh-Hant',
    makesOffer: offers,
  };
}

function offerFromPriceText(priceText: string, path: string): JsonLd {
  const offer: JsonLd = {
    '@type': 'Offer',
    priceCurrency: 'TWD',
    url: absoluteUrl(path),
    description: priceText,
  };
  const amount = priceText.match(/NT\$([0-9,]+)/);
  if (!amount) return offer;
  const value = Number(amount[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return offer;
  if (priceText.includes('起')) {
    offer.priceSpecification = {
      '@type': 'PriceSpecification',
      minPrice: value,
      priceCurrency: 'TWD',
      description: priceText,
    };
    return offer;
  }
  if (/依|另|報價|確認|評估/.test(priceText)) return offer;
  offer.price = value;
  return offer;
}

export function serviceJsonLd(service: {name: string; description: string; path: string; priceText?: string; quoteOnly?: boolean}): JsonLd {
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    serviceType: service.name,
    description: service.description,
    url: absoluteUrl(service.path),
    provider: {
      '@type': 'MovingCompany',
      name: brandName,
      legalName: companyName,
      url: siteUrl,
    },
  };
  if (service.priceText) {
    data.offers = service.quoteOnly
      ? {'@type': 'Offer', priceCurrency: 'TWD', url: absoluteUrl(service.path), description: service.priceText}
      : offerFromPriceText(service.priceText, service.path);
  }
  return data;
}

export function serviceListJsonLd(items: {name: string; description: string; path: string}[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '步步搬家服務',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      item: {
        '@type': 'Service',
        name: item.name,
        description: item.description,
        url: absoluteUrl(item.path),
        provider: {'@type': 'MovingCompany', name: brandName, url: siteUrl},
      },
    })),
  };
}

export function faqJsonLd(items: {q: string; a: string}[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {'@type': 'Answer', text: item.a},
    })),
  };
}

export function articleJsonLd(article: {path: string; title: string; description: string; image?: string; date?: string}): JsonLd {
  const image = article.image ? absoluteUrl(article.image) : absoluteUrl(defaultOgImage);
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image,
    inLanguage: 'zh-Hant',
    mainEntityOfPage: absoluteUrl(article.path),
    author: {'@type': 'Organization', name: brandName, url: siteUrl},
    publisher: {
      '@type': 'Organization',
      name: brandName,
      url: siteUrl,
      logo: {'@type': 'ImageObject', url: absoluteUrl(defaultOgImage)},
    },
  };
  if (article.date) {
    data.datePublished = article.date;
    data.dateModified = article.date;
  }
  return data;
}
