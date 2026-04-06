
import React from 'react';
import { ShieldCheck, Clock, BadgeDollarSign, HeartHandshake, ArrowRight, Award, Star } from 'lucide-react';
import { Feature } from '../types';

const features: Feature[] = [
  {
    title: '價格透明',
    description: '絕不事後加價，估價單即為最終收費，誠信經營是我們的核心原則。',
    icon: BadgeDollarSign,
  },
  {
    title: '專業認證團隊',
    description: '舊家打包跟新家上架，皆由經過專業認證的「整聊師」服務，讓搬家也能享有極致收納體驗。',
    icon: Award,
  },
  {
    title: '客戶滿意度5星好評',
    description: '超過千位客戶真實見證，Google 評論 5 星好評，服務品質與態度有口皆碑。',
    icon: Star,
  },
  {
    title: '專業保護',
    description: '使用高品質包材，針對家具家電提供多層防護，確保搬運過程零損傷。',
    icon: ShieldCheck,
  },
  {
    title: '準時高效',
    description: '嚴格遵守約定時間，不拖延、不遲到，高效率完成搬運任務。',
    icon: Clock,
  },
  {
    title: '損壞賠償',
    description: '若因搬運疏失造成物品損壞，我們提供完善的理賠機制，讓您無後顧之憂。',
    icon: HeartHandshake,
  },
];

interface FeaturesProps {
  onReadMore?: () => void;
}

const Features: React.FC<FeaturesProps> = ({ onReadMore }) => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-brand-600 font-bold tracking-wide uppercase text-sm mb-3">Why Choose Us</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900">為什麼選擇步步搬家？</h3>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
            我們不僅僅是搬運工，更是您喬遷之喜的最佳夥伴。
          </p>
        </div>

        {/* Updated grid to 3 columns for 6 items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 group"
            >
              <div className="w-16 h-16 bg-brand-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-500 transition-colors duration-300">
                <feature.icon className="w-8 h-8 text-brand-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {onReadMore && (
          <div className="text-center">
             <button 
                onClick={onReadMore}
                className="inline-flex items-center justify-center px-8 py-4 border border-brand-200 text-lg font-bold rounded-full text-brand-700 bg-white shadow-lg hover:bg-brand-50 hover:border-brand-300 hover:-translate-y-1 transition-all group"
              >
                查看完整服務介紹與估價方式
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Features;
