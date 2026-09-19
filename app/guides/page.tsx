import {readGuides} from '@/lib/content-server';
import {CustomerPage} from '@/components/customer-layout';import Catalog from './catalog';export const metadata={title:'搬家知識｜打包、估價、入住準備｜步步搬家',description:'依搬前準備、打包技巧、費用估價、搬家當天與入住整理，找到實用的搬家筆記。'};
export default async function Page(){const guides=await readGuides();return <CustomerPage label="THE MOVING EDIT" title="新生活，先讀這一篇。" intro="從打包靈感到入住準備，讓搬家少一點手忙腳亂。" cta={false}><Catalog guides={guides}/><p className="section-note">文章配圖為 AI 情境示意，協助理解準備情境，非實際服務紀錄。</p></CustomerPage>}
