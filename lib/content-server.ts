import {guides} from './editorial';
import {database} from './server';
import {seedPosts,type Post} from './content';
export async function readPosts(kind:Post['kind'],admin=false){const {results}=await database().prepare('SELECT * FROM content_posts WHERE kind=?').bind(kind).all<{id:string;draft:string;published_content:string|null;version:number;updated_at:string}>();const map=new Map(seedPosts.filter(p=>p.kind===kind).map(p=>[p.id,{...p,version:0,published:true,managed:false}]));for(const r of results){if(!admin&&!r.published_content){map.delete(r.id);continue}map.set(r.id,{...JSON.parse(admin?r.draft:r.published_content!),version:r.version,published:!!r.published_content,managed:admin||r.published_content!==JSON.stringify(seedPosts.find(p=>p.id===r.id))})}return [...map.values()]}
export async function readGuides(){return (await readPosts('guide')).map(p=>({...p,label:p.category,items:!p.managed?(guides.find(g=>g.id===p.id)?.items as [string,string][]||p.body):p.body}))}
