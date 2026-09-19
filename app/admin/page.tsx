import {staffUser} from '@/lib/server';
import {AdminAccess} from '@/components/admin-access';
import Dashboard from './dashboard';
export const dynamic='force-dynamic';
export const metadata={title:'名單追蹤｜步步營運管理',robots:{index:false,follow:false}};
export default async function Admin(){const user=await staffUser();return <AdminAccess section="leads"><div className="ops-page-title"><span className="kicker">LEAD MANAGEMENT</span><h1>新需求，下一步。</h1><p>依日期、地區與服務類別找到名單，記錄每次聯繫與案件進度。</p></div><Dashboard canAssign={!!user&&['owner','admin'].includes(user.role)}/></AdminAccess>}
