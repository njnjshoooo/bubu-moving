import {database as pg} from '@/lib/pg-d1';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export function database(){return pg;}
export function config(name:string){return process.env[name]||'';}
export type Role='owner'|'admin'|'sales'|'editor';
export type Permission='leads'|'quotes'|'content'|'catalog'|'users'|'dispatch'|'overview';
export const permissions:Record<Role,Permission[]>={owner:['leads','quotes','content','catalog','users','dispatch','overview'],admin:['leads','quotes','content','catalog','users','dispatch','overview'],sales:['leads','quotes','overview'],editor:['content','overview']};
export async function roleForEmail(value:string):Promise<Role|null>{const email=value.toLowerCase();const owners=config('BUBU_ADMIN_EMAILS').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);if(owners.includes(email))return 'owner';const row=await database().prepare('SELECT role,active FROM staff WHERE email=?').bind(email).first<{role:Role;active:number}>();return row&&row.active&&permissions[row.role]?row.role:null;}
export async function staffUser(permission?:Permission){const user=await getChatGPTUser();if(!user)return null;const email=user.email.toLowerCase();const role=await roleForEmail(email);if(!role)return null;if(permission&&!permissions[role].includes(permission))return null;return {...user,email,role};}
export async function adminUser(){const user=await staffUser();return user&&['owner','admin'].includes(user.role)?user:null;}
export function recordScope(user:{role:Role;email:string},column='assigned_to'){return user.role==='sales'?{sql:column+'=?',values:[user.email]}:{sql:'1=1',values:[] as string[]};}
export function sameOrigin(r:Request){const o=r.headers.get('origin');return !!o&&o===new URL(r.url).origin;}
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
