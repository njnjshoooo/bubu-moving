import {AdminAccess} from '@/components/admin-access';
import CaseEditor from './editor';
export const dynamic='force-dynamic';
export const metadata={title:'案例管理｜步步搬家',robots:{index:false,follow:false}};
export default function AdminCases(){return <AdminAccess section="cases"><div className="ops-page-title"><span className="kicker">SERVICE STORIES</span><h1>把用心服務，整理成故事。</h1><p>新增與編輯案例，先保存草稿，再預覽、發布；需要調整時也能下架。</p></div><CaseEditor/></AdminAccess>}
