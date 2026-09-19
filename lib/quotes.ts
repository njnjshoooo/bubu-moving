import {z} from 'zod';
export const quoteLine=z.object({category:z.enum(['搬運','打包','包材','寄倉','其他']),name:z.string().trim().min(1).max(120),spec:z.string().max(200).default(''),unit:z.string().trim().min(1).max(20),quantity:z.number().int().min(1).max(999),unitPrice:z.number().int().min(0).max(1000000)});
export const quoteContent=z.object({name:z.string().trim().min(1).max(80),phone:z.string().trim().min(1).max(40),date:z.string().max(40),validUntil:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s+'T15:59:59Z'))),notes:z.string().max(3000),lines:z.array(quoteLine).min(1).max(50)});
export type QuoteContent=z.infer<typeof quoteContent>;
export type QuoteRow={id:string;inquiry_id:string|null;content:string;total:number;status:'draft'|'issued'|'accepted'|'void';version:number;token:string;accepted_at:string|null;created_at:string;updated_at:string};
export type PaymentRow={trade_no:string;quote_id:string;amount:number;mode:string;merchant_id:string;status:string;fields:string;gateway_trade_no:string|null;result_code:string|null;paid_at:string|null;created_at:string;updated_at:string};
export function quoteTotal(c:QuoteContent){const n=c.lines.reduce((s,l)=>s+l.quantity*l.unitPrice,0);if(!Number.isSafeInteger(n)||n<1||n>9999999)throw new Error('報價總額須介於 1 與 9,999,999 元');return n}
export function expired(c:QuoteContent){return Date.now()>Date.parse(c.validUntil+'T15:59:59Z')}
export const statusLabels:Record<string,string>={draft:'草稿',issued:'待客戶確認',accepted:'已確認',void:'已作廢',pending:'等待付款通知',succeeded:'已付款',failed:'付款未完成',simulated:'模擬通知（未收款）',test_paid:'測試付款成功（未收款）'};
