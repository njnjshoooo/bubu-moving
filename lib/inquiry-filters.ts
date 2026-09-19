import {services,statuses} from './services';
export const inquiryPageSize=25;
const serviceCodes=[...services.map(s=>s.code),'J01','J02'];
const validDate=(v:string)=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
export function inquiryFilters(params:URLSearchParams){
 const query=(params.get('q')||'').trim().slice(0,100),region=(params.get('region')||'').trim().slice(0,80);
 const status=params.get('status')||'',service=params.get('service')||'',dateType=params.get('dateType')||'created',start=params.get('start')||'',end=params.get('end')||'';
 if(!validDate(start)||!validDate(end)||(start&&end&&start>end))throw new Error('請確認日期範圍，結束日期不可早於開始日期。');
 if(status&&!statuses.includes(status as typeof statuses[number]))throw new Error('案件狀態不正確。');
 if(service&&!serviceCodes.includes(service))throw new Error('商品類別不正確。');
 if(!['created','service'].includes(dateType))throw new Error('日期類型不正確。');
 const page=Number(params.get('page')||1);if(!Number.isSafeInteger(page)||page<1||page>100000)throw new Error('頁碼不正確。');
 const clauses:string[]=[],values:string[]=[];
 const like=(s:string)=>'%'+s.replace(/[\\%_]/g,'\\$&')+'%';
 if(query){clauses.push("(id LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\')");values.push(...Array(3).fill(like(query)));}
 if(status){clauses.push('status=?');values.push(status);}
 if(service){clauses.push('jsonb_exists(services::jsonb,CAST(? AS TEXT))');values.push(service);}
 if(region){clauses.push("(replace(coalesce((details::jsonb->>'from'),''),'臺','台') LIKE ? ESCAPE '\\' OR replace(coalesce((details::jsonb->>'to'),''),'臺','台') LIKE ? ESCAPE '\\')");values.push(...Array(2).fill(like(region.replaceAll('臺','台'))));}
 const dateExpr=dateType==='created'?"to_char(created_at::timestamptz AT TIME ZONE 'Asia/Taipei','YYYY-MM-DD')":"(details::jsonb->>'date')";
 if(start){clauses.push(`${dateExpr}>=?`);values.push(start);}if(end){clauses.push(`${dateExpr}<=?`);values.push(end);}
 return {where:clauses.length?' WHERE '+clauses.join(' AND '):'',values,page};
}
