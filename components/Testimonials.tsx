
import React from 'react';
import { Star, Quote } from 'lucide-react';
import { Testimonial } from '../types';

const reviews: Testimonial[] = [
  {
    id: 1,
    name: '陳小姐',
    role: '家庭搬家 - 台北市',
    content: '師傅們非常準時，而且動作超快！原本很擔心鋼琴搬運會有問題，結果他們非常專業地包裝和搬運，完全沒有刮傷。真心推薦步步搬家！',
    rating: 5,
  },
  {
    id: 2,
    name: '張先生',
    role: '辦公室搬遷 - 新北市',
    content: '我們公司有大量的OA屏風和電腦設備，步步的團隊拆裝非常熟練，讓我們第二天就能順利恢復上班，效率驚人，價格也很公道。',
    rating: 5,
  },
  {
    id: 3,
    name: '林太太',
    role: '廢棄物清運 - 桃園市',
    content: '老家要重新裝潢，有一堆舊家具要丟。原本很頭痛，還好找到步步搬家，連同不需要的雜物一次載走，省了我超多麻煩。',
    rating: 5,
  },
];

const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-brand-600 font-bold tracking-wide uppercase text-sm mb-3">Testimonials & Cases</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900">案例分享與好評</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <div key={review.id} className="bg-gray-50 p-8 rounded-2xl relative pt-12 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
              <div className="absolute -top-6 left-8 bg-brand-500 text-white p-3 rounded-xl shadow-lg">
                <Quote size={24} />
              </div>
              
              <div className="flex mb-4">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <p className="text-gray-700 italic mb-6 leading-relaxed min-h-[80px]">"{review.content}"</p>
              
              <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
                <div className="w-10 h-10 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 font-bold">
                    {review.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{review.name}</h4>
                  <p className="text-sm text-gray-500">{review.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
