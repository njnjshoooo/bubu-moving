import {CustomerPage} from '@/components/customer-layout';import {NewsList} from '@/components/news-list';
import {breadcrumbJsonLd,pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({path:'/news',title:'最新資訊｜步步搬家',description:'步步搬家的品牌故事、搬家知識整理，以及一條龍搬家分項報價等最新資訊。'});
export default function Page(){return <CustomerPage jsonLd={breadcrumbJsonLd([{name:'首頁',path:'/'},{name:'最新資訊',path:'/news'}])} label="WHAT’S NEW" title="步步的新鮮事。" intro="服務資訊、網站更新，以及新生活的準備靈感。" cta={false}><NewsList/><p className="section-note">圖片為 AI 品牌情境示意，非實際活動或服務紀錄。</p></CustomerPage>}
