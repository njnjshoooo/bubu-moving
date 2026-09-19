import {materialSnapshot,readCatalog} from '@/lib/catalog-server';
import {inquirySchema} from '@/lib/validation';
import {database,sameOrigin,hash,json} from '@/lib/server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'請從網站表單送出詢價。'},403);
 if(Number(req.headers.get('content-length')||0)>16000)return json({error:'資料過長。'},413);
 try{
 const raw=await req.text();if(raw.length>16000)return json({error:'資料過長。'},413);
 let input;try{input=JSON.parse(raw)}catch{return json({error:'表單格式不正確。'},400)}
 const parsed=inquirySchema.safeParse(input);if(!parsed.success)return json({error:parsed.error.issues[0].message},422);
 const data=parsed.data;const db=database();const payloadHash=await hash(JSON.stringify(data));
 const existing=await db.prepare('SELECT id,payload_hash FROM inquiries WHERE request_key=?').bind(data.requestKey).first<{id:string,payload_hash:string}>();
 if(existing)return existing.payload_hash===payloadHash?json({id:existing.id,status:'待聯繫'}):json({error:'送出內容已變更，請重新整理後再試。'},409);
 const catalog=await readCatalog();if(data.services.some(code=>code.startsWith('S')&&!catalog.some(p=>p.id===code&&p.active)))return json({error:'部分服務已暫停受理，請重新選擇。'},422);if(data.materialItems?.length&&!data.services.includes('S03'))return json({error:'包材清單須搭配包材服務。'},422);
 const fingerprint=await hash(req.headers.get('cf-connecting-ip')||data.phone);const since=new Date(Date.now()-3600000).toISOString();
 const count=await db.prepare('SELECT COUNT(*) AS n FROM inquiries WHERE request_fingerprint=? AND created_at>?').bind(fingerprint,since).first<{n:number}>();
 if(count&&count.n>=8)return json({error:'已收到多筆需求，請稍後再試。'},429);
 const id='BU-'+crypto.randomUUID().slice(0,8).toUpperCase();const now=new Date().toISOString();const user=await getChatGPTUser();
 const partner=data.services.some(s=>s==='J01'||s==='J02');
 const status=partner?'待聯繫':!data.date||!data.items||data.services.includes('S01')&&!data.to?'待補件':'待聯繫';
 await db.batch([
 db.prepare('INSERT INTO inquiries (id,request_key,payload_hash,owner_id,name,phone,services,details,status,note,version,consent_version,created_at,updated_at,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?,?,?) ON CONFLICT(request_key) DO NOTHING').bind(id,data.requestKey,payloadHash,user?.userId||null,data.name,data.phone,JSON.stringify(data.services),JSON.stringify({date:data.date,from:data.from,to:data.to,floor:data.floor,items:data.items,serviceDetails:data.serviceDetails,company:data.company,materialLines:await materialSnapshot(data.materialItems||[])}),status,'','2026-09-18',now,now,fingerprint),
 db.prepare('INSERT INTO audit_log (id,actor,action,entity_id,detail,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM inquiries WHERE id=?)').bind(crypto.randomUUID(),user?.userId||'guest','inquiry.created',id,JSON.stringify({services:data.services,consent:'2026-09-18'}),now,id)
 ]);
 const saved=await db.prepare('SELECT id,payload_hash,status FROM inquiries WHERE request_key=?').bind(data.requestKey).first<{id:string,payload_hash:string,status:string}>();
 if(!saved||saved.payload_hash!==payloadHash)return json({error:'重複送出內容不同，請重新整理。'},409);
 return json({id:saved.id,status:saved.status},201);
 }catch(e){console.error('inquiry_save_failed',e instanceof Error?e.message:'unknown');return json({error:'目前無法儲存，資料仍保留在此頁，請稍後再試。'},503)}
}
