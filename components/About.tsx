
import React from 'react';
import { Truck, Heart, Users, Target } from 'lucide-react';

const About: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-brand-600 font-bold tracking-wide uppercase text-sm mb-3">About Us</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900">關於步步搬家</h3>
          <div className="w-24 h-1.5 bg-brand-500 mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-brand-100 rounded-full opacity-50 z-0"></div>
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-brand-50 rounded-full opacity-50 z-0"></div>
            <img 
              src="https://picsum.photos/id/3/800/600" 
              alt="Team work" 
              className="relative z-10 rounded-2xl shadow-xl w-full object-cover h-[400px]"
            />
            <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur p-6 rounded-xl shadow-lg z-20 border-l-4 border-brand-500">
                <p className="text-gray-800 font-medium text-lg italic">
                    "一步一腳印，用心守護您的托付。"
                </p>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-2xl font-bold text-gray-900">步步到位，搬家安心</h4>
            <p className="text-gray-600 leading-relaxed text-lg">
              步步搬家 (BUBUMAN) 成立於 2010 年，我們深知搬家不只是物品的移動，更是生活場景的轉換。從創立之初，我們就堅持「透明報價、細心防護、視如己出」的三大原則。
            </p>
            <p className="text-gray-600 leading-relaxed text-lg">
              我們的團隊皆經過嚴格的職前訓練，不僅精通搬運技巧，更具備家具拆裝、簡易水電與收納整理的專業能力。我們致力於成為全台最值得信賴的搬家品牌，讓每一次的喬遷之喜，都能擁有最完美的開始。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-50 p-3 rounded-lg text-brand-600">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900">合法立案</h5>
                        <p className="text-sm text-gray-500">政府核准，契約保證</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-brand-50 p-3 rounded-lg text-brand-600">
                        <Heart size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900">細心呵護</h5>
                        <p className="text-sm text-gray-500">高規格防護包裝</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="bg-brand-50 p-3 rounded-lg text-brand-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900">專業團隊</h5>
                        <p className="text-sm text-gray-500">無菸無酒，素質優良</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="bg-brand-50 p-3 rounded-lg text-brand-600">
                        <Target size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900">精準效率</h5>
                        <p className="text-sm text-gray-500">準時抵達，迅速完工</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
