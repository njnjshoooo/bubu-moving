import {ManagedImage} from '@/components/managed-image';
import {ArrowUpRight,PackageCheck} from 'lucide-react';
import type {CaseStudy} from '@/lib/cases';
export function CaseCard({item}:{item:CaseStudy}){return <a className="case-card" href={'/cases/'+item.id}>{item.image?<ManagedImage src={item.image} alt={item.imageAlt} loading="lazy" referrerPolicy="no-referrer"/>:<div className="case-text-cover"><PackageCheck size={42}/><span>{item.category}</span></div>}<div className="case-copy"><div className="case-meta"><span>{item.category}</span><span>{item.area} · {item.month}</span></div><h3>{item.title}</h3><p>{item.summary}</p><span className="case-link">看看我們怎麼做 <ArrowUpRight size={18}/></span></div></a>}
