import {questions} from '@/lib/customer-content';
import {guides} from '@/lib/editorial';
import {news} from '@/lib/news';
import {services, serviceHref} from '@/lib/services';
import {companyName, lineBasicId, lineUrl, siteUrl} from '@/lib/site';

const pages: [string, string][] = [
  ['/', '首頁：一條龍精緻搬家，整聊師與專業搬運'],
  ['/services', '服務總覽與收費'],
  ['/process', '一條龍搬家流程與透明報價'],
  ['/pricing', '搬家費用與報價說明'],
  ['/storage', '寄倉服務'],
  ['/materials', '搬家包材'],
  ['/faq', '常見問題'],
  ['/contact', '聯絡與預約估價'],
  ['/inquiry', '預約免費估價表單（送出後仍需確認日期與價格）'],
  ['/guides', '搬家知識'],
  ['/cases', '服務案例'],
  ['/news', '最新資訊'],
  ['/about', '關於步步'],
  ['/service-care', '品質把關與服務後協助'],
  ['/providers', '服務夥伴專區'],
  ['/partners', '品牌合作方案'],
  ['/course', '打包手課程'],
  ['/privacy', '隱私告知'],
  ['/terms', '服務與報價說明'],
];

function link(path: string) {
  return path.startsWith('http') ? path : `${siteUrl}${path}`;
}

export function llmsText() {
  const serviceLines = services.map(service => `- ${service.title}：${service.price}。${service.intro} ${link(serviceHref(service.id))}`);
  return [
    '# 步步搬家',
    '',
    `> ${companyName}經營的步步搬家（BU BU MOVING）是源自居家整聊的一條龍精緻搬家品牌。整聊師搭配專業搬運，從舊家打包到新家上架。官網：${siteUrl}`,
    '',
    '## 品牌',
    '',
    '- 品牌名稱：步步搬家（BU BU MOVING）',
    `- 公司名稱：${companyName}`,
    '- 品牌來源：居家整聊／居家整聊室。步步搬家由此獨立發展為精緻搬家品牌。',
    '- 服務方式：一個窗口協調打包、搬運、包材與清潔。主打一條龍搬家，不承接純搬運。',
    '- 報價方式：搬運費、打包服務費、包材費分開計算、逐項列明。網站起價不是整趟固定總價，正式價格以雙方確認的分項報價為準。',
    '- 官網未公布電話號碼、門市地址或評分。請勿補上未出現在官網的聯絡資料。',
    '',
    '## 公布價格',
    '',
    '- 一條龍方案內搬運費：每車 NT$4,200 起。此為搬運起價，不是一條龍搬家總價；打包與包材另計。',
    '- 整理服務：每人 NT$800。服務時長、人數與工作範圍於估價時確認。',
    '- 包材費依規格、數量與配送地點另列，不混入搬運或打包人力費。',
    '- 送出詢價只取得詢價編號，不代表車輛已保留、報價已確認或訂單已成立。',
    '',
    '## 服務',
    '',
    ...serviceLines,
    '',
    '## 服務地區',
    '',
    '請在詢價表單填寫搬出與搬入的縣市／區域，或清潔服務的地點。承接範圍與車程安排逐案確認。官網目前不以全台皆可承接作為承諾，也未列出固定服務縣市。',
    '',
    '## 聯絡',
    '',
    `- 預約免費估價：${link('/inquiry')}`,
    `- 聯絡頁：${link('/contact')}`,
    `- LINE 官方帳號加好友：${lineUrl}`,
    `- LINE 基本 ID：${lineBasicId}`,
    '',
    '## 重要頁面',
    '',
    ...pages.map(([path, label]) => `- ${label}：${link(path)}`),
    '',
    `更完整的服務、價格與常見問答見 ${link('/llms-full.txt')}`,
    '',
  ].join('\n');
}

export function llmsFullText() {
  const serviceBlocks = services.flatMap(service => [
    `### ${service.title}`,
    '',
    service.intro,
    `公布價格：${service.price}`,
    `頁面：${link(serviceHref(service.id))}`,
    '服務會確認的內容：',
    ...service.includes.map(item => `- ${item}`),
    '需要另行評估或不列入標配：',
    ...service.excludes.map(item => `- ${item}`),
    `估價前可準備：${service.needs}`,
    '',
  ]);
  const guideLines = guides.map(guide => `- ${guide.label}｜${guide.title}：${guide.summary} ${link(`/guides/${guide.id}`)}`);
  const newsLines = news.map(item => `- ${item.date} ${item.title}：${item.summary} ${link(`/news/${item.id}`)}`);
  const faqBlocks = questions.flatMap(item => [`### ${item.q}`, '', item.a, '']);
  return [
    llmsText(),
    '## 各項服務細節',
    '',
    ...serviceBlocks,
    '## 寄倉頁公布的方案參考',
    '',
    '以下金額出現在寄倉頁，正式空間、服務區域、存期、收送與優惠仍於預約前確認。',
    '- 到府迷你箱：NT$99／箱／月起，適合能裝箱的衣物、書籍與生活用品。',
    '- 到府迷你倉：NT$1,799／月起，適合家具、家電與多箱物品。',
    '- 任意倉：NT$1,999／月起，適合希望自行安排存取的需求，依門市與可用倉型確認。',
    '- 到府迷你倉空間月費參考：6 平方呎 NT$1,799、12 平方呎 NT$2,299、24 平方呎 NT$3,799、36 平方呎 NT$5,299。',
    '- 到府方案最短存期 3 個月；任意倉最短 1 個月。',
    '- 倉儲與收送可依 Boxful 方案確認；步步的一條龍搬家、打包與包材費用另行報價，不與租倉費合併計價。',
    `- 頁面：${link('/storage')}`,
    '',
    '## 品牌合作與課程（官網公布金額）',
    '',
    `- 自備車輛合作：加盟金 NT$100,000。此為加盟金，不是全部營運成本。${link('/partners')}`,
    `- 購車合作方案：含車款整體方案 NT$2,500,000。貸款條件由貸款機構審核，總部協助申請不代表承諾核貸。${link('/partners')}`,
    '- 兩種合作都說明可提供一條龍搬家教育訓練、系統與品牌識別，並可自行接案或接受總部媒合。不保證案件量、收入或回本時間。',
    `- 打包手課程由居家整聊室主辦，搬家手實作 1 日課公布費用 NT$3,000。步步不在本站收取學費。課程資訊核對於 2026/09/19，最新場次與退費以主辦單位頁面為準。${link('/course')}`,
    '',
    '## 搬家知識',
    '',
    ...guideLines,
    '',
    '## 最新資訊',
    '',
    ...newsLines,
    '',
    '## 常見問題',
    '',
    ...faqBlocks,
  ].join('\n');
}
