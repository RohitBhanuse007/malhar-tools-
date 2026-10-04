import React, { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Search, Calendar, User, CreditCard, Banknote } from 'lucide-react';
import { Sale, Product, Customer } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SaleForm } from '../../components/forms/SaleForm';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import { CreateSaleInput } from '../../services/firebase/saleService';

interface SalesPageProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onAddSale: (data: CreateSaleInput) => Promise<void>;
  isOpenAddModalExternal?: boolean;
  onCloseAddModalExternal?: () => void;
  preselectedProductId?: string;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  sales,
  products,
  customers,
  onAddSale,
  isOpenAddModalExternal = false,
  onCloseAddModalExternal,
  preselectedProductId,
}) => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showAddModal = isAddModalOpen || isOpenAddModalExternal;
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    if (onCloseAddModalExternal) onCloseAddModalExternal();
  };

  const filteredSales = useMemo(() => {
    return sales.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDate = dateFilter ? item.date === dateFilter : true;
      const matchesMode = paymentModeFilter ? item.paymentMode === paymentModeFilter : true;
      return matchesSearch && matchesDate && matchesMode;
    });
  }, [sales, searchTerm, dateFilter, paymentModeFilter]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
  }, [filteredSales]);

  const cashTotal = useMemo(() => {
    return filteredSales
      .filter((s) => s.paymentMode === 'Cash')
      .reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
  }, [filteredSales]);

  const upiTotal = useMemo(() => {
    return filteredSales
      .filter((s) => s.paymentMode === 'UPI')
      .reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
  }, [filteredSales]);

  const handleCreate = async (data: CreateSaleInput) => {
    setIsSubmitting(true);
    try {
      await onAddSale(data);
      success(t('sales.createSuccess'));
      handleCloseAddModal();
    } catch (err: any) {
      toastError(err.message || 'Failed to record sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasInStockProducts = products.some((p) => p.currentStock > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('sales.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('sales.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
          disabled={!hasInStockProducts}
          className="shadow-sm shadow-brand-600/30"
        >
          {t('sales.addSale')}
        </Button>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Total Sales Revenue
            </span>
            <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              {formatCurrency(totalRevenue)}
            </p>
            <span className="text-xs text-slate-400">{filteredSales.length} bills</span>
          </div>
          <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Cash Collection (रोख)
            </span>
            <p className="text-xl font-bold text-emerald-600 font-mono mt-0.5">
              {formatCurrency(cashTotal)}
            </p>
            <span className="text-xs text-slate-400">Cash counter drawer</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              UPI / Online (यूपीआय)
            </span>
            <p className="text-xl font-bold text-blue-600 font-mono mt-0.5">
              {formatCurrency(upiTotal)}
            </p>
            <span className="text-xs text-slate-400">Direct to bank account</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by product name or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftAddon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="w-full sm:w-48">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            className="w-full text-xs font-medium py-2.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash (रोख)</option>
            <option value="UPI">UPI / Online</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        {(searchTerm || dateFilter || paymentModeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setDateFilter('');
              setPaymentModeFilter('');
            }}
          >
            {t('common.reset')}
          </Button>
        )}
      </div>

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title={t('sales.emptyTitle')}
          description={
            !hasInStockProducts
              ? 'No products with available stock are present. Add or purchase stock first.'
              : t('sales.emptySub')
          }
          actionLabel={hasInStockProducts ? t('sales.addSale') : undefined}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">{t('common.date')}</th>
                    <th className="py-3.5 px-4">{t('sales.product')}</th>
                    <th className="py-3.5 px-4">{t('sales.customerName')}</th>
                    <th className="py-3.5 px-4 text-center">{t('sales.quantity')}</th>
                    <th className="py-3.5 px-4 text-right">{t('sales.sellingPrice')}</th>
                    <th className="py-3.5 px-4 text-right">{t('sales.totalAmount')}</th>
                    <th className="py-3.5 px-4">{t('sales.paymentMode')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {formatDate(s.date)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {s.productName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {s.customerName ? (
                          <span className="font-medium">{s.customerName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in Counter</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">
                        {s.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                        {formatCurrency(s.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(s.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            s.paymentMode === 'Cash'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {s.paymentMode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredSales.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{s.productName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.customerName ? `Customer: ${s.customerName}` : 'Walk-in Counter'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      s.paymentMode === 'Cash'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {s.paymentMode}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Qty Sold
                    </span>
                    <span className="font-bold text-slate-900">{s.quantity}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Rate
                    </span>
                    <span className="font-medium text-slate-600">{formatCurrency(s.sellingPrice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Total
                    </span>
                    <span className="font-bold text-emerald-600">{formatCurrency(s.totalAmount)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{formatDate(s.date)}</span>
                  {s.notes && <span className="truncate max-w-[150px]">💬 {s.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Record Sale Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title={t('sales.addSale')}
        subtitle="Stock will be checked and automatically decreased"
      >
        <SaleForm
          products={products}
          customers={customers}
          onSubmit={handleCreate}
          onCancel={handleCloseAddModal}
          isLoading={isSubmitting}
          preselectedProductId={preselectedProductId}
        />
      </Modal>
    </div>
  );
};
