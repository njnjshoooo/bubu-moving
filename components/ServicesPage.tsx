
import React, { useEffect, useState } from 'react';
import { CheckCircle, HelpCircle, AlertCircle, ArrowRight, Trash2, Warehouse, Sparkles, Layers, ChevronDown, ChevronUp, MapPin, UserCheck, Package, BadgePercent, Star, Quote, ChevronLeft, ChevronRight, Wrench, Paintbrush, Monitor, Hammer, Wallet, PowerOff, LayoutGrid, Key, ClipboardCheck } from 'lucide-react';

interface ServicesPageProps {
  onNavigateHome: () => void;
}

const faqItems = [
    { 
        q: "需要提前多久預約搬家？", 
        a: "建議平日提前 1-2 週，週末或月底及農曆年前等旺季，建議提前 3-4 週預約，以免向隅。提早預約不僅能確保檔期，我們也能更周全地為您規劃搬運細節。" 
    },
    { 
        q: "會有隱藏費用嗎？", 
        a: "步步搬家堅持透明報價。只要搬運內容與環境條件與估價時相符（如有無電梯、樓層、車輛能否停靠門口等資訊無誤），絕不現場加價。簽約時我們會詳細列出所有費用項目，保障雙方權益。" 
    },
    { 
        q: "紙箱需要自己準備嗎？", 
        a: "對於簽約客戶，我們可依據合約內容提供免費紙箱（數量依車次或方案約定），您也可以另外加購包材。如果您選擇的是「精緻搬家」方案，則由我們準備所有專業包材並包含打包服務。" 
    },
    { 
        q: "下雨天會搬家嗎？", 
        a: "一般雨天我們會使用防雨布、膠膜妥善覆蓋物品，並加強車輛遮雨措施，風雨無阻。但若遇颱風假或豪大雨達到危險標準，為了人員與物品安全，我們會主動與您聯繫協調延期，且不收取延期費用。" 
    },
    {
        q: "搬家當天我需要做什麼？",
        a: "若您選擇標準搬家，請務必在搬運前將物品打包裝箱完畢，貴重物品（現金、珠寶、證件）請自行隨身攜帶。搬運當天請協助指引車輛停靠位置，並確認物品搬上車後，隨同前往新居或確認定位。"
    }
];

const testimonials = [
    {
      id: 1,
      name: '王先生',
      service: '家庭精緻搬家 - 台北市',
      content: '原本很擔心家裡的古董傢俱，但步步的師傅包裝真的超級仔細，連邊角都有特別加強。搬到新家後還幫忙定位，真正做到了免動手入住，太值得了！',
      rating: 5
    },
    {
      id: 2,
      name: '林小姐',
      service: '企業辦公室搬遷 - 內湖科',
      content: '公司有幾十台電腦和大型影印機，團隊拆裝非常熟練，完全沒有影響到隔天的正常上班。專案經理的溝通也很順暢，讓行政部門省了很多心。',
      rating: 5
    },
    {
      id: 3,
      name: '陳太太',
      service: '長途回頭車 - 桃園往高雄',
      content: '剛好搭上回頭車的檔期，價格比專車優惠很多！雖然是共乘，但物品都有區隔開來，送到高雄時一樣完好如初，GPS追蹤也讓我隨時知道車子到哪了。',
      rating: 5
    },
    {
      id: 4,
      name: '張先生',
      service: '廢棄物清運與倉儲 - 新北市',
      content: '裝潢期間把家具暫存在步步的倉庫，環境很乾淨還有空調。後來裝潢好的廢棄物也是請他們處理，一條龍服務真的幫了大忙。',
      rating: 5
    }
];

const precautions = [
  {
    icon: Wallet,
    title: "貴重物品隨身攜帶",
    desc: "現金、存摺、首飾、印章、重要證件等貴重物品，請務必自行攜帶，勿放入搬家紙箱中。",
    color: "text-amber-600",
    bgColor: "bg-amber-50"
  },
  {
    icon: PowerOff,
    title: "水電瓦斯關閉確認",
    desc: "離開舊居前，請確認關閉所有電源開關、水龍頭及瓦斯總閥，並拍照記錄電表、水表度數。",
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    icon: LayoutGrid,
    title: "櫃位抽屜清空固定",
    desc: "所有櫥櫃內的物品請清空裝箱，抽屜請上鎖或用膠帶固定，避免搬運傾斜時滑出損毀。",
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  {
    icon: MapPin,
    title: "預留停車位與動線",
    desc: "請事先聯繫管委會預留電梯及貨車停車位，確保搬運當天車輛能靠近日門口以節省工時。",
    color: "text-green-600",
    bgColor: "bg-green-50"
  },
  {
    icon: Key,
    title: "新居鑰匙與門禁",
    desc: "出發前確認帶好新家的鑰匙或感應扣，以免人員抵達新居後無法進入，增加等待費用。",
    color: "text-red-600",
    bgColor: "bg-red-50"
  },
  {
    icon: ClipboardCheck,
    title: "物品點收與核對",
    desc: "到達新居後，請依據清單點收物品數量。若發現異常，請當場向領班反映並註記於合約單上。",
    color: "text-teal-600",
    bgColor: "bg-teal-50"
  }
];

const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigateHome }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  // 當組件掛載時，滾動到頂部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 輪播自動播放
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleEstimateClick = () => {
    onNavigateHome();
    // 延遲以確保切換回首頁後再滾動
    setTimeout(() => {
      const element = document.getElementById('estimate');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="pt-20 bg-gray-50 min-h-screen animate-fade-in">
      {/* Header Banner */}
      <div className="bg-brand-600 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">我們的專業服務項目</h1>
            <p className="text-xl text-brand-100 max-w-3xl mx-auto">
                從個人小套房到大型企業總部，步步搬家提供最細膩的客製化搬運方案。
                <br className="hidden md:inline"/>不只是搬運物品，更是搬運您對未來生活的期待。
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        
        {/* Service Section 1: Residential */}
        <section id="residential" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <span className="text-brand-600 font-bold tracking-wider text-sm uppercase">Residential Moving</span>
                <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">家庭搬家：標準 vs 一條龍</h2>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                    我們理解每個家庭的需求與預算不同。因此我們提供兩種主要方案供您選擇：
                </p>
                
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-brand-500">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">📦 標準搬家 (經濟型)</h3>
                        <p className="text-gray-600 mb-3">適合預算有限、小家庭 or 租屋族。</p>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle size={18} className="text-green-500 mt-0.5" />
                                <span>大型家具基本防護（膠膜、毯子）</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle size={18} className="text-green-500 mt-0.5" />
                                <span>客戶需自行將雜物打包裝箱</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle size={18} className="text-green-500 mt-0.5" />
                                <span>師傅負責搬運與家具定位</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-900">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">✨ 一條龍搬家 (精緻型)</h3>
                        <p className="text-gray-600 mb-3">適合忙碌、家中有長輩或物品貴重的客戶。</p>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle size={18} className="text-green-500 mt-0.5" />
                                <span>全程由專人代客打包（含耗材提供）</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle size={18} className="text-green-500 mt-0.5" />
                                <span>易碎品氣泡紙加強包裝</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle size={18} className="text-green-500 mt-0.5" />
                                <span>新居拆箱定位歸位（可選購）</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="h-full min-h-[400px] rounded-2xl overflow-hidden shadow-xl relative group">
                <img src="https://picsum.photos/id/1070/800/800" alt="家庭搬家" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                     <p className="text-white text-lg font-medium">用心對待每一個家，讓搬家成為期待。</p>
                </div>
            </div>
        </section>

        {/* Service Section 2: Commercial */}
        <section id="commercial" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lg:flex-row-reverse">
             <div className="order-2 lg:order-1 h-full min-h-[400px] rounded-2xl overflow-hidden shadow-xl relative group">
                <img src="https://picsum.photos/id/1/800/800" alt="企業搬遷" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                     <p className="text-white text-lg font-medium">效率至上，將營運中斷時間降至最低。</p>
                </div>
            </div>
            <div className="order-1 lg:order-2">
                <span className="text-brand-600 font-bold tracking-wider text-sm uppercase">Commercial Moving</span>
                <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">企業與辦公室搬遷</h2>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                    企業搬遷不僅是物品的移動，更是資產的盤點與轉移。我們擁有豐富的商辦搬遷經驗，從事前規劃到現場執行，皆有專案經理全程控管。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                         "OA 屏風拆組服務", "伺服器與精密儀器搬運", "大型會議桌拆裝", "文件資料裝箱與編號", "配合大樓管委會規範", "提供正式報價單與發票"
                     ].map((item, idx) => (
                         <div key={idx} className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                             <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                             <span className="font-medium text-gray-700">{item}</span>
                         </div>
                     ))}
                </div>
            </div>
        </section>

        {/* Service Section 3: Long Distance Moving */}
        <section id="long-distance" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden my-12">
             <div className="grid grid-cols-1 lg:grid-cols-2">
                 <div className="p-8 md:p-12 flex flex-col justify-center order-2 lg:order-1">
                     <span className="text-brand-600 font-bold tracking-wider text-sm uppercase">Long Distance & Backhaul</span>
                     <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">長途搬家與回頭車服務</h2>
                     <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                         跨縣市搬遷路途遙遠，面對不同地區的道路規範與長途運輸的風險，步步搬家提供最安心的解決方案。我們具備全台服務網絡，無論是北漂南遷或返鄉定居，都能使命必達。
                     </p>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
                         {/* Feature 1 */}
                         <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3 mb-1">
                                 <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                     <MapPin size={20} />
                                 </div>
                                 <h4 className="font-bold text-gray-900 text-lg">GPS 全程追蹤</h4>
                             </div>
                             <p className="text-gray-600 text-sm leading-relaxed pl-12 -mt-2">
                                 車隊全面配備 GPS 定位系統，您可以隨時掌握車輛位置與預計抵達時間，消除長途運輸的焦慮感。
                             </p>
                         </div>
                         
                         {/* Feature 2 */}
                         <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3 mb-1">
                                 <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                     <UserCheck size={20} />
                                 </div>
                                 <h4 className="font-bold text-gray-900 text-lg">專人單一窗口</h4>
                             </div>
                             <p className="text-gray-600 text-sm leading-relaxed pl-12 -mt-2">
                                 長途搬運變數多，我們安排專屬客服或隊長作為單一窗口，隨時協調跨縣市的停車動線與特殊規範。
                             </p>
                         </div>

                         {/* Feature 3 */}
                         <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3 mb-1">
                                 <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                     <Package size={20} />
                                 </div>
                                 <h4 className="font-bold text-gray-900 text-lg">強化防護裝箱</h4>
                             </div>
                             <p className="text-gray-600 text-sm leading-relaxed pl-12 -mt-2">
                                 針對高速公路長途行駛的震動，我們會特別加強易碎品包裝與疊貨固定，確保物品在數百公里的旅途中完好如初。
                             </p>
                         </div>

                         {/* Feature 4 */}
                         <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3 mb-1">
                                 <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                     <BadgePercent size={20} />
                                 </div>
                                 <h4 className="font-bold text-gray-900 text-lg">回頭車優惠方案</h4>
                             </div>
                             <p className="text-gray-600 text-sm leading-relaxed pl-12 -mt-2">
                                 配合既有車趟的回程空車，提供高達 6-8 折的運費優惠。適合時間彈性、物品不多的客戶，共享資源更環保。
                             </p>
                         </div>
                     </div>
                 </div>
                 
                 <div className="relative h-64 lg:h-auto min-h-[400px] order-1 lg:order-2">
                     <img 
                         src="https://picsum.photos/id/1036/800/800" 
                         alt="長途搬家卡車" 
                         className="absolute inset-0 w-full h-full object-cover"
                     />
                     <div className="absolute inset-0 bg-brand-900/10"></div>
                     <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-white/50 max-w-xs hidden sm:block">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Live Tracking</span>
                        </div>
                        <p className="text-xs text-gray-600">您的物品正在安全運送中，距離目的地還有 120km。</p>
                     </div>
                 </div>
             </div>
        </section>

        {/* Service Section 4: Value Added Services */}
        <section id="value-added" className="py-8">
             <div className="text-center mb-12">
                 <span className="text-brand-600 font-bold tracking-wider text-sm uppercase">One-Stop Solution</span>
                 <h2 className="text-3xl font-bold text-gray-900 mt-2">全方位加值服務</h2>
                 <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                     搬家前後的麻煩事，交給步步搬家一次解決。我們提供一條龍的服務體驗，讓您無需多方聯繫，省時又省力。
                 </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                 {/* Card 1: Organizing */}
                 <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
                     <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500 transition-colors">
                         <Layers className="w-7 h-7 text-purple-600 group-hover:text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">整理收納</h3>
                     <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                         搬家是重整生活的最佳時機。我們提供專業收納師服務，協助您在搬家前進行「斷捨離」，並在搬入後進行動線規劃。
                     </p>
                     <ul className="space-y-2 mt-auto">
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-purple-500"/> 空間動線規劃諮詢</li>
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-purple-500"/> 系統化分類與標籤</li>
                     </ul>
                 </div>

                 {/* Card 2: Waste */}
                 <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
                     <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-red-500 transition-colors">
                         <Trash2 className="w-7 h-7 text-red-600 group-hover:text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">廢棄物清運</h3>
                     <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                         免追垃圾車！搬家淘汰的舊家具、壞掉的家電，我們協助清運至合法處理廠。省去您自行拆解與聯絡清潔隊的麻煩。
                     </p>
                     <ul className="space-y-2 mt-auto">
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-red-500"/> 合法環保處理證明</li>
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-red-500"/> 大型家具免動手拆卸</li>
                     </ul>
                 </div>

                 {/* Card 3: Storage */}
                 <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
                     <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
                         <Warehouse className="w-7 h-7 text-blue-600 group-hover:text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">倉儲服務</h3>
                     <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                         適合裝潢空窗期、出國短期存放或公司文件暫存。我們與專業倉儲合作，提供恆溫、除濕、24小時保全監控的環境。
                     </p>
                     <ul className="space-y-2 mt-auto">
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-blue-500"/> 短租/長租彈性選擇</li>
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-blue-500"/> 進櫃出櫃全程搬運</li>
                     </ul>
                 </div>

                 {/* Card 4: Cleaning */}
                 <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
                     <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-500 transition-colors">
                         <Sparkles className="w-7 h-7 text-teal-600 group-hover:text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">新舊家清潔</h3>
                     <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                         還房東前需要恢復原狀？或是新家裝潢後粉塵很多？我們的專業清潔團隊，為您進行深層清潔，讓您優雅交屋、安心入住。
                     </p>
                     <ul className="space-y-2 mt-auto">
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-teal-500"/> 舊屋退租清潔 / 裝潢細清</li>
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-teal-500"/> 居家除蟎消毒</li>
                     </ul>
                 </div>

                 {/* Card 5: Furniture Assembly */}
                 <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
                     <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
                         <Hammer className="w-7 h-7 text-orange-600 group-hover:text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">家具拆裝</h3>
                     <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                         IKEA、系統櫃或大型床組拆裝。我們具備專業工具與經驗，確保家具拆解後能完美組裝還原，穩固如初。
                     </p>
                     <ul className="space-y-2 mt-auto">
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-orange-500"/> 系統家具拆組</li>
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-orange-500"/> DIY家具代客組裝</li>
                     </ul>
                 </div>

                 {/* Card 6: Simple Repair */}
                 <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
                     <div className="w-14 h-14 bg-yellow-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-yellow-500 transition-colors">
                         <Paintbrush className="w-7 h-7 text-yellow-600 group-hover:text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">簡易油漆修繕</h3>
                     <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                         搬運後牆面不小心刮傷？或舊家需簡易補漆交屋？我們提供小範圍的補土與油漆修補服務，解決牆面瑕疵。
                     </p>
                     <ul className="space-y-2 mt-auto">
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-yellow-500"/> 牆面孔洞補土</li>
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-yellow-500"/> 局部污漬遮蓋</li>
                     </ul>
                 </div>

                 {/* Card 7: TV Mounting */}
                 <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group">
                     <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-500 transition-colors">
                         <Monitor className="w-7 h-7 text-indigo-600 group-hover:text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-3">電視壁掛安裝</h3>
                     <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                         新居牆面鑽孔與電視架安裝。依據牆面材質（水泥、輕隔間）選用合適工法，確保電視懸掛安全美觀。
                     </p>
                     <ul className="space-y-2 mt-auto">
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-indigo-500"/> 水平校正安裝</li>
                        <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-indigo-500"/> 線路收納整理</li>
                     </ul>
                 </div>
             </div>
        </section>

        {/* Pricing Comparison */}
        <section className="bg-white rounded-3xl shadow-lg p-8 md:p-12 border border-gray-100">
             <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900">收費標準說明</h2>
                <p className="text-gray-500 mt-2">公開透明，絕不坐地起價</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Method 1 */}
                <div className="border border-gray-200 rounded-2xl p-6 hover:border-brand-400 transition-colors">
                    <h3 className="text-2xl font-bold text-brand-600 mb-2">🚛 搬家服務</h3>
                    <p className="text-gray-500 text-sm mb-6 border-b border-gray-100 pb-4">
                        實際搬運車數 × 每車單價
                    </p>
                    <div className="space-y-4">
                        <p className="text-gray-700">
                            <span className="font-bold">適用對象：</span> 一般家庭、物品數量不確定者。
                        </p>
                        <p className="text-gray-700">
                            <span className="font-bold">計算方式：</span>
                            以3.5噸標準貨車為單位，裝滿一車算一車的費用。若最後一車未滿半車，則以半車計價（需視合約內容而定）。
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                            <p>費用包含：車趟費、包材費、基本防護。</p>
                            <p>額外費用：樓層費（無電梯）、步行距離過長、特殊拆卸。</p>
                        </div>
                    </div>
                </div>

                {/* Method 2 */}
                <div className="border border-gray-200 rounded-2xl p-6 hover:border-brand-400 transition-colors">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">📋 懶人搬家（一條龍搬家）</h3>
                    <p className="text-gray-500 text-sm mb-6 border-b border-gray-100 pb-4">
                        懶人搬家的最佳選擇
                    </p>
                     <div className="space-y-4">
                        <p className="text-gray-700">
                            <span className="font-bold">適用對象：</span> 企業搬遷、精緻搬家、有小孩家庭、忙碌的人。
                        </p>
                        <p className="text-gray-700">
                            <span className="font-bold">計算方式：</span>
                            由估價師到府或線上視訊，評估所有需搬運物品及環境後，提供包含打包、拆箱、包材、車趟等費用。
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                             <p>優點：從物品打包到新家拆上架，有專人處理好。</p>
                             <p>注意：需明確列出搬運清單，清單外物品可能需另外計費。</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 text-center bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                 <div className="flex items-center justify-center gap-2 text-yellow-800 font-bold mb-1">
                    <AlertCircle size={20} />
                    <span>重要提醒</span>
                 </div>
                 <p className="text-sm text-yellow-800/80">
                     實際報價請以官方提供的報價單為準。特殊物品（如鋼琴、金庫、原木桌）請務必事先告知，以免產生爭議。
                 </p>
            </div>
        </section>

        {/* FAQ Section with Accordion */}
        <section className="max-w-4xl mx-auto w-full">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">常見問題 FAQ</h2>
            <div className="space-y-4">
                {faqItems.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                        <button
                            onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                            className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-gray-50 transition-colors focus:outline-none group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openFaqIndex === idx ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-500'}`}>
                                    <HelpCircle size={18} />
                                </div>
                                <span className={`font-bold text-lg transition-colors ${openFaqIndex === idx ? 'text-brand-700' : 'text-gray-800 group-hover:text-brand-600'}`}>
                                    {item.q}
                                </span>
                            </div>
                            {openFaqIndex === idx ? (
                                <ChevronUp className="text-brand-500 flex-shrink-0" />
                            ) : (
                                <ChevronDown className="text-gray-400 flex-shrink-0 group-hover:text-gray-600" />
                            )}
                        </button>
                        <div 
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${openFaqIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                        >
                            <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50/30">
                                <div className="pl-12">
                                     {item.a}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* Moving Day Precautions Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                   <AlertCircle size={14} />
                   Moving Day Checklist
                </div>
                <h2 className="text-3xl font-bold text-gray-900">搬家當日注意事項</h2>
                <p className="text-gray-500 mt-3 max-w-2xl mx-auto">為了讓搬運過程更加順暢並保護您的財產安全，請在搬家當天務必配合以下事項。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {precautions.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-5 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div className={`flex-shrink-0 w-12 h-12 ${item.bgColor} ${item.color} rounded-xl flex items-center justify-center`}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-brand-600 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white shadow-xl">
                 <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-full">
                        <UserCheck size={28} className="text-white" />
                    </div>
                    <div>
                        <p className="text-brand-100 text-sm font-medium">如有任何疑問？</p>
                        <h4 className="text-xl font-bold">歡迎隨時連繫我們的搬運領班</h4>
                    </div>
                 </div>
                 <a href="tel:0912345678" className="bg-white text-brand-600 px-8 py-3 rounded-full font-bold hover:bg-brand-50 transition-colors shadow-md">
                    撥打專線
                 </a>
            </div>
        </section>

        {/* Testimonials Carousel */}
        <section className="bg-brand-900 rounded-3xl p-8 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
                <Quote size={200} className="text-white transform translate-x-1/3 -translate-y-1/3" />
            </div>

            <div className="relative z-10">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">聽聽客戶怎麼說</h2>
                    <p className="text-brand-200">超過 1000+ 個家庭與企業的安心選擇</p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div 
                        key={currentTestimonial}
                        className="bg-white rounded-2xl p-8 md:p-10 shadow-2xl relative min-h-[250px] flex flex-col justify-center animate-fade-in"
                    >
                        <div className="flex justify-center mb-6">
                            {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current mx-0.5" />
                            ))}
                        </div>
                        
                        <blockquote className="text-xl md:text-2xl text-gray-800 text-center font-medium leading-relaxed mb-8">
                            "{testimonials[currentTestimonial].content}"
                        </blockquote>

                        <div className="text-center border-t border-gray-100 pt-6">
                            <cite className="not-italic font-bold text-gray-900 text-lg block mb-1">
                                {testimonials[currentTestimonial].name}
                            </cite>
                            <span className="text-brand-600 text-sm font-medium">
                                {testimonials[currentTestimonial].service}
                            </span>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button 
                            onClick={prevTestimonial}
                            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                            aria-label="Previous review"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        
                        <div className="flex gap-2">
                            {testimonials.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentTestimonial(idx)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                        currentTestimonial === idx ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'
                                    }`}
                                    aria-label={`Go to review ${idx + 1}`}
                                />
                            ))}
                        </div>

                        <button 
                            onClick={nextTestimonial}
                            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                            aria-label="Next review"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Footer */}
        <div className="bg-brand-50 rounded-3xl p-8 md:p-16 text-center">
             <h2 className="text-3xl font-bold text-gray-900 mb-4">準備好開始您的搬遷了嗎？</h2>
             <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                 無論您選擇哪種服務方案，步步搬家都將全力以赴。
                 現在就使用我們的線上估價工具，快速獲得報價概算。
             </p>
             <button
                onClick={handleEstimateClick}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-brand-700 hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                <span className="text-lg">前往免費線上估價</span>
                <ArrowRight />
              </button>
        </div>

      </div>
    </div>
  );
};

export default ServicesPage;
