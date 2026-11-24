import Quote from './quote';
export const dynamic='force-dynamic';
export const metadata={title:'您的服務報價｜步步搬家',description:'查看步步搬家開立的服務報價。此頁僅供報價收件人使用，不對外公開。',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({params}:{params:Promise<{token:string}>}){return <Quote token={(await params).token}/>}
