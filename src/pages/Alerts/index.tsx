import React, { useState } from 'react';
import { AlertTriangle, XCircle, Printer, Truck, ArrowLeft } from 'lucide-react';
import { Product, ShopSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { StockBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, determineStockStatus, formatDate } from '../../utils/formatters';

interface AlertsPageProps {
  products: Product[];
  shopSettings?: ShopSettings | null;
  onQuickPurchase: (productId: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  products,
  shopSettings,
  onQuickPurchase,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'low' | 'out'>('low');

  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.lowStockThreshold
  );

  const outOfStockProducts = products.filter((p) => p.currentStock <= 0);

  const currentList = activeTab === 'low' ? lowStockProducts : outOfStockProducts;

  const handlePrint = () => {
    window.print();
  };

  const shopName = language === 'mr' && shopSettings?.shopNameMr
    ? shopSettings.shopNameMr
    : shopSettings?.shopName || 'Malhar Tools';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('alerts.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('alerts.subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
          onClick={handlePrint}
          className="shadow-2xs"
        >
          {t('common.print')} {activeTab === 'low' ? t('alerts.printLowStock') : t('alerts.printOutOfStock')}
        </Button>
      </div>

      {/* Printable Sheet Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h2 className="text-2xl font-black text-slate-900">{shopName}</h2>
        <p className="text-sm text-slate-600">{shopSettings?.address || 'Hardware & Tools Merchant'}</p>
        <p className="text-xs text-slate-500">Contact: {shopSettings?.contactNumber || ''}</p>
        <div className="mt-4 flex justify-between items-center text-xs font-bold border-t pt-2">
          <span>
            REPORT: {activeTab === 'low' ? 'LOW STOCK REORDER SHEET' : 'OUT OF STOCK ITEMS REPORT'}
          </span>
          <span>DATE: {formatDate(new Date())}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveTab('low')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'low'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>{t('alerts.lowStockTitle')}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
            {lowStockProducts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('out')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'out'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <XCircle className="w-4 h-4 text-rose-600" />
          <span>{t('alerts.outOfStockTitle')}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800">
            {outOfStockProducts.length}
          </span>
        </button>
      </div>

      {/* List content */}
      {currentList.length === 0 ? (
        <EmptyState
          icon={activeTab === 'low' ? <AlertTriangle className="w-8 h-8 text-amber-500" /> : <XCircle className="w-8 h-8 text-rose-500" />}
          title={activeTab === 'low' ? t('alerts.emptyLowStock') : t('alerts.emptyOutOfStock')}
          description="Hardware items will automatically appear here when current stock reaches or dips below alert limits."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider print:bg-white print:border-b-2">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">{t('products.name')}</th>
                <th className="py-3 px-4">{t('products.category')}</th>
                <th className="py-3 px-4 text-center">{t('alerts.currentStock')}</th>
                <th className="py-3 px-4 text-center">{t('alerts.threshold')}</th>
                <th className="py-3 px-4 text-right">{t('products.purchasePrice')}</th>
                <th className="py-3 px-4 text-right print:hidden">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm print:divide-slate-200">
              {currentList.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>
                      <span>{p.name}</span>
                      {p.description && (
                        <p className="text-xs text-slate-400 font-normal">{p.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{p.category}</td>
                  <td className="py-3 px-4 text-center font-black font-mono">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs ${
                        p.currentStock <= 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.currentStock} {p.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs text-slate-500">
                    {p.lowStockThreshold} {p.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                    {formatCurrency(p.purchasePrice)}
                  </td>
                  <td className="py-3 px-4 text-right print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Truck className="w-3.5 h-3.5 text-blue-600" />}
                      onClick={() => onQuickPurchase(p.id)}
                    >
                      Order Stock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
