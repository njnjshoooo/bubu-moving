
import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Truck, Calculator, LogIn, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageView } from '../App';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, profile } = useAuth();
  // 只有一般會員才在前台 Navbar 顯示帳號按鈕；後台員工不顯示（入口藏在 Footer）
  const isMember = !profile || profile.role === 'member';
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 判斷是否需要白色背景 (非首頁或已捲動)
  const needsWhiteBg = isScrolled || currentPage !== 'home';
  // 判斷文字顏色
  const textColor = needsWhiteBg ? 'text-gray-700 hover:text-brand-600' : 'text-white hover:text-brand-200 drop-shadow-sm';
  const logoBg = needsWhiteBg ? 'bg-brand-500' : 'bg-white';
  const logoIconColor = needsWhiteBg ? 'text-white' : 'text-brand-600';

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();
    setIsOpen(false);

    if (target === 'services-page') {
      onNavigate('services');
      return;
    }

    if (target === 'services-value-added') {
      onNavigate('services');
      // 等待頁面切換後滾動
      setTimeout(() => {
         const element = document.getElementById('value-added');
         if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    if (target === 'supplies-page') {
      onNavigate('supplies');
      return;
    }

    if (target === 'cases-page') {
      onNavigate('cases');
      return;
    }

    // 如果目標是首頁的錨點
    if (currentPage !== 'home') {
      onNavigate('home');
      // 給予一點時間讓頁面切換回去後再滾動
      setTimeout(() => {
        const element = document.getElementById(target);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      // 已經在首頁，直接滾動
      const element = document.getElementById(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else if (target === 'hero') {
         window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const navLinks = [
    { name: '首頁', target: 'hero' },
    { name: '服務詳情', target: 'services-page' },
    { name: '加值服務', target: 'services-value-added' },
    { name: '包材選購', target: 'supplies-page' },
    { name: '案例分享', target: 'cases-page' },
    { name: '關於我們', target: 'about' },
    { name: '費用試算', target: 'estimate' },
    { name: '預約到府估價', target: 'contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${needsWhiteBg ? 'bg-white shadow-lg py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="#" onClick={(e) => handleLinkClick(e, 'hero')} className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${logoBg}`}>
                <Truck className={`h-6 w-6 ${logoIconColor}`} />
              </div>
              <span className={`font-bold text-2xl ${needsWhiteBg ? 'text-gray-900' : 'text-white drop-shadow-md'}`}>
                步步搬家
              </span>
            </a>
          </div>

          {/* Desktop Menu */}
          <div className="hidden xl:flex items-center space-x-4 lg:space-x-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={`#${link.target}`}
                onClick={(e) => handleLinkClick(e, link.target)}
                className={`flex items-center gap-1 font-medium text-base lg:text-lg transition-colors ${textColor} 
                ${(currentPage === 'services' && link.target.includes('services')) || 
                  (currentPage === 'supplies' && link.target === 'supplies-page') ||
                  (currentPage === 'cases' && link.target === 'cases-page') ? 'text-brand-600 font-bold' : ''}`}
              >
                {link.name}
              </a>
            ))}
            <a
              href="tel:0912345678"
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-full font-bold transition-all transform hover:scale-105 shadow-md ml-2"
            >
              <Phone size={18} />
              <span>0912-345-678</span>
            </a>
            {/* 桌面版：只對一般會員顯示；後台員工不顯示 */}
            {user && isMember ? (
              <button
                onClick={() => navigate('/member')}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/40 text-white px-4 py-2 rounded-full font-medium text-sm transition-all backdrop-blur-sm"
                style={needsWhiteBg ? { background: 'rgb(124 58 237 / 0.08)', borderColor: 'rgb(124 58 237 / 0.3)', color: '#7c3aed' } : {}}
              >
                <User size={16} />
                我的帳號
              </button>
            ) : !user ? (
              <button
                onClick={() => navigate('/login')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all transform hover:scale-105 shadow-md ${
                  needsWhiteBg
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : 'bg-white hover:bg-brand-50 text-brand-600'
                }`}
              >
                <LogIn size={16} />
                會員登入
              </button>
            ) : null}
          </div>

           {/* Mobile: login + hamburger */}
           <div className="xl:hidden flex items-center gap-2">
            {/* 手機版登入按鈕（漢堡旁邊）：只對一般會員顯示；後台員工不顯示 */}
            {user && isMember ? (
              <button
                onClick={() => navigate('/member')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  needsWhiteBg ? 'bg-brand-500 text-white' : 'bg-white/20 border border-white/60 text-white'
                }`}
              >
                <User size={15} />
                帳號
              </button>
            ) : !user ? (
              <button
                onClick={() => navigate('/login')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                  needsWhiteBg
                    ? 'bg-brand-500 text-white'
                    : 'bg-white text-brand-600'
                }`}
              >
                <LogIn size={15} />
                會員登入
              </button>
            ) : null}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md ${needsWhiteBg ? 'text-gray-700' : 'text-white'}`}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="xl:hidden bg-white shadow-xl absolute top-full left-0 w-full border-t border-gray-100 max-h-[80vh] overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={`#${link.target}`}
                onClick={(e) => handleLinkClick(e, link.target)}
                className="block px-3 py-4 rounded-md text-base font-medium text-gray-700 hover:text-brand-600 hover:bg-brand-50 text-center border-b border-gray-50 last:border-0"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 pb-2 flex flex-col items-center gap-3">
              <a
                href="#estimate"
                onClick={(e) => handleLinkClick(e, 'estimate')}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
              >
                <Calculator size={18} />
                立即費用試算
              </a>
              {/* 手機選單內也顯示登入/帳號：只對一般會員顯示；後台員工不顯示 */}
              {user && isMember ? (
                <button
                  onClick={() => { setIsOpen(false); navigate('/member'); }}
                  className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-full font-semibold shadow-md"
                >
                  <User size={17} />
                  我的帳號
                </button>
              ) : !user ? (
                <button
                  onClick={() => { setIsOpen(false); navigate('/login'); }}
                  className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-full font-semibold shadow-md"
                >
                  <LogIn size={17} />
                  會員登入
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
