
import React, { useState, useEffect } from 'react';
import { Calculator, Truck, Users, Package, Info, Home, Building, User, Coins, Clock, Laptop, Briefcase, FileArchive } from 'lucide-react';
import { EstimationData } from '../App';

interface EstimationProps {
  onEstimate: (data: EstimationData) => void;
}

const Estimation: React.FC<EstimationProps> = ({ onEstimate }) => {
  const [moveType, setMoveType] = useState<'self' | 'full' | 'enterprise'>('full');
  const [area, setArea] = useState<number>(20); // 坪數
  const [roomType, setRoomType] = useState<string>('2room');
  const [enterpriseItemType, setEnterpriseItemType] = useState<'furniture' | 'electronics' | 'archives'>('furniture');
  const [itemDensity, setItemDensity] = useState<number>(1.2); // 1.2: 正常
  const [elevatorStatus, setElevatorStatus] = useState<string>('elevator');
  const [result, setResult] = useState({ 
    trucks: 0, 
    people: 0, 
    hours: 0,
    truckCost: 0,
    laborCost: 0,
    supplyCost: 0,
    totalCost: 0
  });

  // 估算邏輯
  useEffect(() => {
    let perTruckPings = 10;

    if (moveType === 'enterprise') {
       // 強化物品多寡對企業搬遷的影響係數
       let densityBase = 14; 
       if (itemDensity === 0.8) densityBase = 22; // 極簡辦公室
       if (itemDensity === 1.2) densityBase = 14; // 標準
       if (itemDensity === 1.8) densityBase = 8;  // 極度密集

       // 物品類型加權
       let typeMult = 1.0;
       if (enterpriseItemType === 'electronics') typeMult = 0.8; // 電子設備需緩衝空間
       if (enterpriseItemType === 'archives') typeMult = 0.6;    // 檔案文件重且體積扎實

       perTruckPings = densityBase * typeMult;
    } else {
       // 家庭 & 自助
       if (itemDensity === 0.8) perTruckPings = 14; 
       if (itemDensity === 1.2) perTruckPings = 10; 
       if (itemDensity === 1.8) perTruckPings = 7;  
    }

    let calculatedTrucks = Math.ceil(area / perTruckPings);
    if (calculatedTrucks < 1) calculatedTrucks = 1;

    // 2. 人力配置與工時計算
    let calculatedPeople = 0;
    let estimatedHours = 0;

    if (moveType !== 'self') {
        // 分層人力配置邏輯 (Tiered System)
        if (calculatedTrucks <= 2) calculatedPeople = 2;
        else if (calculatedTrucks <= 4) calculatedPeople = 3;
        else calculatedPeople = 4; // 5車以上

        // 若無電梯(需爬樓梯)且車數大於1，建議增加 1 人
        if (elevatorStatus !== 'elevator' && calculatedTrucks > 1) {
            calculatedPeople += 1;
        }

        // 工時估算 (假設每車平均需要 3.5 人時)
        let totalManHours = calculatedTrucks * 3.5;
        
        // 樓梯加成 (工時增加 30%)
        if (elevatorStatus !== 'elevator') {
            totalManHours *= 1.3;
        }

        // 計算總工時 (總人時 / 人數)
        estimatedHours = Math.ceil(totalManHours / calculatedPeople);
        if (estimatedHours < 2) estimatedHours = 2; // 最低出車基本工時
    }

    // 3. 費用計算
    const TRUCK_RATE = 3500;
    const LABOR_RATE = 700; // 每人每小時
    const SUPPLY_RATE_PER_PING = 150; // 預估包材費每坪

    const truckCost = calculatedTrucks * TRUCK_RATE;
    const laborCost = (moveType === 'self' ? 0 : calculatedPeople * estimatedHours * LABOR_RATE);
    const supplyCost = area * SUPPLY_RATE_PER_PING;

    const totalCost = truckCost + laborCost + supplyCost;

    setResult({ 
        trucks: calculatedTrucks, 
        people: (moveType === 'self' ? 0 : calculatedPeople), 
        hours: estimatedHours,
        truckCost,
        laborCost,
        supplyCost,
        totalCost
    });
  }, [area, roomType, itemDensity, moveType, elevatorStatus, enterpriseItemType]);

  const handleConsultationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    onEstimate({
      area,
      roomType,
      moveType,
      enterpriseItemType: moveType === 'enterprise' ? enterpriseItemType : undefined,
      elevatorStatus,
      trucks: result.trucks,
      people: result.people,
      estimatedHours: result.hours,
      truckCost: result.truckCost,
      laborCost: result.laborCost,
      supplyCost: result.supplyCost,
      totalCost: result.totalCost
    });

    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="estimate" className="py-20 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-brand-600 font-bold tracking-wide uppercase text-sm mb-3">Cost Calculator</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900">費用試算</h3>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
            透明公開的計費標準，輸入需求，立即獲得預算概估。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Calculator Input */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-brand-100 rounded-lg text-brand-600">
                <Calculator size={24} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">第一步：選擇服務與環境</h4>
            </div>

            <div className="space-y-8">
              {/* Move Type Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-3">服務類型</label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setMoveType('self')}
                        className={`flex flex-col md:flex-row items-center justify-center gap-2 py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                            moveType === 'self'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
                        }`}
                    >
                        <User size={18} />
                        自助搬家
                    </button>
                    <button
                        onClick={() => setMoveType('full')}
                        className={`flex flex-col md:flex-row items-center justify-center gap-2 py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                            moveType === 'full'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
                        }`}
                    >
                        <Home size={18} />
                        一條龍搬家
                    </button>
                    <button
                        onClick={() => setMoveType('enterprise')}
                        className={`flex flex-col md:flex-row items-center justify-center gap-2 py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                            moveType === 'enterprise'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
                        }`}
                    >
                        <Building size={18} />
                        企業搬遷
                    </button>
                </div>
              </div>

              {/* Area Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-bold text-gray-700">坪數大小 (室內)</label>
                  <span className="text-brand-600 font-bold text-lg">{area} 坪</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={area}
                  onChange={(e) => setArea(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              {/* Enterprise Specific: Item Types */}
              {moveType === 'enterprise' && (
                <div className="animate-fade-in">
                    <label className="block font-bold text-gray-700 mb-3">主要搬遷內容</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setEnterpriseItemType('furniture')}
                            className={`flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-lg text-xs font-medium transition-all border ${
                                enterpriseItemType === 'furniture'
                                ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-brand-200'
                            }`}
                        >
                            <Briefcase size={16} />
                            辦公家具
                        </button>
                        <button
                            onClick={() => setEnterpriseItemType('electronics')}
                            className={`flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-lg text-xs font-medium transition-all border ${
                                enterpriseItemType === 'electronics'
                                ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-brand-200'
                            }`}
                        >
                            <Laptop size={16} />
                            電子設備
                        </button>
                        <button
                            onClick={() => setEnterpriseItemType('archives')}
                            className={`flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-lg text-xs font-medium transition-all border ${
                                enterpriseItemType === 'archives'
                                ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-brand-200'
                            }`}
                        >
                            <FileArchive size={16} />
                            檔案文件
                        </button>
                    </div>
                </div>
              )}

              {/* Room Type (Only for Residential) */}
              {moveType !== 'enterprise' && (
                <div>
                    <label className="block font-bold text-gray-700 mb-3">房屋格局</label>
                    <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'studio', label: '套房 / 一房' },
                        { id: '2room', label: '兩房一廳' },
                        { id: '3room', label: '三房兩廳' },
                        { id: '4room', label: '四房以上' },
                    ].map((type) => (
                        <button
                        key={type.id}
                        onClick={() => setRoomType(type.id)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                            roomType === type.id
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
                        }`}
                        >
                        {type.label}
                        </button>
                    ))}
                    </div>
                </div>
              )}

              {/* Floor / Elevator */}
              <div>
                <label className="block font-bold text-gray-700 mb-3">樓層與電梯狀況</label>
                <select
                    value={elevatorStatus}
                    onChange={(e) => setElevatorStatus(e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-200 text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none bg-white"
                >
                    <option value="elevator">雙邊皆有電梯</option>
                    <option value="origin_stairs">僅遷出地需走樓梯</option>
                    <option value="dest_stairs">僅遷入地需走樓梯</option>
                    <option value="both_stairs">雙邊皆需走樓梯</option>
                </select>
              </div>

              {/* Item Density */}
              <div>
                <label className="block font-bold text-gray-700 mb-3">物品多寡程度</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: 0.8, label: '極簡', desc: '僅大型家具' },
                    { val: 1.2, label: '一般', desc: '家具+雜物' },
                    { val: 1.8, label: '很多', desc: '堆滿雜物' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setItemDensity(item.val)}
                      className={`py-3 px-2 rounded-lg transition-all flex flex-col items-center justify-center ${
                        itemDensity === item.val
                          ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-200 ring-offset-1'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      <span className="font-bold">{item.label}</span>
                      <span className={`text-xs mt-1 ${itemDensity === item.val ? 'text-brand-100' : 'text-gray-400'}`}>
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="bg-brand-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300">
             {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-black opacity-10 blur-2xl"></div>

            <div className="relative z-10 border-b border-brand-500 pb-6 mb-6">
                <h4 className="text-xl font-bold mb-1 opacity-90">預估費用總計</h4>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">${result.totalCost.toLocaleString()}</span>
                    <span className="text-brand-200 text-sm">(含稅)</span>
                </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold">搬家專車 (3.5噸)</p>
                        <p className="text-brand-200 text-xs">建議配置：{result.trucks} 台</p>
                    </div>
                </div>
                <p className="text-xl font-bold">${result.truckCost.toLocaleString()}</p>
              </div>

              {moveType !== 'self' ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold">打包上架專員</p>
                            <p className="text-brand-200 text-xs">建議配置：{result.people} 人</p>
                        </div>
                    </div>
                    <p className="text-xl font-bold">${result.laborCost.toLocaleString()}</p>
                </div>
              ) : (
                 <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold">打包上架專員</p>
                            <p className="text-brand-200 text-xs">自助搬家不含人力</p>
                        </div>
                    </div>
                    <p className="text-xl font-bold">$0</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold">基礎包材預估</p>
                        <p className="text-brand-200 text-xs">紙箱、防護材料等</p>
                    </div>
                </div>
                <p className="text-xl font-bold">${result.supplyCost.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-brand-500 relative z-10">
              {moveType !== 'self' && (
                 <div className="flex items-center gap-2 mb-4 bg-brand-700/50 p-3 rounded-lg">
                    <Clock className="w-4 h-4 text-brand-200" />
                    <p className="text-sm text-brand-100">
                        預計作業時間：約 <span className="text-white font-bold">{result.hours}</span> 小時
                    </p>
                 </div>
              )}
              
              <button
                onClick={handleConsultationClick}
                className="block w-full text-center bg-white text-brand-600 font-bold py-4 rounded-xl hover:bg-brand-50 transition-colors shadow-lg cursor-pointer transform active:scale-95 duration-150"
              >
                帶著試算結果，預約正式報價
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Estimation;
