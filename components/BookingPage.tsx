import React, { useEffect, useState } from 'react';
import BookingCalendar from './BookingCalendar';
import {
  CheckCircle2, Calendar, ClipboardList, PhoneCall,
  ShieldCheck, Users, BadgeDollarSign, HeartHandshake,
  Phone, Mail, Clock, ChevronDown,
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: '到府估價需要收費嗎？',
    a: '完全免費！我們提供免費的到府估價服務，由專業顧問到您指定的地點，仔細評估物品數量、搬運環境、動線距離等，最後提供透明書面報價給您參考，不滿意可以不承接。',
  },
  {
    q: '需要多久前預約估價？',
    a: '建議至少在預計搬家日前 1~2 週預約到府估價，以利安排時段與規劃。若您需求急迫，也可直接來電 02 7755 0920，我們會盡力為您安排。',
  },
  {
    q: '到府估價大約需要多久？',
    a: '一般家庭約 20~40 分鐘，企業或特殊物件約 30~60 分鐘。顧問會詳細詢問您的物品、樓層、車輛停放等條件，並提供專業搬運建議。',
  },
  {
    q: '估價後會強制下單嗎？',
    a: '不會。估價後您會收到完整的書面報價單，可以與家人討論、比較多家後再決定，我們絕不會強迫推銷。',
  },
  {
    q: '若當天無法配合估價怎麼辦？',
    a: '我們也提供線上視訊估價服務。您只要用 LINE 或視訊通話帶我們看一下您的物品，一樣可以提供估價。歡迎來電告知您的偏好。',
  },
];

const HIGHLIGHTS = [
  { icon: BadgeDollarSign, title: '透明報價', desc: '書面報價，無隱藏費用' },
  { icon: ShieldCheck,     title: '全程保險', desc: '搬運過程意外保障' },
  { icon: Users,           title: '整聊師團隊', desc: '打包到拆箱一條龍' },
  { icon: HeartHandshake,  title: '用心服務', desc: '把您的物品當自己的寶物' },
];

const STEPS = [
  { icon: Calendar,      title: '1. 選擇時段',   desc: '選擇方便的估價時間，線上預約不用等客服回電' },
  { icon: ClipboardList, title: '2. 填寫資料',   desc: '姓名、聯絡方式、舊址與新址，一次搞定' },
  { icon: PhoneCall,     title: '3. 專人聯繫',   desc: '24 小時內由專業顧問與您確認細節，準時到府' },
];

export default function BookingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = '免費到府估價預約 | 步步搬家 BuBu Moving';
  }, []);

  return (
    <div className="pt-20 bg-gray-50 min-h-screen animate-fade-in">
      {/* ────────── Hero ────────── */}
      <section className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-sm tracking-widest text-brand-100 mb-3">FREE ESTIMATION</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            免費到府估價預約
          </h1>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto mb-8">
            線上選時段 → 填寫基本資料 → 專人聯繫確認<br/>
            <span className="text-base opacity-90">讓搬家從一通不用打的電話開始</span>
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <CheckCircle2 size={16} /> 完全免費
            </span>
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <CheckCircle2 size={16} /> 透明書面報價
            </span>
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <CheckCircle2 size={16} /> 不滿意不承接
            </span>
          </div>
        </div>
      </section>

      {/* ────────── 3 步驟 ────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">預約流程只要 3 步驟</h2>
        <p className="text-center text-gray-500 mb-12">簡單、快速、免等待</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all">
              <div className="w-14 h-14 mx-auto bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-4">
                <s.icon size={24} />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ────────── 預約表單（主要 CTA） ────────── */}
      <div id="book-form">
        <BookingCalendar />
      </div>

      {/* ────────── 為什麼選我們 ────────── */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">為什麼選擇步步搬家</h2>
          <p className="text-center text-gray-500 mb-12">一步到位，步步安心</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {HIGHLIGHTS.map((h, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-12 h-12 mx-auto bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 mb-3">
                  <h.icon size={22} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{h.title}</h3>
                <p className="text-xs text-gray-500">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── FAQ ────────── */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">常見問題</h2>
        <p className="text-center text-gray-500 mb-10">預約前想了解的一切</p>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-800">{item.q}</span>
                  <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                    <p className="pt-4">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ────────── 直接聯絡 ────────── */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">找不到方便的時段？</h2>
          <p className="text-gray-300 mb-8">直接與我們聯繫，我們為您安排專屬時段</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <a href="tel:0277550920" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-colors">
              <Phone size={20} className="mx-auto mb-2 text-brand-300" />
              <p className="text-xs text-gray-400 mb-1">服務專線</p>
              <p className="font-bold text-lg">02 7755 0920</p>
            </a>
            <a href="mailto:service@tidyman.tw" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-colors">
              <Mail size={20} className="mx-auto mb-2 text-brand-300" />
              <p className="text-xs text-gray-400 mb-1">電子信箱</p>
              <p className="font-bold break-all">service@tidyman.tw</p>
            </a>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <Clock size={20} className="mx-auto mb-2 text-brand-300" />
              <p className="text-xs text-gray-400 mb-1">服務時間</p>
              <p className="font-bold">週一至週日</p>
              <p className="text-sm text-gray-300">9:30 – 18:30</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            服務範圍：台北、新北、桃園、基隆（全台皆可服務）
          </p>
        </div>
      </section>
    </div>
  );
}
