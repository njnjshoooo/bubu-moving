import React from 'react';
import { PhoneCall, Camera, FileText, Truck, Smile } from 'lucide-react';
import { ProcessStep } from '../types';

const steps: ProcessStep[] = [
  { id: 1, title: '來電諮詢', description: '電話或LINE初步了解需求', icon: PhoneCall },
  { id: 2, title: '免費估價', description: '線上照片估價或到府場勘', icon: Camera },
  { id: 3, title: '簽訂契約', description: '確認搬運日期與報價細節', icon: FileText },
  { id: 4, title: '進行搬運', description: '專業團隊準時抵達作業', icon: Truck },
  { id: 5, title: '完工驗收', description: '物品定位確認無誤後付款', icon: Smile },
];

const Process: React.FC = () => {
  return (
    <section id="process" className="py-20 bg-brand-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-brand-600 font-bold tracking-wide uppercase text-sm mb-3">Work Process</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900">簡單 5 步驟，輕鬆搬好家</h3>
        </div>

        <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
            {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 rounded-full bg-white border-4 border-brand-100 flex items-center justify-center shadow-lg mb-6 group-hover:border-brand-500 group-hover:scale-110 transition-all duration-300 relative">
                    <step.icon className="w-8 h-8 text-brand-600" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white">
                    {step.id}
                    </div>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h4>
                <p className="text-gray-600 text-sm max-w-[150px]">{step.description}</p>
                </div>
            ))}
            </div>
        </div>
        
        <div className="mt-16 text-center">
             <a href="#contact" className="inline-block px-10 py-4 bg-brand-600 text-white font-bold rounded-lg shadow-lg hover:bg-brand-700 hover:shadow-xl transition-all transform hover:-translate-y-1">
                開始第一步：預約諮詢
             </a>
        </div>
      </div>
    </section>
  );
};

export default Process;