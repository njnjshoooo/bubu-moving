import {database} from '@/lib/server';
// 圖片以 bytea 存在 PostgreSQL（bubu.media_blobs），取代原 Cloudflare R2。
export function mediaBucket(){return {
 async put(id:string,bytes:Uint8Array,opts:{httpMetadata:{contentType:string}}){await database().prepare('INSERT INTO media_blobs(id,mime,data) VALUES(?,?,?)').bind(id,opts.httpMetadata.contentType,bytes).run()},
 async get(id:string){const row=await database().prepare('SELECT mime,data FROM media_blobs WHERE id=?').bind(id).first<{mime:string;data:Uint8Array}>();if(!row)return null;return {body:new Uint8Array(row.data),httpMetadata:{contentType:row.mime},httpEtag:'"'+id+'"'}},
 async delete(id:string){await database().prepare('DELETE FROM media_blobs WHERE id=?').bind(id).run()},
}}
export function imageMime(bytes:Uint8Array){if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';return null}
