import React from 'react';
import {
  Boxes,
  Layers,
  TrendingUp,
  Truck,
  Users,
  AlertTriangle,
  XCircle,
  Plus,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { Product, Purchase, Sale, Customer, ShopSettings } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { StockBadge } from '../../components/ui/Badge';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';

interface DashboardPageProps {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  customers: Customer[];
  shopSettings?: ShopSettings | null;
  onNavigate: (page: string) => void;
  onOpenAddProduct: () => void;
  onOpenAddPurchase: () => void;
  onOpenAddSale: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  purchases,
  sales,
  customers,
  onNavigate,
  onOpenAddProduct,
  onOpenAddPurchase,
  onOpenAddSale,
}) => {
  const { t } = useLanguage();
  const todayStr = getTodayDateString();

  // Metrics calculations
  const totalProducts = products.length;
  const currentStockUnits = products.reduce((acc, p) => acc + (Number(p.currentStock) || 0), 0);

  const todaySales = sales.filter((s) => s.date === todayStr);
  const todaySalesAmount = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

  const todayPurchases = purchases.filter((p) => p.date === todayStr);
  const todayPurchasesAmount = todayPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);

  const pendingCustomerPayments = customers.reduce(
    (acc, c) => acc + (Number(c.remainingBalance) || 0),
    0
  );

  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.lowStockThreshold
  );
  const outOfStockProducts = products.filter((p) => p.currentStock <= 0);

  const recentSales = sales.slice(0, 5);
  const recentPurchases = purchases.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-slate-900 to-stone-900 border border-amber-500/20 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {t('dashboard.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ShoppingCart className="w-4 h-4 text-slate-950" />}
            onClick={onOpenAddSale}
            className="shadow-md shadow-amber-500/20 font-bold"
          >
            {t('dashboard.addSale')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Truck className="w-4 h-4 text-amber-900" />}
            onClick={onOpenAddPurchase}
            className="bg-white hover:bg-amber-50 text-slate-950 border border-amber-300 font-bold shadow-xs"
          >
            {t('dashboard.addPurchase')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-4 h-4 text-amber-800" />}
            onClick={onOpenAddProduct}
            className="bg-white hover:bg-amber-50 text-slate-950 border border-amber-300 font-bold shadow-xs"
          >
            {t('dashboard.addProduct')}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title={t('dashboard.todaySales')}
          value={formatCurrency(todaySalesAmount)}
          subtext={`${todaySales.length} transactions today`}
          icon={<TrendingUp className="w-6 h-6" />}
          iconBgColor="bg-amber-100"
          iconTextColor="text-amber-800"
          onClick={() => onNavigate('sales')}
        />

        <StatCard
          title={t('dashboard.todayPurchases')}
          value={formatCurrency(todayPurchasesAmount)}
          subtext={`${todayPurchases.length} stock-in arrivals`}
          icon={<Truck className="w-6 h-6" />}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-700"
          onClick={() => onNavigate('purchases')}
        />

        <StatCard
          title={t('dashboard.pendingPayments')}
          value={formatCurrency(pendingCustomerPayments)}
          subtext="Total customer dues owed"
          icon={<Users className="w-6 h-6" />}
          iconBgColor="bg-orange-100/70"
          iconTextColor="text-orange-800"
          onClick={() => onNavigate('customers')}
        />

        <StatCard
          title={t('dashboard.totalProducts')}
          value={totalProducts}
          subtext={`${currentStockUnits} total stock items`}
          icon={<Boxes className="w-6 h-6" />}
          iconBgColor="bg-yellow-100"
          iconTextColor="text-yellow-800"
          onClick={() => onNavigate('products')}
        />
      </div>

      {/* Secondary Metrics & Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title={t('dashboard.currentStock')}
          value={currentStockUnits}
          subtext="Across all hardware items"
          icon={<Layers className="w-6 h-6" />}
          iconBgColor="bg-amber-100/80"
          iconTextColor="text-amber-800"
          onClick={() => onNavigate('products')}
        />

        <StatCard
          title={t('dashboard.lowStock')}
          value={lowStockProducts.length}
          subtext="Items below alert threshold"
          icon={<AlertTriangle className="w-6 h-6" />}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
          isAlert={lowStockProducts.length > 0}
          onClick={() => onNavigate('alerts')}
        />

        <StatCard
          title={t('dashboard.outOfStock')}
          value={outOfStockProducts.length}
          subtext="Zero inventory items"
          icon={<XCircle className="w-6 h-6" />}
          iconBgColor="bg-rose-50"
          iconTextColor="text-rose-600"
          isAlert={outOfStockProducts.length > 0}
          onClick={() => onNavigate('alerts')}
        />
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Card */}
        <Card>
          <CardHeader
            title={t('dashboard.recentSales')}
            subtitle="Latest customer transactions"
            action={
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>{t('common.view')} {t('common.all')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          <CardBody className="p-0">
            {recentSales.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {t('dashboard.noRecentSales')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{sale.productName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sale.quantity} units • {formatDate(sale.date)} • {sale.customerName || sale.paymentMode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">{formatCurrency(sale.totalAmount)}</p>
                      <span className="text-[11px] font-medium text-emerald-600">{sale.paymentMode}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Stock-In Purchases Card */}
        <Card>
          <CardHeader
            title={t('dashboard.recentPurchases')}
            subtitle="Latest supplier stock arrivals"
            action={
              <button
                onClick={() => onNavigate('purchases')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>{t('common.view')} {t('common.all')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          <CardBody className="p-0">
            {recentPurchases.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {t('dashboard.noRecentPurchases')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{purchase.productName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        +{purchase.quantity} units • {formatDate(purchase.date)} • {purchase.supplierName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">{formatCurrency(purchase.totalAmount)}</p>
                      <span className="text-[11px] font-medium text-blue-600">{purchase.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Critical Stock Attention Banner (if any low or out of stock items) */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 text-sm">
                Attention Required: {lowStockProducts.length + outOfStockProducts.length} items need replenishment
              </h4>
              <p className="text-xs text-amber-700 mt-1">
                {outOfStockProducts.length} items are completely out of stock, and {lowStockProducts.length} are at or below alert thresholds.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50"
                  onClick={() => onNavigate('alerts')}
                >
                  View Stock Alerts & Print Order Sheet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
