import {AdminAccess} from '@/components/admin-access';
import Manager from './manager';
export const dynamic='force-dynamic';
export const metadata={title:'網站照片管理｜步步營運管理',robots:{index:false,follow:false}};
export default function Page(){return <AdminAccess section="photos"><div className="ops-page-title"><span className="kicker">PHOTO STUDIO</span><h1>讓每個畫面，都像步步。</h1><p>挑選網站位置，上傳照片、確認預覽，再儲存更新。案例照片請至「服務案例」編輯。</p></div><Manager/></AdminAccess>}
