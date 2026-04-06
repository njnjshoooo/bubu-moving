
import React, { useState } from 'react';
import { Home, Building2, Trash2, Truck, Sparkles, Layers, Warehouse, Plus, Minus, ChevronDown } from 'lucide-react';
import { ServiceItem } from '../types';

// 核心搬運服務 (大圖卡片)
const mainServices: ServiceItem[] = [
  {
    id: 'home',
    title: '家庭搬家',
    description: '提供經濟型與精緻型方案。從大型家具防護到免動手打包，滿足不同家庭的搬運需求。',
    icon: Home,
    image: 'https://picsum.photos/id/101/600/400',
  },
  {
    id: 'office',
    title: '企業搬遷',
    description: '專案經理規劃，OA屏風拆組、電腦設備與文件打包，將營運中斷時間降至最低。',
    icon: Building2,
    image: 'https://picsum.photos/id/1/600/400',
  },
  {
    id: 'long-distance',
    title: '長途/回頭車',
    description: '全台服務，專車直送或配合回頭車方案。GPS定位追蹤，確保物品安全準時抵達。',
    icon: Truck,
    image: 'https://picsum.photos/id/104/600/400',
  },
];

// 加值服務 (功能卡片)
const valueAddedServices = [
  {
    id: 'organizing',
    title: '整理收納',
    description: '搬家前的斷捨離與新居動線規劃。由專業收納師協助分類，讓新家井然有序。',
    icon: Layers,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'waste',
    title: '廢棄物清理',
    description: '家具汰舊換新免煩惱。我們提供合法清運服務，大型家具、家電直接幫您載走。',
    icon: Trash2,
    color: 'bg-red-50 text-red-600',
  },
  {
    id: 'storage',
    title: '倉儲服務',
    description: '裝潢空窗期的最佳選擇。24小時恆溫除濕、保全監控，租期彈性，物品存放超安心。',
    icon: Warehouse,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'cleaning',
    title: '新舊家清潔',
    description: '退租清潔還原、新居裝潢細清。專業清潔團隊進駐，讓您輕鬆拎包入住。',
    icon: Sparkles,
    color: 'bg-teal-50 text-teal-600',
  },
];

interface ServicesProps {
  // No specific props needed for now
}

const Services: React.FC<ServicesProps> = () => {
  const [showValueAdded, setShowValueAdded] = useState(false);

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-brand-600 font-bold tracking-wide uppercase text-sm mb-3">Our Services</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900">全方位搬運與生活服務</h3>
          <div className="w-24 h-1.5 bg-brand-500 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* Core Services (Grid with Images) */}
        <div className="mb-8">
            <h4 className="text-2xl font-bold text-gray-800 mb-8 border-l-4 border-brand-500 pl-4">專業搬運服務</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mainServices.map((service) => (
                <div key={service.id} className="group rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white flex flex-col">
                <div className="relative h-56 overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 bg-brand-900/20 group-hover:bg-brand-900/10 transition-colors z-10"></div>
                    <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-sm z-20">
                    <service.icon className="w-6 h-6 text-brand-600" />
                    </div>
                </div>
                <div className="p-8 flex flex-col flex-grow">
                    <h4 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-600 transition-colors">{service.title}</h4>
                    <p className="text-gray-600 leading-relaxed mb-4 flex-grow">{service.description}</p>
                </div>
                </div>
            ))}
            </div>
        </div>

        {/* Interactive Divider */}
        <div className="relative py-12">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center z-10">
                <button 
                  onClick={() => setShowValueAdded(!showValueAdded)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold tracking-widest text-sm transition-all duration-300 shadow-sm border-2 ${
                    showValueAdded 
                      ? 'bg-brand-50 border-brand-200 text-brand-700' 
                      : 'bg-white border-brand-100 text-brand-600 hover:bg-brand-50 hover:scale-105'
                  }`}
                >
                    {showValueAdded ? (
                      <>
                        <Minus size={16} />
                        收起加值服務
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        PLUS + 顯示加值生活服務
                        <ChevronDown size={16} className="animate-bounce mt-1" />
                      </>
                    )}
                </button>
            </div>
        </div>

        {/* Value Added Services (Collapsible Grid) */}
        <div className={`transition-all duration-700 ease-in-out overflow-hidden ${
            showValueAdded ? 'max-h-[2000px] opacity-100 mb-12' : 'max-h-0 opacity-0 mb-0'
        }`}>
             <div className="flex items-center justify-between mb-8 pt-4">
                 <h4 className="text-2xl font-bold text-gray-800 border-l-4 border-blue-500 pl-4">加值生活服務</h4>
                 <span className="text-sm text-gray-500 hidden sm:block">不僅是搬家，更是美好生活的開始</span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {valueAddedServices.map((service) => (
                     <div key={service.id} className="bg-gray-50 rounded-xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100 group">
                         <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${service.color}`}>
                             <service.icon className="w-7 h-7" />
                         </div>
                         <h5 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h5>
                         <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
                     </div>
                 ))}
             </div>
        </div>
      </div>
    </section>
  );
};

export default Services;