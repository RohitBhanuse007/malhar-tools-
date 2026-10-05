import React, { useState, useEffect } from 'react';
import { Product, Purchase, PaymentStatus } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { validatePurchase } from '../../utils/validators';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';

interface PurchaseFormProps {
  products: Product[];
  onSubmit: (data: Omit<Purchase, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  preselectedProductId?: string;
}

export const PurchaseForm: React.FC<PurchaseFormProps> = ({
  products,
  onSubmit,
  onCancel,
  isLoading = false,
  preselectedProductId,
}) => {
  const { t } = useLanguage();

  const [productId, setProductId] = useState(preselectedProductId || (products[0]?.id || ''));
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto populate purchase price when product is selected
  useEffect(() => {
    if (productId) {
      const selectedProduct = products.find((p) => p.id === productId);
      if (selectedProduct && !purchasePrice) {
        setPurchasePrice(String(selectedProduct.purchasePrice || 0));
      }
    }
  }, [productId, products, purchasePrice]);

  const selectedProduct = products.find((p) => p.id === productId);
  const totalAmount = (Number(quantity) || 0) * (Number(purchasePrice) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePurchase({
      productId,
      quantity,
      purchasePrice,
      supplierName,
      date,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (!selectedProduct) {
      setErrors({ productId: 'Selected product is invalid.' });
      return;
    }

    await onSubmit({
      productId,
      productName: selectedProduct.name,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      totalAmount,
      date,
      supplierName: supplierName.trim(),
      supplierContact: supplierContact.trim(),
      paymentStatus,
      notes: notes.trim(),
    });
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (Current Stock: ${p.currentStock} ${p.unit})`,
  }));

  const paymentStatusOptions = [
    { value: 'paid', label: t('purchases.statusPaid') },
    { value: 'pending', label: t('purchases.statusPending') },
    { value: 'partial', label: t('purchases.statusPartial') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Selector */}
      <Select
        label={t('purchases.product')}
        value={productId}
        onChange={(e) => {
          setProductId(e.target.value);
          const p = products.find((item) => item.id === e.target.value);
          if (p) setPurchasePrice(String(p.purchasePrice || 0));
          if (errors.productId) setErrors((prev) => ({ ...prev, productId: '' }));
        }}
        options={productOptions}
        placeholder={t('common.selectProduct')}
        error={errors.productId}
        required
      />

      {/* Quantity & Purchase Price Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('purchases.quantity')}
          type="number"
          step="1"
          min="1"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: '' }));
          }}
          helperText={
            selectedProduct
              ? `Stock will increase from ${selectedProduct.currentStock} to ${
                  Number(selectedProduct.currentStock) + (Number(quantity) || 0)
                } ${selectedProduct.unit}`
              : undefined
          }
          error={errors.quantity}
          required
        />

        <Input
          label={t('purchases.purchasePrice')}
          type="number"
          step="any"
          min="0"
          value={purchasePrice}
          onChange={(e) => {
            setPurchasePrice(e.target.value);
            if (errors.purchasePrice) setErrors((prev) => ({ ...prev, purchasePrice: '' }));
          }}
          leftAddon="₹"
          error={errors.purchasePrice}
          required
        />
      </div>

      {/* Real-time Total Calculation Banner */}
      <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between text-brand-900 font-semibold text-sm">
        <span>{t('purchases.totalAmount')}:</span>
        <span className="text-base text-brand-700">{formatCurrency(totalAmount)}</span>
      </div>

      {/* Date & Payment Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('purchases.date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          required
        />

        <Select
          label={t('purchases.paymentStatus')}
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
          options={paymentStatusOptions}
        />
      </div>

      {/* Supplier Name and Contact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('purchases.supplierName')}
          value={supplierName}
          onChange={(e) => {
            setSupplierName(e.target.value);
            if (errors.supplierName) setErrors((prev) => ({ ...prev, supplierName: '' }));
          }}
          placeholder="e.g. Bosch Tools Distributor / बॉश टूल्स"
          error={errors.supplierName}
          required
        />

        <Input
          label={t('purchases.supplierContact')}
          value={supplierContact}
          onChange={(e) => setSupplierContact(e.target.value)}
          placeholder="+91 98..."
        />
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
          placeholder={t('purchases.notesPlaceholder')}
          className="w-full rounded-lg border border-amber-200/80 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 placeholder:text-slate-400"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-3 flex items-center justify-end gap-3 border-t border-amber-100/80">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};
