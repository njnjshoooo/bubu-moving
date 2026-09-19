import {AdminLogin} from '@/components/admin-access';
import {safeRelativeReturnPath} from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export const metadata={title:'管理員登入｜步步搬家',robots:{index:false,follow:false}};
export default async function Login({searchParams}:{searchParams:Promise<{return_to?:string;error?:string}>}){const q=await searchParams;return <AdminLogin returnTo={safeRelativeReturnPath(q.return_to||'/admin/overview')} error={q.error}/>}
