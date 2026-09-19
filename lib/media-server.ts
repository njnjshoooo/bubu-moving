import {env} from 'cloudflare:workers';
export function mediaBucket(){const bucket=(env as unknown as {MEDIA?:R2Bucket}).MEDIA;if(!bucket)throw new Error('MEDIA_UNAVAILABLE');return bucket}
export function imageMime(bytes:Uint8Array){if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';return null}
