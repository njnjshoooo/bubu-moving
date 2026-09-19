import {CustomerPage} from '@/components/customer-layout';import {NewsList} from '@/components/news-list';
export const metadata={title:'最新資訊｜步步搬家',description:'步步搬家官網新訊與服務資訊。'};
export default function Page(){return <CustomerPage label="WHAT’S NEW" title="步步的新鮮事。" intro="服務資訊、網站更新，以及新生活的準備靈感。" cta={false}><NewsList/><p className="section-note">圖片為 AI 品牌情境示意，非實際活動或服務紀錄。</p></CustomerPage>}
