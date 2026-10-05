import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  Calendar,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Truck,
  Users,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { Product, Purchase, Sale, Customer, StockMovement, ShopSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';

interface ReportsPageProps {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  customers: Customer[];
  stockMovements: StockMovement[];
  shopSettings?: ShopSettings | null;
}

type ReportType =
  | 'daily_sales'
  | 'sales_history'
  | 'purchase_history'
  | 'stock_movement'
  | 'pending_payments'
  | 'low_stock'
  | 'out_of_stock';

export const ReportsPage: React.FC<ReportsPageProps> = ({
  products,
  purchases,
  sales,
  customers,
  stockMovements,
  shopSettings,
}) => {
  const { t, language } = useLanguage();

  const [activeReport, setActiveReport] = useState<ReportType>('daily_sales');
  const [fromDate, setFromDate] = useState(getTodayDateString());
  const [toDate, setToDate] = useState(getTodayDateString());
  const [selectedProductId, setSelectedProductId] = useState('');

  const handlePrint = () => {
    window.print();
  };

  // 1. Daily Sales
  const filteredDailySales = useMemo(() => {
    return sales.filter((s) => {
      const matchesDate = s.date >= fromDate && s.date <= toDate;
      const matchesProd = selectedProductId ? s.productId === selectedProductId : true;
      return matchesDate && matchesProd;
    });
  }, [sales, fromDate, toDate, selectedProductId]);

  // 2. Purchases History
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesDate = p.date >= fromDate && p.date <= toDate;
      const matchesProd = selectedProductId ? p.productId === selectedProductId : true;
      return matchesDate && matchesProd;
    });
  }, [purchases, fromDate, toDate, selectedProductId]);

  // 3. Stock Movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const matchesDate = m.date ? m.date >= fromDate && m.date <= toDate : true;
      const matchesProd = selectedProductId ? m.productId === selectedProductId : true;
      return matchesDate && matchesProd;
    });
  }, [stockMovements, fromDate, toDate, selectedProductId]);

  // 4. Pending Customer Dues
  const pendingCustomers = useMemo(() => {
    return customers.filter((c) => c.remainingBalance > 0);
  }, [customers]);

  // 5. Low Stock & Out of Stock
  const lowStockList = useMemo(() => {
    return products.filter((p) => p.currentStock > 0 && p.currentStock <= p.lowStockThreshold);
  }, [products]);

  const outOfStockList = useMemo(() => {
    return products.filter((p) => p.currentStock <= 0);
  }, [products]);

  const productOptions = [
    { value: '', label: '-- All Products --' },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  const shopName = language === 'mr' && shopSettings?.shopNameMr
    ? shopSettings.shopNameMr
    : shopSettings?.shopName || 'Malhar Tools';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('reports.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
          className="shadow-2xs"
        >
          {t('common.print')} Report
        </Button>
      </div>

      {/* Printable Sheet Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="flex items-center gap-4 mb-3">
          <img src={shopSettings?.logoUrl || '/logo.png'} alt="Malhar Tools Logo" className="w-16 h-16 object-contain" />
          <div>
            <h2 className="text-2xl font-black text-slate-900">{shopName}</h2>
            <p className="text-xs font-bold text-amber-700 tracking-wider uppercase">HARDWARE • TOOLS • SPARES</p>
            <p className="text-xs text-slate-600">{shopSettings?.address || 'Hardware & Tools Merchant'}</p>
            {shopSettings?.contactNumber && <p className="text-xs text-slate-500">Phone: {shopSettings.contactNumber}</p>}
          </div>
        </div>
        <div className="mt-2 flex justify-between items-center text-xs font-bold border-t pt-2">
          <span>REPORT: {activeReport.toUpperCase().replace(/_/g, ' ')}</span>
          <span>
            RANGE: {fromDate} to {toDate} | PRINTED: {formatDate(new Date())}
          </span>
        </div>
      </div>

      {/* Report Selection Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-amber-200/60 shadow-xs flex flex-wrap gap-1.5 print:hidden">
        <button
          onClick={() => setActiveReport('daily_sales')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'daily_sales'
              ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 hover:bg-amber-100/60'
          }`}
        >
          {t('reports.dailySales')}
        </button>
        <button
          onClick={() => setActiveReport('sales_history')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'sales_history'
              ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 hover:bg-amber-100/60'
          }`}
        >
          {t('reports.salesHistory')}
        </button>
        <button
          onClick={() => setActiveReport('purchase_history')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'purchase_history'
              ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 hover:bg-amber-100/60'
          }`}
        >
          {t('reports.purchaseHistory')}
        </button>
        <button
          onClick={() => setActiveReport('stock_movement')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'stock_movement'
              ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 hover:bg-amber-100/60'
          }`}
        >
          {t('reports.stockMovement')}
        </button>
        <button
          onClick={() => setActiveReport('pending_payments')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'pending_payments'
              ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 hover:bg-amber-100/60'
          }`}
        >
          {t('reports.pendingPayments')}
        </button>
        <button
          onClick={() => setActiveReport('low_stock')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'low_stock'
              ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 hover:bg-amber-100/60'
          }`}
        >
          {t('reports.lowStockReport')}
        </button>
        <button
          onClick={() => setActiveReport('out_of_stock')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'out_of_stock'
              ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 hover:bg-amber-100/60'
          }`}
        >
          {t('reports.outOfStockReport')}
        </button>
      </div>

      {/* Date & Product Filter Controls (Visible when appropriate) */}
      {(activeReport === 'daily_sales' ||
        activeReport === 'sales_history' ||
        activeReport === 'purchase_history' ||
        activeReport === 'stock_movement') && (
        <div className="bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
          <Input
            label={t('reports.fromDate')}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label={t('reports.toDate')}
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Select
            label={t('reports.filterByProduct')}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            options={productOptions}
          />
        </div>
      )}

      {/* Report Content Panels */}
      {/* 1. Daily Sales & Sales History */}
      {(activeReport === 'daily_sales' || activeReport === 'sales_history') && (
        <div>
          <div className="mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex justify-between items-center text-xs font-semibold">
            <span className="text-emerald-900">Total Sales Value for Selected Range:</span>
            <span className="text-base text-emerald-800 font-bold font-mono">
              {formatCurrency(
                filteredDailySales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0)
              )}
            </span>
          </div>

          {filteredDailySales.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-8 h-8" />}
              title={t('reports.emptyReport')}
              description="No sales matches the selected date range."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/60 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-amber-50/60 border-b border-amber-200/60 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="p-3.5">{t('common.date')}</th>
                    <th className="p-3.5">{t('sales.product')}</th>
                    <th className="p-3.5">{t('sales.customerName')}</th>
                    <th className="p-3.5 text-center">{t('sales.quantity')}</th>
                    <th className="p-3.5 text-right">{t('sales.sellingPrice')}</th>
                    <th className="p-3.5 text-right">{t('sales.totalAmount')}</th>
                    <th className="p-3.5">{t('sales.paymentMode')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/60">
                  {filteredDailySales.map((s) => (
                    <tr key={s.id} className="hover:bg-amber-50/40">
                      <td className="p-3.5 font-mono text-xs">{formatDate(s.date)}</td>
                      <td className="p-3.5 font-bold text-slate-900">{s.productName}</td>
                      <td className="p-3.5 text-xs text-slate-600">{s.customerName || 'Walk-in'}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.quantity}</td>
                      <td className="p-3.5 text-right font-mono text-xs text-slate-600">
                        {formatCurrency(s.sellingPrice)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(s.totalAmount)}
                      </td>
                      <td className="p-3.5 text-xs">{s.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. Purchase History */}
      {activeReport === 'purchase_history' && (
        <div>
          <div className="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-200 flex justify-between items-center text-xs font-semibold">
            <span className="text-blue-900">Total Purchase Value for Selected Range:</span>
            <span className="text-base text-blue-800 font-bold font-mono">
              {formatCurrency(
                filteredPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0)
              )}
            </span>
          </div>

          {filteredPurchases.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-8 h-8" />}
              title={t('reports.emptyReport')}
              description="No purchases match the selected date range."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/60 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-amber-50/60 border-b border-amber-200/60 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="p-3.5">{t('common.date')}</th>
                    <th className="p-3.5">{t('purchases.product')}</th>
                    <th className="p-3.5">{t('purchases.supplierName')}</th>
                    <th className="p-3.5 text-center">{t('purchases.quantity')}</th>
                    <th className="p-3.5 text-right">{t('purchases.purchasePrice')}</th>
                    <th className="p-3.5 text-right">{t('purchases.totalAmount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/60">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/40">
                      <td className="p-3.5 font-mono text-xs">{formatDate(p.date)}</td>
                      <td className="p-3.5 font-bold text-slate-900">{p.productName}</td>
                      <td className="p-3.5 text-xs text-slate-600">{p.supplierName}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-800">+{p.quantity}</td>
                      <td className="p-3.5 text-right font-mono text-xs text-slate-600">
                        {formatCurrency(p.purchasePrice)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Stock Movement Audit */}
      {activeReport === 'stock_movement' && (
        <div>
          {filteredMovements.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8" />}
              title={t('reports.emptyReport')}
              description="No stock movements recorded in this timeframe."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/60 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-amber-50/60 border-b border-amber-200/60 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="p-3.5">{t('common.date')}</th>
                    <th className="p-3.5">{t('products.name')}</th>
                    <th className="p-3.5">{t('reports.movementType')}</th>
                    <th className="p-3.5 text-center">{t('reports.change')}</th>
                    <th className="p-3.5 text-center">{t('reports.prevStock')}</th>
                    <th className="p-3.5 text-center">{t('reports.afterStock')}</th>
                    <th className="p-3.5">{t('common.notes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/60">
                  {filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-amber-50/40">
                      <td className="p-3.5 font-mono text-xs">{formatDate(m.date || m.createdAt)}</td>
                      <td className="p-3.5 font-bold text-slate-900">{m.productName}</td>
                      <td className="p-3.5 text-xs font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            m.type === 'PURCHASE'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td
                        className={`p-3.5 text-center font-mono font-bold ${
                          m.quantityChange > 0 ? 'text-blue-600' : 'text-slate-900'
                        }`}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </td>
                      <td className="p-3.5 text-center font-mono text-xs text-slate-500">
                        {m.previousStock}
                      </td>
                      <td className="p-3.5 text-center font-mono text-xs font-bold text-slate-900">
                        {m.newStock}
                      </td>
                      <td className="p-3.5 text-xs text-slate-500">{m.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Pending Customer Dues */}
      {activeReport === 'pending_payments' && (
        <div>
          <div className="mb-4 bg-amber-50 p-4 rounded-xl border border-amber-200 flex justify-between items-center text-xs font-semibold">
            <span className="text-amber-900">Total Outstanding Balance (उधारी):</span>
            <span className="text-base text-amber-800 font-bold font-mono">
              {formatCurrency(
                pendingCustomers.reduce((acc, c) => acc + (Number(c.remainingBalance) || 0), 0)
              )}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200/60 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-amber-50/60 border-b border-amber-200/60 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="p-3.5">{t('customers.name')}</th>
                  <th className="p-3.5">{t('customers.contact')}</th>
                  <th className="p-3.5 text-right">{t('customers.totalPurchases')}</th>
                  <th className="p-3.5 text-right">{t('customers.totalPaid')}</th>
                  <th className="p-3.5 text-right">{t('customers.remainingBalance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/60">
                {pendingCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/40">
                    <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                    <td className="p-3.5 text-xs text-slate-600">{c.contactNumber}</td>
                    <td className="p-3.5 text-right font-mono text-xs">
                      {formatCurrency(c.totalPurchaseAmount)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs text-emerald-700">
                      {formatCurrency(c.totalPaid)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(c.remainingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Low Stock & Out of Stock Reports */}
      {(activeReport === 'low_stock' || activeReport === 'out_of_stock') && (
        <div className="bg-white rounded-2xl border border-amber-200/60 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-amber-50/60 border-b border-amber-200/60 text-[11px] font-bold text-slate-600 uppercase">
                <th className="p-3.5">{t('products.name')}</th>
                <th className="p-3.5">{t('products.category')}</th>
                <th className="p-3.5 text-center">{t('alerts.currentStock')}</th>
                <th className="p-3.5 text-center">{t('alerts.threshold')}</th>
                <th className="p-3.5 text-right">{t('products.purchasePrice')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100/60">
              {(activeReport === 'low_stock' ? lowStockList : outOfStockList).map((p) => (
                <tr key={p.id} className="hover:bg-amber-50/40">
                  <td className="p-3.5 font-bold text-slate-900">{p.name}</td>
                  <td className="p-3.5 text-xs text-slate-600">{p.category}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-rose-600">
                    {p.currentStock} {p.unit}
                  </td>
                  <td className="p-3.5 text-center font-mono text-xs">{p.lowStockThreshold}</td>
                  <td className="p-3.5 text-right font-mono text-xs">
                    {formatCurrency(p.purchasePrice)}
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
