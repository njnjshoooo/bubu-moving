import Quote from './quote';
export const dynamic='force-dynamic';
export const metadata={title:'您的服務報價｜步步搬家',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({params}:{params:Promise<{token:string}>}){return <Quote token={(await params).token}/>}
