import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Customer, CustomerPayment, PaymentMode } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { CustomerForm } from '../../components/forms/CustomerForm';
import { PaymentInstallmentForm } from '../../components/forms/PaymentInstallmentForm';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface CustomersPageProps {
  customers: Customer[];
  customerPayments: CustomerPayment[];
  onCreateCustomer: (data: {
    name: string;
    contactNumber: string;
    address?: string;
    initialDues?: number;
    notes?: string;
  }) => Promise<void>;
  onRecordPayment: (data: {
    customerId: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers,
  customerPayments,
  onCreateCustomer,
  onRecordPayment,
}) => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyPendingFilter, setOnlyPendingFilter] = useState(false);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [activeCustomerForPayment, setActiveCustomerForPayment] = useState<Customer | null>(null);
  const [viewingHistoryCustomer, setViewingHistoryCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactNumber.includes(searchTerm);
      const matchesPending = onlyPendingFilter ? c.remainingBalance > 0 : true;
      return matchesSearch && matchesPending;
    });
  }, [customers, searchTerm, onlyPendingFilter]);

  const totalDuesAcrossAll = useMemo(() => {
    return customers.reduce((acc, c) => acc + (Number(c.remainingBalance) || 0), 0);
  }, [customers]);

  const pendingCustomersCount = useMemo(() => {
    return customers.filter((c) => c.remainingBalance > 0).length;
  }, [customers]);

  const handleCreateCustomer = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onCreateCustomer(data);
      success(t('customers.customerCreated'));
      setIsAddCustomerOpen(false);
    } catch (err: any) {
      toastError(err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPayment = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onRecordPayment(data);
      success(t('customers.paymentSuccess'));
      setActiveCustomerForPayment(null);
    } catch (err: any) {
      toastError(err.message || 'Failed to record installment payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get payment history for selected customer
  const historyPayments = useMemo(() => {
    if (!viewingHistoryCustomer) return [];
    return customerPayments.filter((p) => p.customerId === viewingHistoryCustomer.id);
  }, [viewingHistoryCustomer, customerPayments]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('customers.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('customers.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddCustomerOpen(true)}
          className="shadow-sm shadow-brand-600/30"
        >
          {t('customers.addCustomer')}
        </Button>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Total Customer Dues (शिल्लक उधारी)
            </span>
            <p className="text-2xl font-black text-amber-900 font-mono mt-1">
              {formatCurrency(totalDuesAcrossAll)}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Outstanding credit across all registered customers
            </p>
          </div>
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-amber-200/60 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Customers With Pending Balance
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {pendingCustomersCount}{' '}
              <span className="text-xs text-slate-400 font-normal">/ {customers.length} total</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Customers currently carrying an active balance
            </p>
          </div>
          <div className="p-3 bg-amber-100/80 text-amber-800 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Dues Only Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search customer by name or contact number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftAddon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-amber-50/50 px-3.5 py-2.5 rounded-lg border border-amber-200/60 hover:bg-amber-100/60 select-none shrink-0 w-full sm:w-auto">
          <input
            type="checkbox"
            checked={onlyPendingFilter}
            onChange={(e) => setOnlyPendingFilter(e.target.checked)}
            className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
          />
          <span>{t('customers.filterPendingOnly')}</span>
        </label>
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={t('customers.emptyTitle')}
          description={t('customers.emptySub')}
          actionLabel={t('customers.addCustomer')}
          onAction={() => setIsAddCustomerOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const hasDues = c.remainingBalance > 0;
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  hasDues ? 'border-amber-300 hover:border-amber-400' : 'border-amber-200/60 hover:border-amber-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.contactNumber}</span>
                      </div>
                      {c.address && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        hasDues
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {hasDues ? t('customers.hasDues') : t('customers.cleared')}
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="mt-4 p-3.5 rounded-xl bg-amber-50/40 border border-amber-100/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>{t('customers.totalPurchases')}:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {formatCurrency(c.totalPurchaseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{t('customers.totalPaid')}:</span>
                      <span className="font-mono font-medium text-emerald-700">
                        {formatCurrency(c.totalPaid)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-amber-200/60 flex justify-between font-bold">
                      <span className="text-slate-700">{t('customers.remainingBalance')}:</span>
                      <span
                        className={`font-mono text-sm ${
                          hasDues ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {formatCurrency(c.remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-amber-100/80 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<History className="w-3.5 h-3.5 text-slate-500" />}
                    onClick={() => setViewingHistoryCustomer(c)}
                    className="text-xs"
                  >
                    History
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                    onClick={() => setActiveCustomerForPayment(c)}
                    disabled={!hasDues}
                    className="text-xs shadow-xs"
                  >
                    {t('customers.addPayment')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title={t('customers.addCustomer')}
        subtitle="Create a customer account for credit sales and installment tracking"
      >
        <CustomerForm
          onSubmit={handleCreateCustomer}
          onCancel={() => setIsAddCustomerOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Record Installment Payment Modal */}
      <Modal
        isOpen={Boolean(activeCustomerForPayment)}
        onClose={() => setActiveCustomerForPayment(null)}
        title={t('customers.addPayment')}
        subtitle="Record installment payment to reduce customer remaining balance"
      >
        {activeCustomerForPayment && (
          <PaymentInstallmentForm
            customer={activeCustomerForPayment}
            onSubmit={handleAddPayment}
            onCancel={() => setActiveCustomerForPayment(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={Boolean(viewingHistoryCustomer)}
        onClose={() => setViewingHistoryCustomer(null)}
        title={`${viewingHistoryCustomer?.name || ''} - ${t('customers.paymentHistory')}`}
        subtitle="Complete record of installment payments"
        maxWidth="xl"
      >
        {viewingHistoryCustomer && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Contact:</span>{' '}
                <span className="font-semibold text-slate-800">{viewingHistoryCustomer.contactNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">Current Due:</span>{' '}
                <span className="font-bold text-rose-600 font-mono">
                  {formatCurrency(viewingHistoryCustomer.remainingBalance)}
                </span>
              </div>
            </div>

            {historyPayments.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No installment payments recorded yet for this customer.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {historyPayments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">
                          {formatCurrency(p.amount)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[11px]">
                          {p.paymentMode}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-0.5">
                        {formatDate(p.paymentDate)} {p.reference && `• Ref: ${p.reference}`}
                      </p>
                      {p.notes && <p className="text-slate-500 italic mt-0.5">{p.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingHistoryCustomer(null)}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
