import {news} from '@/lib/news';
import {guides} from '@/lib/editorial';
import {services,serviceHref} from '@/lib/services';
export default function sitemap(){return ['','/news',...news.map(n=>'/news/'+n.id),'/about','/cases','/services','/partners','/providers','/course','/pricing','/process','/faq','/contact','/service-care','/guides','/privacy','/terms',...guides.map(g=>'/guides/'+g.id),...services.map(s=>serviceHref(s.id))].map(path=>({url:'https://www.bubu-moving.com.tw'+path,changeFrequency:'monthly' as const,priority:path===''?1:0.7}))}
