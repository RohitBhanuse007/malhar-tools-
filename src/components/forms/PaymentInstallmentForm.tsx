import React, { useState } from 'react';
import { Customer, PaymentMode } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { validateCustomerPayment } from '../../utils/validators';

interface PaymentInstallmentFormProps {
  customer: Customer;
  onSubmit: (data: {
    customerId: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PaymentInstallmentForm: React.FC<PaymentInstallmentFormProps> = ({
  customer,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  const remainingBalance = Number(customer.remainingBalance) || 0;
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const enteredAmount = Number(amount) || 0;
  const newRemainingBalance = Math.max(0, remainingBalance - enteredAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCustomerPayment({
      customerId: customer.id,
      amount,
      remainingBalance,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    await onSubmit({
      customerId: customer.id,
      amount: enteredAmount,
      paymentDate,
      paymentMode,
      reference: reference.trim(),
      notes: notes.trim(),
    });
  };

  const paymentModeOptions = [
    { value: 'Cash', label: t('sales.cash') },
    { value: 'UPI', label: t('sales.upi') },
    { value: 'Bank Transfer', label: t('sales.bank') },
    { value: 'Cheque', label: t('sales.cheque') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer summary card */}
      <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">{customer.name}</h4>
          <p className="text-xs text-slate-500">{customer.contactNumber}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-medium">{t('customers.remainingBalance')}</span>
          <p className="text-base font-bold text-rose-600">{formatCurrency(remainingBalance)}</p>
        </div>
      </div>

      {/* Amount input with quick pay-in-full button */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {t('customers.amount')} <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setAmount(String(remainingBalance))}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
          >
            Pay Full Balance (₹{remainingBalance})
          </button>
        </div>
        <Input
          type="number"
          step="any"
          min="1"
          max={remainingBalance}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
          }}
          placeholder="0.00"
          leftAddon="₹"
          error={errors.amount}
          required
        />
      </div>

      {/* Real-time remaining balance recalculation */}
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold">
        <span className="text-emerald-800">Balance after this installment:</span>
        <span className="text-sm font-bold text-emerald-700">{formatCurrency(newRemainingBalance)}</span>
      </div>

      {/* Date and Mode Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('customers.paymentDate')}
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />

        <Select
          label={t('customers.mode')}
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
          options={paymentModeOptions}
          required
        />
      </div>

      {/* Reference number */}
      <Input
        label={t('customers.reference')}
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="UPI Ref ID, Cheque No, or Receipt Slip No"
      />

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {t('common.notes')} ({t('common.optional')})
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Installment payment notes..."
          className="w-full rounded-lg border border-amber-200/80 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 placeholder:text-slate-400"
        />
      </div>

      {/* Actions */}
      <div className="pt-3 flex items-center justify-end gap-3 border-t border-amber-100/80">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading} disabled={remainingBalance <= 0}>
          {t('customers.addPayment')}
        </Button>
      </div>
    </form>
  );
};
