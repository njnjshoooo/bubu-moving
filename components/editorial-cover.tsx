import {ManagedImage} from '@/components/managed-image';
import {guides} from '@/lib/editorial';
import {news} from '@/lib/news';
export function EditorialCover({label,title,index=0}:{label:string;title:string;index?:number}){const guide=guides.find(g=>g.title===title);const item=news.find(n=>n.title===title);const src=guide?'/images/guides/'+guide.id+'.png':item?'/images/news/'+item.id+'.png':'';return <div className="editorial-photo-cover">{src&&<ManagedImage src={src} alt={title+'｜AI 情境示意'} loading="lazy"/>}<span>{label}</span></div>}
