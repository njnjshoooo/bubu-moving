import {z} from 'zod';
import {materialSelectionSchema} from './material-order';
export const inquirySchema=z.object({
 requestKey:z.string().uuid(),materialItems:materialSelectionSchema.optional(),services:z.array(z.enum(['S01','S02','S03','S04','S05','S06','S07','J01','J02'])).min(1).max(7).refine(v=>new Set(v).size===v.length),
 name:z.string().trim().min(2,'請填寫聯絡人').max(50),phone:z.string().trim().regex(/^09\d{8}$/,'請填寫 09 開頭的十碼手機'),
 date:z.string().max(10).refine(v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&v>=new Date(Date.now()+8*3600000).toISOString().slice(0,10)),'日期不可早於今天'),
 from:z.string().trim().min(2,'請填寫服務縣市／區域').max(150),to:z.string().trim().max(150),floor:z.string().max(100),items:z.string().trim().max(3000),
 serviceDetails:z.record(z.string().max(2000)),company:z.string().max(100),consent:z.literal(true),website:z.string().max(0)
}).superRefine((d,ctx)=>{const partner=d.services.some(s=>s==='J01'||s==='J02');if(!partner)return;if(d.services.length!==1)ctx.addIssue({code:'custom',message:'加盟洽詢請選擇一種模式。',path:['services']});if(d.items.trim().length<2)ctx.addIssue({code:'custom',message:'請填寫相關經驗，尚無經驗也可註明。',path:['items']});if(d.services.includes('J01')&&(!d.serviceDetails.J01||d.serviceDetails.J01.trim().length<2))ctx.addIssue({code:'custom',message:'請填寫自備車輛概況。',path:['serviceDetails']});
});
export type InquiryInput=z.infer<typeof inquirySchema>;
