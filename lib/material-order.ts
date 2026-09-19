import {z} from 'zod';
import {materials} from './materials';
export const materialSelectionSchema=z.array(z.object({id:z.string().regex(/^[A-Za-z0-9-]{1,50}$/),quantity:z.number().int().min(1).max(999)})).max(50).refine(v=>new Set(v.map(x=>x.id)).size===v.length,'包材品項不可重複');
export function priceMaterials(input:z.infer<typeof materialSelectionSchema>){return input.map(x=>{const p=materials.find(p=>p.id===x.id)!;return {materialId:p.id,name:p.name,spec:p.spec,unit:p.unit,quantity:x.quantity,unitPrice:p.price,category:'包材' as const}})}
