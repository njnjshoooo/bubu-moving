import React from 'react';
import { Truck, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
               <Truck className="h-8 w-8 text-brand-500" />
               <span className="font-bold text-2xl">步步搬家</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              專業、誠信、用心的搬家服務團隊。我們致力於為每一位客戶提供最安心的搬遷體驗，讓美好的新生活從步步開始。
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter size={20} /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-6 text-white">快速連結</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#hero" className="hover:text-brand-500 transition-colors">回到首頁</a></li>
              <li><a href="#about" className="hover:text-brand-500 transition-colors">關於我們</a></li>
              <li><a href="#services" className="hover:text-brand-500 transition-colors">服務項目</a></li>
              <li><a href="#process" className="hover:text-brand-500 transition-colors">服務流程</a></li>
              <li><a href="#faq" className="hover:text-brand-500 transition-colors">常見問題</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-lg mb-6 text-white">熱門服務</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#services" className="hover:text-brand-500 transition-colors">家庭搬家</a></li>
              <li><a href="#services" className="hover:text-brand-500 transition-colors">公司搬遷</a></li>
              <li><a href="#services" className="hover:text-brand-500 transition-colors">垃圾清運</a></li>
              <li><a href="#services" className="hover:text-brand-500 transition-colors">自助搬家</a></li>
            </ul>
          </div>

           {/* Contact Small */}
           <div>
            <h4 className="font-bold text-lg mb-6 text-white">聯絡資訊</h4>
            <ul className="space-y-3 text-gray-400">
              <li>電話：02 7755 0920</li>
              <li>信箱：service@tidyman.tw</li>
              <li>地址：台北市信義區松德路118巷3號 1樓</li>
              <li>營業時間：週一至週日 9:30–18:30</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} 步步搬家 BuBu Moving. All rights reserved.</p>
          <a href="/login" className="text-gray-600 hover:text-gray-400 transition-colors text-xs">
            員工後台
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;