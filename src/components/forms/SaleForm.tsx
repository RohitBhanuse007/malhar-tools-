import React, { useState, useEffect } from 'react';
import { Product, Customer, PaymentMode } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { validateSale } from '../../utils/validators';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { CreateSaleInput } from '../../services/firebase/saleService';
import { AlertCircle } from 'lucide-react';

interface SaleFormProps {
  products: Product[];
  customers?: Customer[];
  onSubmit: (data: CreateSaleInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  preselectedProductId?: string;
}

export const SaleForm: React.FC<SaleFormProps> = ({
  products,
  customers = [],
  onSubmit,
  onCancel,
  isLoading = false,
  preselectedProductId,
}) => {
  const { t } = useLanguage();

  const [productId, setProductId] = useState(preselectedProductId || (products[0]?.id || ''));
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [initialPaid, setInitialPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedProduct = products.find((p) => p.id === productId);
  const availableStock = selectedProduct ? Number(selectedProduct.currentStock) || 0 : 0;

  // Auto populate selling price when product changes
  useEffect(() => {
    if (productId) {
      const p = products.find((item) => item.id === productId);
      if (p) {
        setSellingPrice(String(p.sellingPrice || 0));
      }
    }
  }, [productId, products]);

  // When a customer is picked from list, sync customerName
  useEffect(() => {
    if (customerId) {
      const cust = customers.find((c) => c.id === customerId);
      if (cust) {
        setCustomerName(cust.name);
      }
    }
  }, [customerId, customers]);

  const totalAmount = (Number(quantity) || 0) * (Number(sellingPrice) || 0);
  const remainingDue = Math.max(0, totalAmount - (Number(initialPaid) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setErrors({ productId: 'Selected product is invalid.' });
      return;
    }

    const validation = validateSale({
      productId,
      quantity,
      sellingPrice,
      availableStock,
      date,
      paymentMode,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (isCreditSale && Number(initialPaid) > totalAmount) {
      setErrors({ initialPaid: 'Initial paid amount cannot exceed total bill.' });
      return;
    }

    await onSubmit({
      productId,
      productName: selectedProduct.name,
      quantity: Number(quantity),
      sellingPrice: Number(sellingPrice),
      totalAmount,
      date,
      paymentMode,
      customerName: customerName.trim() || undefined,
      customerId: customerId || undefined,
      initialPaid: isCreditSale ? Number(initialPaid) || 0 : totalAmount,
      notes: notes.trim(),
    });
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (Stock: ${p.currentStock} ${p.unit} | ₹${p.sellingPrice})`,
  }));

  const paymentModeOptions = [
    { value: 'Cash', label: t('sales.cash') },
    { value: 'UPI', label: t('sales.upi') },
    { value: 'Bank Transfer', label: t('sales.bank') },
    { value: 'Cheque', label: t('sales.cheque') },
  ];

  const customerOptions = [
    { value: '', label: '-- Walk-in / Unlinked Customer --' },
    ...customers.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.contactNumber}) - Due: ₹${c.remainingBalance}`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Selector */}
      <Select
        label={t('sales.product')}
        value={productId}
        onChange={(e) => {
          setProductId(e.target.value);
          const p = products.find((item) => item.id === e.target.value);
          if (p) setSellingPrice(String(p.sellingPrice || 0));
          if (errors.productId) setErrors((prev) => ({ ...prev, productId: '' }));
        }}
        options={productOptions}
        placeholder={t('common.selectProduct')}
        error={errors.productId}
        required
      />

      {/* Available Stock Warning if 0 */}
      {selectedProduct && availableStock <= 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{t('products.outOfStock')}! Cannot record sale for zero-stock product.</span>
        </div>
      )}

      {/* Quantity & Selling Price Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('sales.quantity')}
          type="number"
          step="1"
          min="1"
          max={availableStock > 0 ? availableStock : 1}
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: '' }));
          }}
          helperText={
            selectedProduct
              ? `Available: ${availableStock} ${selectedProduct.unit}. Remaining after sale: ${Math.max(
                  0,
                  availableStock - (Number(quantity) || 0)
                )} ${selectedProduct.unit}`
              : undefined
          }
          error={errors.quantity}
          required
        />

        <Input
          label={t('sales.sellingPrice')}
          type="number"
          step="any"
          min="0"
          value={sellingPrice}
          onChange={(e) => {
            setSellingPrice(e.target.value);
            if (errors.sellingPrice) setErrors((prev) => ({ ...prev, sellingPrice: '' }));
          }}
          leftAddon="₹"
          error={errors.sellingPrice}
          required
        />
      </div>

      {/* Total Amount Display Banner */}
      <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between font-semibold text-sm">
        <span className="text-slate-300">{t('sales.totalAmount')}:</span>
        <span className="text-lg font-bold text-emerald-400">{formatCurrency(totalAmount)}</span>
      </div>

      {/* Date & Payment Mode Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('sales.date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          required
        />

        <Select
          label={t('sales.paymentMode')}
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
          options={paymentModeOptions}
          required
        />
      </div>

      {/* Customer Linking / Credit Option */}
      <div className="p-4 bg-amber-50/40 border border-amber-200/70 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t('sales.linkToCustomer')}
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-800">
            <input
              type="checkbox"
              checked={isCreditSale}
              onChange={(e) => setIsCreditSale(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
            />
            <span>{t('sales.isCreditSale')}</span>
          </label>
        </div>

        {customers.length > 0 && (
          <Select
            label="Select Existing Customer Account"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const c = customers.find((item) => item.id === e.target.value);
              if (c) setCustomerName(c.name);
            }}
            options={customerOptions}
          />
        )}

        <Input
          label={t('sales.customerName')}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Ramesh Patil / रमेश पाटील"
        />

        {isCreditSale && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-200/60">
            <Input
              label={t('sales.initialPaid')}
              type="number"
              step="any"
              min="0"
              value={initialPaid}
              onChange={(e) => setInitialPaid(e.target.value)}
              placeholder="0.00"
              leftAddon="₹"
              error={errors.initialPaid}
            />

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col justify-center">
              <span className="text-xs text-amber-700 font-semibold">{t('sales.remainingDue')}</span>
              <span className="text-base font-bold text-amber-900">{formatCurrency(remainingDue)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {t('common.notes')} ({t('common.optional')})
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('sales.notesPlaceholder')}
          className="w-full rounded-lg border border-amber-200/80 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 placeholder:text-slate-400"
        />
      </div>

      {/* Actions */}
      <div className="pt-3 flex items-center justify-end gap-3 border-t border-amber-100/80">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          type="submit"
          isLoading={isLoading}
          disabled={availableStock <= 0}
        >
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};
