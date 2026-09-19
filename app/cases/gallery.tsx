'use client';
import {useState} from 'react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {CaseCard} from '@/components/case-card';
import {caseCategories,type CaseStudy} from '@/lib/cases';
export default function CaseGallery({cases,unavailable}:{cases:CaseStudy[];unavailable:boolean}){const [filter,setFilter]=useState('全部案例');const visible=cases.filter(c=>filter==='全部案例'||c.category===filter);return <><div className="gallery-toolbar"><h2>服務紀錄</h2><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="依服務篩選案例" style={{width:190}}><SelectValue/></SelectTrigger><SelectContent>{['全部案例',...caseCategories].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>{visible.length?<div className="case-grid">{visible.map(c=><CaseCard key={c.id} item={c}/>)}</div>:<div className="case-empty"><span className="eyebrow">每一段分享，都尊重客戶的隱私。</span><h3>{unavailable?'服務紀錄暫時無法載入':cases.length?'這個分類的案例整理中':'真實的服務，值得好好記錄。'}</h3><p>{unavailable?'請稍後重新整理頁面，或先告訴我們你的需求。':'我們會在整理完成並取得公開授權後，陸續分享服務紀錄與現場細節。'}</p><a className="text-link" href="/about#standards">先了解我們如何照顧搬家的細節 ↗</a></div>}</>}
