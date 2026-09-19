import {z} from 'zod';
import {materials} from './materials';
import {services} from './services';
export const productSchema=z.object({id:z.string().regex(/^[A-Za-z0-9-]{1,60}$/),kind:z.enum(['material','service']),name:z.string().trim().min(1).max(100),description:z.string().max(3000),spec:z.string().max(250),unit:z.string().trim().min(1).max(20),price:z.number().int().min(0).max(1000000).nullable(),image:z.string().max(1500).refine(s=>/^\/(?!\/)/.test(s)||/^https:\/\//.test(s)),category:z.string().min(1).max(30),active:z.boolean()});
export type Product=z.infer<typeof productSchema>;
export const seedProducts:Product[]=[...materials.map(m=>({id:'material-'+m.id,kind:'material' as const,name:m.name,description:m.description,spec:m.spec,unit:m.unit,price:m.price,image:m.image,category:m.category,active:true})),...services.map(s=>({id:s.code,kind:'service' as const,name:s.title,description:s.intro,spec:s.price,unit:s.code==='S01'?'車':s.code==='S02'?'人':'項',price:s.code==='S01'?4200:s.code==='S02'?800:null,image:'/'+s.image,category:s.code==='S01'?'搬運':s.code==='S02'?'打包':s.code==='S07'?'寄倉':'其他',active:true}))];
