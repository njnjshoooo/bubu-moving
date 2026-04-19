
import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, ShoppingCart, ArrowRight, Info, Lightbulb } from 'lucide-react';
import { supabase, T, Product } from '../lib/supabase';

interface SuppliesPageProps {
  onOrder: (summary: string) => void;
}

const SuppliesPage: React.FC<SuppliesPageProps> = ({ onOrder }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    supabase.from(T.products)
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  useEffect(() => {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
      const product = products.find(p => p.id === id);
      return sum + (product ? product.price * qty : 0);
    }, 0);
    setTotalPrice(total);
  }, [cart, products]);

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const currentQty = prev[id] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const newCart = { ...prev, [id]: newQty };
      if (newQty === 0) delete newCart[id];
      return newCart;
    });
  };

  const handleCheckout = () => {
    if (totalPrice === 0) return;
    const lines = Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === id);
        return product ? `・${product.name} x ${qty} = $${product.price * qty}` : '';
      })
      .filter(Boolean);
    const summary = `【包材訂購需求】\n${lines.join('\n')}\n\n預估總金額：$${totalPrice} (未含運費)`;
    onOrder(summary);
  };

  return (
    <div className="pt-20 bg-gray-50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="bg-brand-600 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">專業搬家包材選購</h1>
            <p className="text-xl text-brand-100 max-w-2xl mx-auto">
                工欲善其事，必先利其器。使用專業級的防護材料，讓您的愛物在搬運過程中得到最完善的保護。
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-10 rounded-r-lg flex items-start gap-3">
            <Info className="text-blue-500 mt-1 flex-shrink-0" />
            <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">運費與配送說明</p>
                <ul className="list-disc ml-5 space-y-1">
                    <li>若已預約搬家服務，包材可於搬運當天由專車送達（免運費）。</li>
                    <li>若需提前配送，雙北地區滿 $2000 免運，未滿酌收 $150 運費。</li>
                    <li><strong>偏遠地區</strong>、山區或外島運費另計，實際金額請洽客服確認。</li>
                </ul>
            </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-24">
            {products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group">
                    <div className="relative h-52 bg-gray-100 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package size={48} />
                          </div>
                        )}
                        {product.is_popular && (
                            <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                                熱銷推薦
                            </div>
                        )}
                        {product.specs && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10">
                              {product.specs}
                          </div>
                        )}
                    </div>

                    <div className="p-5 flex-grow flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand-600 transition-colors">{product.name}</h3>
                             <span className="font-bold text-brand-600 text-lg">${product.price}</span>
                        </div>

                        {product.description && (
                          <p className="text-gray-500 text-xs mb-4 leading-relaxed line-clamp-2">
                              {product.description}
                          </p>
                        )}

                        {/* 用途說明區塊 */}
                        {product.usage_tip && (
                          <div className="bg-brand-50 rounded-lg p-3 mb-4 border border-brand-100">
                              <div className="flex items-center gap-1.5 text-brand-700 font-bold text-xs mb-1">
                                  <Lightbulb size={14} className="text-brand-500" />
                                  <span>專家用途建議：</span>
                              </div>
                              <p className="text-brand-900 text-xs leading-relaxed">
                                  {product.usage_tip}
                              </p>
                          </div>
                        )}

                        {/* Quantity Control */}
                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-400 font-medium">選購數量</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => updateQuantity(product.id, -1)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                        (cart[product.id] || 0) > 0
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                    }`}
                                    disabled={!(cart[product.id] || 0)}
                                >
                                    <Minus size={16} />
                                </button>
                                <span className={`font-bold w-6 text-center ${(cart[product.id] || 0) > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                    {cart[product.id] || 0}
                                </span>
                                <button
                                    onClick={() => updateQuantity(product.id, 1)}
                                    className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 flex items-center justify-center transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>暫無商品</p>
          </div>
        )}

      </div>

      {/* Floating Cart Bar (Bottom) */}
      <div className={`fixed bottom-0 left-0 w-full bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-100 transition-transform duration-300 z-40 px-4 py-4 md:py-6 ${
          totalPrice > 0 ? 'translate-y-0' : 'translate-y-full'
      }`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                  <div className="bg-brand-100 p-3 rounded-full text-brand-600 relative">
                      <ShoppingCart size={24} />
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {Object.values(cart).reduce((a, b) => a + b, 0)}
                      </span>
                  </div>
                  <div>
                      <p className="text-gray-500 text-sm">預估總金額</p>
                      <p className="text-2xl font-bold text-gray-900">${totalPrice.toLocaleString()}</p>
                  </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                  <p className="hidden md:block text-sm text-gray-500 mr-2">
                      訂單將送至客服確認庫存與配送方式
                  </p>
                  <button
                    onClick={handleCheckout}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all transform hover:-translate-y-1"
                  >
                      <span>立即訂購</span>
                      <ArrowRight size={20} />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default SuppliesPage;
