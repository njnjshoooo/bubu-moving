import {AdminAccess} from '@/components/admin-access';
import Manager from './manager';
export const dynamic='force-dynamic';
export const metadata={title:'整合報價與收款｜步步營運管理',robots:{index:false,follow:false}};
export default function Page(){return <AdminAccess section="quotes"><div className="ops-page-title"><span className="kicker">QUOTES & PAYMENTS</span><h1>一張報價，完整照顧。</h1><p>搬運、打包、包材與寄倉分項列明，由步步統一收款。</p></div><Manager/></AdminAccess>}
