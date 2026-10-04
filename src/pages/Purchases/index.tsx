import React, { useState, useMemo } from 'react';
import { Truck, Plus, Search, Calendar, User, FileText } from 'lucide-react';
import { Purchase, Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaymentStatusBadge } from '../../components/ui/Badge';
import { PurchaseForm } from '../../components/forms/PurchaseForm';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PurchasesPageProps {
  purchases: Purchase[];
  products: Product[];
  onAddPurchase: (data: Omit<Purchase, 'id' | 'createdAt'>) => Promise<void>;
  isOpenAddModalExternal?: boolean;
  onCloseAddModalExternal?: () => void;
  preselectedProductId?: string;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  purchases,
  products,
  onAddPurchase,
  isOpenAddModalExternal = false,
  onCloseAddModalExternal,
  preselectedProductId,
}) => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showAddModal = isAddModalOpen || isOpenAddModalExternal;
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    if (onCloseAddModalExternal) onCloseAddModalExternal();
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = dateFilter ? item.date === dateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [purchases, searchTerm, dateFilter]);

  const totalSpent = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  }, [filteredPurchases]);

  const handleCreate = async (data: Omit<Purchase, 'id' | 'createdAt'>) => {
    setIsSubmitting(true);
    try {
      await onAddPurchase(data);
      success(t('purchases.createSuccess'));
      handleCloseAddModal();
    } catch (err: any) {
      toastError(err.message || 'Failed to record purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('purchases.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('purchases.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
          disabled={products.length === 0}
          className="shadow-sm shadow-brand-600/30"
        >
          {t('purchases.addPurchase')}
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Purchase Records</span>
            <p className="text-base font-bold text-slate-900">{filteredPurchases.length} invoices</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Stock-In Value</span>
            <p className="text-base font-bold text-blue-600 font-mono">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by product or supplier name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftAddon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="w-full sm:w-56">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {(searchTerm || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setDateFilter('');
            }}
          >
            {t('common.reset')}
          </Button>
        )}
      </div>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-8 h-8" />}
          title={t('purchases.emptyTitle')}
          description={
            products.length === 0
              ? 'Please add at least one product before recording stock purchases.'
              : t('purchases.emptySub')
          }
          actionLabel={products.length > 0 ? t('purchases.addPurchase') : undefined}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">{t('common.date')}</th>
                    <th className="py-3.5 px-4">{t('purchases.product')}</th>
                    <th className="py-3.5 px-4">{t('purchases.supplierName')}</th>
                    <th className="py-3.5 px-4 text-center">{t('purchases.quantity')}</th>
                    <th className="py-3.5 px-4 text-right">{t('purchases.purchasePrice')}</th>
                    <th className="py-3.5 px-4 text-right">{t('purchases.totalAmount')}</th>
                    <th className="py-3.5 px-4">{t('purchases.paymentStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {p.productName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 text-xs">
                        <div>
                          <span className="font-medium">{p.supplierName}</span>
                          {p.supplierContact && (
                            <span className="block text-slate-400 text-[11px]">
                              {p.supplierContact}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600 font-mono">
                        +{p.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                        {formatCurrency(p.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <PaymentStatusBadge status={p.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredPurchases.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{p.productName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supplier: <span className="font-semibold text-slate-700">{p.supplierName}</span>
                    </p>
                  </div>
                  <PaymentStatusBadge status={p.paymentStatus} />
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Added Qty
                    </span>
                    <span className="font-bold text-blue-600">+{p.quantity}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Unit Price
                    </span>
                    <span className="font-medium text-slate-600">{formatCurrency(p.purchasePrice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Total Bill
                    </span>
                    <span className="font-bold text-slate-900">{formatCurrency(p.totalAmount)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{formatDate(p.date)}</span>
                  {p.supplierContact && <span>📞 {p.supplierContact}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Record Purchase Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title={t('purchases.addPurchase')}
        subtitle="Stock will be automatically added to product inventory"
      >
        <PurchaseForm
          products={products}
          onSubmit={handleCreate}
          onCancel={handleCloseAddModal}
          isLoading={isSubmitting}
          preselectedProductId={preselectedProductId}
        />
      </Modal>
    </div>
  );
};
