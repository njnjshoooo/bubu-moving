
import React, { useState, useEffect } from 'react';
import { Send, Phone, MapPin, Mail, Clock, CheckCircle, ShoppingCart } from 'lucide-react';
import { EstimationData } from '../App';

interface ContactFormProps {
  prefilledData?: EstimationData | null;
  initialNote?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ prefilledData, initialNote }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    moveDate: '',
    fromLocation: '',
    toLocation: '',
    serviceType: '家庭搬家',
    notes: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  // 當從估價區塊跳轉過來時，自動填寫備註
  useEffect(() => {
    let noteContent = '';

    if (prefilledData) {
      const roomTypeMap: Record<string, string> = {
        'studio': '套房/一房',
        '2room': '兩房一廳',
        '3room': '三房兩廳',
        '4room': '四房以上'
      };

      const moveTypeMap: Record<string, string> = {
        'self': '自助搬家',
        'full': '一條龍搬家',
        'enterprise': '企業搬遷'
      };

      const enterpriseTypeMap: Record<string, string> = {
        'furniture': '辦公家具',
        'electronics': '電子設備',
        'archives': '檔案文件'
      };

      const elevatorMap: Record<string, string> = {
        'elevator': '雙邊皆有電梯',
        'origin_stairs': '遷出需走樓梯',
        'dest_stairs': '遷入需走樓梯',
        'both_stairs': '雙邊皆需走樓梯'
      };
      
      const readableRoom = roomTypeMap[prefilledData.roomType] || prefilledData.roomType;
      const readableMoveType = moveTypeMap[prefilledData.moveType] || '家庭搬家';
      const readableElevator = elevatorMap[prefilledData.elevatorStatus] || '有電梯';
      const readableEnterprise = prefilledData.enterpriseItemType ? enterpriseTypeMap[prefilledData.enterpriseItemType] : null;

      noteContent += `【費用試算結果】\n`;
      noteContent += `類型：${readableMoveType}\n`;
      noteContent += `坪數：${prefilledData.area} 坪\n`;
      
      if (prefilledData.moveType === 'enterprise' && readableEnterprise) {
        noteContent += `主要內容：${readableEnterprise}\n`;
      } else if (prefilledData.moveType !== 'enterprise') {
        noteContent += `格局：${readableRoom}\n`;
      }
      
      noteContent += `樓層狀況：${readableElevator}\n`;
      noteContent += `-------------------\n`;
      noteContent += `建議車數：${prefilledData.trucks} 車 (3.5噸)\n`;
      
      if (prefilledData.moveType === 'self') {
          noteContent += `人力配置：無 (自助搬家)\n`;
      } else {
          noteContent += `建議人力：${prefilledData.people} 人\n`;
          noteContent += `預估工時：${prefilledData.estimatedHours} 小時\n`;
      }
      noteContent += `-------------------\n`;
      noteContent += `試算總價：$${prefilledData.totalCost.toLocaleString()} (未稅)\n`;
      noteContent += `(含車資 $${prefilledData.truckCost} / 工資 $${prefilledData.laborCost} / 包材 $${prefilledData.supplyCost})\n\n`;
      
      setFormData(prev => ({
        ...prev,
        serviceType: readableMoveType
      }));
    }

    if (initialNote) {
      noteContent += `${initialNote}\n\n`;
    }

    if (noteContent) {
      noteContent += '我的其他需求：';
      setFormData(prev => ({
        ...prev,
        notes: noteContent,
        serviceType: initialNote ? '包材購買' : prev.serviceType
      }));
    }
  }, [prefilledData, initialNote]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setIsSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setFormData({
        name: '',
        phone: '',
        email: '',
        moveDate: '',
        fromLocation: '',
        toLocation: '',
        serviceType: '家庭搬家',
        notes: '',
    });
  };

  return (
    <section id="contact" className="py-20 bg-brand-600 text-white relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-500 opacity-50 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-brand-700 opacity-50 blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Contact Info */}
          <div>
            <h2 className="text-brand-200 font-bold tracking-wide uppercase text-sm mb-3">Contact Us</h2>
            <h3 className="text-4xl font-bold mb-6">預約到府估價</h3>
            <p className="text-brand-100 text-lg mb-10 leading-relaxed">
              有搬家需求嗎？填寫表單，我們將由專人與您聯繫確認。
              您也可以在備註欄註明希望「現場估價」的時段。
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/10 rounded-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">服務專線</h4>
                  <p className="text-brand-100 text-2xl font-bold font-mono mt-1">02 7755 0920</p>
                  <p className="text-brand-100 text-xs mt-1 opacity-80">週一至週日 9:30–18:30</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="p-3 bg-white/10 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Email</h4>
                  <p className="text-brand-100">service@tidyman.tw</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="p-3 bg-white/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">服務據點</h4>
                  <p className="text-brand-100">台北、新北、桃園、基隆<br/><span className="text-sm opacity-75">(全台皆可服務)</span></p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="p-3 bg-white/10 rounded-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">服務時間</h4>
                  <p className="text-brand-100">週一至週日 08:00 - 22:00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10 text-gray-800 min-h-[600px] flex flex-col justify-center transition-all duration-500">
            {isSubmitted ? (
              // Success View
              <div className="text-center animate-fade-in py-8">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">預約成功！</h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  感謝您選擇步步搬家。<br/>
                  我們的專員將於 24 小時內致電與您確認細節。
                </p>

                {formData.email && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 text-left inline-block w-full">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                         <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-blue-800 text-base">確認信已發送</p>
                        <p className="text-sm text-blue-600 mt-1">
                          系統已將您的預約詳情發送至：<br/>
                          <span className="font-medium underline break-all">{formData.email}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="w-full bg-brand-600 text-white font-bold py-4 rounded-lg hover:bg-brand-700 transition-colors shadow-lg"
                >
                  返回 / 再次預約
                </button>
              </div>
            ) : (
              // Form View
              <>
                {(prefilledData || initialNote) && (
                  <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-lg flex items-start gap-3">
                    <div className="bg-brand-500 text-white rounded-full p-1 mt-0.5 flex-shrink-0">
                      <CheckCircle size={12} />
                    </div>
                    <div>
                      <p className="text-brand-800 font-bold text-sm">
                        {initialNote ? '已帶入您的購物清單' : '已帶入您的費用試算結果'}
                      </p>
                      <p className="text-brand-600 text-xs mt-1">請填寫聯絡方式，客服將確認最終報價與細節。</p>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">姓名 *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-500 outline-none transition-all"
                        placeholder="王小明"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">聯絡電話 *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-500 outline-none transition-all"
                        placeholder="0912345678"
                      />
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">Email <span className="text-gray-400 font-normal text-xs">(選填，填寫可收確認信)</span></label>
                     <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-500 outline-none transition-all"
                        placeholder="example@email.com"
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">預計搬家/估價日期</label>
                      <input
                        type="date"
                        name="moveDate"
                        value={formData.moveDate}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">服務類型</label>
                      <select
                        name="serviceType"
                        value={formData.serviceType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-500 outline-none transition-all bg-white"
                      >
                        <option>家庭搬家</option>
                        <option>一條龍搬家</option>
                        <option>自助搬家</option>
                        <option>企業搬遷</option>
                        <option>廢棄物清運</option>
                        <option>倉儲寄放</option>
                        <option>包材購買</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">特殊需求或備註</label>
                    <textarea
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-500 outline-none transition-all resize-none font-mono text-sm"
                      placeholder="例如：有鋼琴、古董，或希望現場估價的時段..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-600 text-white font-bold py-4 rounded-lg hover:bg-brand-700 transition-colors shadow-lg flex justify-center items-center gap-2 group"
                  >
                    <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    送出預約資訊
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
