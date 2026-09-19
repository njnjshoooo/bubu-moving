// 測試用：以真實 PostgreSQL 執行路由邏輯。需要 TEST_DATABASE_URL（預設本機 postgres）。
import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url).pathname,require=createRequire(root+'package.json'),ts=require('typescript');
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'postgres://postgres@localhost:54329/postgres';
process.env.BUBU_ADMIN_EMAILS='admin@test.invalid';
globalThis.testEnv=process.env;
globalThis.testUser={userId:'test-admin',email:'admin@test.invalid'};
const postgres=require('postgres');const reset=postgres(process.env.DATABASE_URL,{onnotice:()=>{}});await reset.unsafe('DROP SCHEMA IF EXISTS bubu CASCADE');await reset.end();
const bare={zod:'zod',postgres:'postgres'};
const cache={};export function module(file){if(cache[file])return cache[file];let source=readFileSync(root+file,'utf8');if(file==='lib/server.ts')source=source.replace("import {getChatGPTUser} from '@/app/chatgpt-auth';",'const getChatGPTUser=async()=>globalThis.testUser;');source=source.replace(/from ['"]([^'"]+)['"]/g,(full,name)=>{if(bare[name])return 'from '+JSON.stringify(pathToFileURL(require.resolve(bare[name])).href);if(name.startsWith('@/')){const base=name.slice(2);let f=base+'.ts';try{readFileSync(root+f)}catch{f=base+'/index.ts'}return 'from '+JSON.stringify(module(f))}if(name.startsWith('./'))return 'from '+JSON.stringify(module('lib/'+name.slice(2)+'.ts'));return full});const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return cache[file]='data:text/javascript;base64,'+Buffer.from(js).toString('base64')}
export const {database:db}=await import(module('lib/pg-d1.ts'));
export async function done(){process.exit(0)}
