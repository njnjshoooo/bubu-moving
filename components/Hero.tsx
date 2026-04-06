
import React from 'react';
import { ArrowRight, Star } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://picsum.photos/id/1070/1920/1080"
          alt="Moving background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl text-white">
          <div className="flex items-center gap-2 mb-4 bg-white/20 backdrop-blur-sm w-fit px-4 py-1 rounded-full border border-white/30">
            <Star className="text-yellow-400 w-4 h-4 fill-current" />
            <span className="text-sm font-medium tracking-wide">客戶滿意度 No.1</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            一步到位，<br/>
            <span className="text-brand-500">步步</span>安心的搬家體驗
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-8 font-light leading-relaxed">
            我們把您的物品當作自己的珍寶。<br className="md:hidden"/>
            透明報價、專業保護、準時抵達。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#estimate"
              className="inline-flex justify-center items-center px-8 py-4 border border-transparent text-lg font-bold rounded-full text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-lg hover:shadow-brand-500/50"
            >
              免費線上估價
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href="tel:0912345678"
              className="inline-flex justify-center items-center px-8 py-4 border-2 border-white text-lg font-bold rounded-full text-white hover:bg-white hover:text-brand-900 transition-all"
            >
              電話諮詢
            </a>
          </div>
        </div>
      </div>
      
      {/* Decorative wave at bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[60px] md:h-[100px]">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-gray-50"></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
