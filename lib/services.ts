export const services = [
 {id:'01',code:'S01',title:'一條龍精緻搬家',price:'搬運費每車 NT$4,200 起；打包與包材另計',image:'brand/hero-logo.png',intro:'主打一條龍搬家，整合舊家打包、專業搬運與新家上架需求。搬運費、打包服務費、包材費分開報價，不承接純搬運。',includes:['舊家打包、搬運與新家上架需求整合評估','搬運費、打包服務費、包材費分開列明','依約定完成打包保護、搬運與交付'],excludes:['吊掛、鋼琴及超重物件需另行評估','跨境搬遷、倉儲與家電安裝不列為標配'],needs:'起迄地點、樓層／電梯、日期、主要家具及停車動線'},
 {id:'02',code:'S02',title:'打包整理與新家上架',price:'整理服務每人 NT$800',image:'brand/packing-logo.png',intro:'把忙亂留給我們一起整理。從舊家物品減量、分類打包，到新家拆箱上架與收納配置，依需求安排。',includes:['依約定範圍減量、分類與打包','新家拆箱上架、收納配置與採購可搭配','整理人數、時長與範圍事先確認'],excludes:['包材用量與費用另列','特殊收藏品與收納品採購費另行確認'],needs:'整理範圍、物品量、易碎物、預計日期與需要的人數'},
 {id:'03',code:'S04',title:'搬後與入住清潔',price:'依面積與項目專案估價',image:'brand/cleaning-logo.png',intro:'告別舊家，或迎接新家。依空間現況安排清潔，讓下一段生活從舒適開始。',includes:['空屋現況與清潔需求評估','約定區域與項目清潔','完工項目核對'],excludes:['裝潢細清、特殊污漬及高處作業需另評估','不預設所有設備拆洗'],needs:'地址、面積、空屋狀態、污漬與設備、可進場日期'},
 {id:'04',code:'S03',title:'包材銷售與配送',price:'依規格、數量與配送地點報價',image:'images/packing-materials.png',intro:'合適的紙箱與保護材，是安心搬家的第一步。告訴我們物品需求，再確認包材規格與交期。',includes:['紙箱與保護材料需求確認','規格、數量及配送費分列','供貨及到貨日期確認'],excludes:['不提供未確認庫存的交期承諾','包材出租與回收方式需另外確認'],needs:'包材種類、數量、配送地點及希望到貨日期'},
 {id:'05',code:'S05',title:'企業定期／專案清潔',price:'依據點、頻率與範圍報價',image:'images/office-cleaning.png',intro:'讓辦公室、商辦與社區的日常維護更有秩序。依需求安排專案或定期服務。',includes:['據點與作業範圍盤點','服務頻率與驗收條件約定','逐次服務紀錄'],excludes:['特殊清潔與高風險作業需評估','帳期、時段依個別合約確認'],needs:'公司名稱、據點、面積、頻率、時段及驗收窗口'},
 {id:'06',code:'S06',title:'家庭清運需求評估',price:'分類與資格確認後報價',image:'images/clearance-assessment.png',intro:'先了解物品來源、種類與數量，再評估合適的清運安排，由符合條件的合作方承接。',includes:['清運品項與來源盤點','承接範圍與供應方確認','報價與時程協調'],excludes:['不承接有害或醫療廢棄物','送出需求不代表已核准清運'],needs:'來源、種類、數量、地點與現場動線；照片可於客服聯繫後補充'}
, {id:'07',code:'S07',title:'寄倉服務',price:'依箱型、空間與寄放期間計費',image:'images/storage-hero.png',intro:'新家還沒準備好，先讓家具與箱物有個中繼站。依物品需求安排寄倉，步步協助銜接搬家。',includes:['依物品清單確認寄倉方案','確認寄放期間與費用','協調進倉及取回安排'],excludes:['存放條件與可收物品需事先確認','進出倉搬運、打包與包材費用於報價分項列明'],needs:'物品種類、尺寸與數量、預計進倉及取回日期、搬運地址'}
];
export const serviceNames={...Object.fromEntries(services.map(s=>[s.code,s.title])),J01:'品牌合作｜自備車輛',J02:'品牌合作｜購車方案',availability:'可配合時段與補充'} as Record<string,string>;
export const statuses=['待聯繫','待補件','評估中','已提供報價','已轉訂單','未成交'] as const;

export function serviceHref(id:string){return id==='04'?'/materials':id==='07'?'/storage':'/services/'+id;}
