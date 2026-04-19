
import React, { useEffect, useState } from 'react';
import { Camera, Calendar, MapPin, ArrowRight, Quote, Truck, Building, Home, Gem, Star } from 'lucide-react';
import { supabase, T, CaseStudy } from '../lib/supabase';

function getCategoryIcon(category: string): React.ReactNode {
  switch (category) {
    case '家庭搬家':    return <Home size={16} />;
    case '企業搬遷':    return <Building size={16} />;
    case '長途/回頭車': return <Truck size={16} />;
    case '特殊物件':    return <Gem size={16} />;
    default:            return <Star size={16} />;
  }
}

interface CaseStudyPageProps {
  onNavigateHome: () => void;
}

const CaseStudyPage: React.FC<CaseStudyPageProps> = ({ onNavigateHome }) => {
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [filter, setFilter] = useState('全部');
  const categories = ['全部', '家庭搬家', '企業搬遷', '長途/回頭車', '特殊物件', '加值服務'];

  useEffect(() => {
    window.scrollTo(0, 0);
    supabase.from(T.caseStudies)
      .select('*')
      .eq('is_visible', true)
      .order('sort_order')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCases((data ?? []) as CaseStudy[]));
  }, []);

  const filteredCases = filter === '全部'
    ? cases
    : cases.filter(c => c.category === filter || (filter === '加值服務' && ['加值服務', '倉儲服務'].includes(c.category)));

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
                    <div className="relative h-60 overflow-hidden bg-gray-100">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        )}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-600 flex items-center gap-1.5 shadow-sm">
                            {getCategoryIcon(item.category)}
                            {item.category}
                        </div>
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            {item.location && <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>}
                            {item.work_date && <span className="flex items-center gap-1"><Calendar size={12} /> {item.work_date}</span>}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-brand-600 transition-colors">
                            {item.title}
                        </h3>

                        {item.description && (
                          <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                              {item.description}
                          </p>
                        )}

                        {/* Testimonial snippet */}
                        {item.testimonial && (
                          <div className="mt-auto bg-gray-50 p-4 rounded-xl relative">
                              <Quote size={16} className="text-brand-200 absolute top-2 left-2" />
                              <p className="text-gray-700 text-xs italic pl-4 mb-2">"{item.testimonial}"</p>
                              {item.author && (
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-500">— {item.author}</span>
                                </div>
                              )}
                          </div>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {filteredCases.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Camera size={48} className="mx-auto mb-4 opacity-30" />
            <p>尚無案例</p>
          </div>
        )}

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
