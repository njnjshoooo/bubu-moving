
import React, { useEffect, useState } from 'react';
import { Camera, Calendar, MapPin, ArrowRight, Star, Quote, Truck, Building, Home, Gem } from 'lucide-react';

interface CaseStudy {
  id: number;
  title: string;
  category: string;
  categoryIcon: React.ReactNode;
  location: string;
  date: string;
  image: string;
  description: string;
  testimonial: string;
  author: string;
}

const caseStudies: CaseStudy[] = [
  {
    id: 1,
    title: '信義區三房兩廳精緻搬家案例',
    category: '家庭搬家',
    categoryIcon: <Home size={16} />,
    location: '台北市 信義區',
    date: '2023-12-15',
    image: 'https://picsum.photos/id/101/800/600',
    description: '客戶為年輕小家庭，擁有大量精細電子設備與精品家具。我們採用一條龍服務，由整聊師先行分類打包，並使用高強度氣泡布與專屬防護箱確保物品零損傷。',
    testimonial: '沒想到搬家可以這麼輕鬆，整聊師幫我把衣櫥整理得比搬家前還整齊，師傅們搬運鋼琴時的細心程度也讓我大開眼界。',
    author: '王小姐'
  },
  {
    id: 2,
    title: '內湖科學園區百人辦公室遷址專案',
    category: '企業搬遷',
    categoryIcon: <Building size={16} />,
    location: '台北市 內湖區',
    date: '2023-11-02',
    image: 'https://picsum.photos/id/1/800/600',
    description: '大型科技公司搬遷，包含 120 組 OA 辦公桌拆組、伺服器機櫃搬運。我們出動 5 台 3.5 噸貨車，利用週末 48 小時內完成，確保員工週一能準時恢復營運。',
    testimonial: '專案經理在事前場勘和動線規劃做得非常完美，配合大樓管委會的加班規範也非常到位，是一個非常專業的團隊。',
    author: '林經理'
  },
  {
    id: 3,
    title: '桃園往高雄——長途回頭車優惠案例',
    category: '長途/回頭車',
    categoryIcon: <Truck size={16} />,
    location: '桃園市 → 高雄市',
    date: '2023-10-20',
    image: 'https://picsum.photos/id/1036/800/600',
    description: '客戶返鄉定居，行李量約兩車。我們精準媒合了南下回頭車，為客戶省下近 30% 的運費，並全程開啟 GPS 讓客戶能掌握即時進度。',
    testimonial: '雖然是回頭車但服務完全不打折，師傅態度非常好，GPS 追蹤功能讓我在高雄端準備接貨時心裡很踏實。',
    author: '陳先生'
  },
  {
    id: 4,
    title: '天母別墅區古董家具與藝術品搬運',
    category: '特殊物件',
    categoryIcon: <Gem size={16} />,
    location: '台北市 士林區',
    date: '2023-09-05',
    image: 'https://picsum.photos/id/1070/800/600',
    description: '包含大型紅木家具與多幅名畫搬運。我們使用客製化木箱防護，並派遣資深領班親自監督裝載與固定程序。',
    testimonial: '這些家具是我多年的收藏，步步搬家的防護措施做得很足夠，交給他們我很放心。',
    author: '張老先生'
  },
  {
    id: 5,
    title: '中和區舊公寓廢棄物清運與粉刷',
    category: '加值服務',
    categoryIcon: <Star size={16} />,
    location: '新北市 中和區',
    date: '2023-08-12',
    image: 'https://picsum.photos/id/133/800/600',
    description: '租客退租後，房東委託清運老舊家具與雜物，並進行室內全屋油漆粉刷，兩天內完成後立即恢復可出租狀態。',
    testimonial: '一次解決了清垃圾跟刷油漆兩個問題，省去我聯絡兩家廠商的時間，效率真的很高。',
    author: '黃小姐 (房東)'
  },
  {
    id: 6,
    title: '新莊區迷你倉儲寄放六個月專案',
    category: '倉儲服務',
    categoryIcon: <Star size={16} />,
    location: '新北市 新莊區',
    date: '2023-07-25',
    image: 'https://picsum.photos/id/119/800/600',
    description: '客戶因裝潢延遲，需將家具暫存。我們提供 24 小時除濕倉儲，並在裝潢完工後第一時間送回並協助定位。',
    testimonial: '倉庫環境非常乾燥，沙發拿回來時完全沒有霉味。搬運工人們也很細心，沒有因為只是暫存就隨便疊。',
    author: '李先生'
  }
];

interface CaseStudyPageProps {
  onNavigateHome: () => void;
}

const CaseStudyPage: React.FC<CaseStudyPageProps> = ({ onNavigateHome }) => {
  const [filter, setFilter] = useState('全部');
  const categories = ['全部', '家庭搬家', '企業搬遷', '長途/回頭車', '特殊物件', '加值服務'];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredCases = filter === '全部' 
    ? caseStudies 
    : caseStudies.filter(c => c.category === filter || (filter === '加值服務' && ['加值服務', '倉儲服務'].includes(c.category)));

  return (
    <div className="pt-20 bg-gray-50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="bg-brand-600 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">案例分享與好評</h1>
            <p className="text-xl text-brand-100 max-w-2xl mx-auto">
                每一次搬遷，都是一段信任的開始。我們記錄下真實的搬運場景，讓您看見步步搬家的專業與用心。
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-6 py-2 rounded-full font-bold transition-all ${
                        filter === cat 
                        ? 'bg-brand-600 text-white shadow-md' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Case Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {filteredCases.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group flex flex-col">
                    <div className="relative h-60 overflow-hidden">
                        <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-600 flex items-center gap-1.5 shadow-sm">
                            {item.categoryIcon}
                            {item.category}
                        </div>
                    </div>
                    
                    <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-brand-600 transition-colors">
                            {item.title}
                        </h3>
                        
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                            {item.description}
                        </p>

                        {/* Testimonial snippet */}
                        <div className="mt-auto bg-gray-50 p-4 rounded-xl relative">
                            <Quote size={16} className="text-brand-200 absolute top-2 left-2" />
                            <p className="text-gray-700 text-xs italic pl-4 mb-2">"{item.testimonial}"</p>
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-500">— {item.author}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Trust Banner */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8 mb-16">
            <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 flex-shrink-0">
                <Camera size={40} />
            </div>
            <div className="flex-grow text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">想要看更多搬運現場照？</h3>
                <p className="text-gray-600">我們在 Facebook 粉絲專頁與 Instagram 上會不定期分享最新搬家側拍，歡迎追蹤我們！</p>
            </div>
            <div className="flex gap-4">
                 <button className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-md">
                     前往粉絲專頁
                 </button>
            </div>
        </div>

        {/* CTA */}
        <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">您的需求，我們也能量身打造</h2>
            <button 
                onClick={() => {
                    onNavigateHome();
                    setTimeout(() => {
                        document.getElementById('estimate')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-brand-700 transition-all transform hover:-translate-y-1"
            >
                立即開始費用試算
                <ArrowRight size={20} />
            </button>
        </div>

      </div>
    </div>
  );
};

export default CaseStudyPage;
