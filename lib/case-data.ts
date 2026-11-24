import {database} from './server';
import {decodeCase,type CaseRow} from './cases';
export async function publishedCases(){try{const {results}=await database().prepare('SELECT id,content,published,version,updated_at FROM case_studies WHERE published=1 ORDER BY updated_at DESC LIMIT 100').all<CaseRow>();return {cases:results.map(decodeCase),unavailable:false,updatedAt:Object.fromEntries(results.map(row=>[row.id,row.updated_at]))}}catch{return {cases:[],unavailable:true,updatedAt:{} as Record<string,string>}}}
