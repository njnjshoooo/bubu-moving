import {z} from 'zod';
import {guides} from './editorial';
import {news} from './news';
import {guideDepth} from './guide-depth';
export const postSchema=z.object({id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),kind:z.enum(['guide','news']),title:z.string().trim().min(2).max(150),category:z.string().trim().min(1).max(40),summary:z.string().max(400),image:z.string().max(1500).refine(s=>!s||/^\/(?!\/)/.test(s)||/^https:\/\//.test(s)),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),body:z.array(z.tuple([z.string().trim().min(1).max(150),z.string().trim().min(1).max(8000)])).min(1).max(60)});
export type Post=z.infer<typeof postSchema>;
export const seedPosts:Post[]=[...news.map(n=>({id:n.id,kind:'news' as const,title:n.title,category:n.category,summary:n.summary,image:n.image,date:n.date,body:n.body as [string,string][]})),...guides.map(g=>{const d=guideDepth[g.id];return {id:g.id,kind:'guide' as const,title:g.title,category:g.label,summary:g.summary,image:'/images/guides/'+g.id+'.png',date:'2026-09-19',body:[...g.items as [string,string][],...(d?[...d.sections.map(([t,ps]):[string,string]=>[t,ps.join('\n\n')]),[d.example.title,d.example.text] as [string,string],['準備核對清單',d.checklist.join('\n')] as [string,string],...d.faq]:[])]}})];
