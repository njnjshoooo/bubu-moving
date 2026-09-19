'use client';
import {useProducts} from './catalog-provider';
export function CatalogPrice({code}:{code:'S01'|'S02'}){const p=useProducts().find(p=>p.id===code&&p.active);return <>{p?.price!==null&&p?.price!==undefined?p.price.toLocaleString():'另行估價'}</>}
