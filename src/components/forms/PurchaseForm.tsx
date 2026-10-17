import React, { useState, useEffect, useRef } from 'react';
import { Product, Purchase, PaymentStatus } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { validatePurchase } from '../../utils/validators';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { calculateGstLineItem, INDIAN_STATES, getStateByCode, GST_RATES } from '../../utils/gstUtils';
import { FileText, CheckCircle2 } from 'lucide-react';

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
  const [purchasePrice, setPurchasePrice] = useState(() => {
    const initialProd = products.find((p) => p.id === (preselectedProductId || products[0]?.id));
    return initialProd ? String(initialProd.purchasePrice || 0) : '';
  });
  const [date, setDate] = useState(getTodayDateString());
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // GST Inward Purchase Fields
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierStateCode, setSupplierStateCode] = useState('27');
  const [hsnCode, setHsnCode] = useState(() => {
    const initialProd = products.find((p) => p.id === (preselectedProductId || products[0]?.id));
    return initialProd?.hsnCode || '8204';
  });
  const [gstRate, setGstRate] = useState<number>(() => {
    const initialProd = products.find((p) => p.id === (preselectedProductId || products[0]?.id));
    return initialProd?.gstRate !== undefined ? initialProd.gstRate : 18;
  });
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [isEligibleITC, setIsEligibleITC] = useState(true);

  const selectedProduct = products.find((p) => p.id === productId);
  const lastPopulatedProductIdRef = useRef<string>(productId);

  // Auto populate purchase price ONLY when product changes or initial load
  useEffect(() => {
    if (productId) {
      if (productId !== lastPopulatedProductIdRef.current || !purchasePrice) {
        if (selectedProduct) {
          setPurchasePrice(String(selectedProduct.purchasePrice || 0));
          lastPopulatedProductIdRef.current = productId;
        }
      }
    }
  }, [productId, products, selectedProduct]);

  const isInterState = supplierStateCode !== '27';
  const taxBreakdown = calculateGstLineItem({
    quantity: Number(quantity) || 0,
    unitPrice: Number(purchasePrice) || 0,
    gstRate: Number(gstRate) || 0,
    isTaxInclusive,
    isInterState,
  });
  const totalAmount = taxBreakdown.grandTotal;

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
      // GST Inward snapshot fields
      invoiceNumber: supplierInvoiceNumber.trim() || undefined,
      supplierGstin: supplierGstin.trim().toUpperCase() || undefined,
      supplierState: getStateByCode(supplierStateCode)?.name,
      supplierStateCode,
      hsnCode: hsnCode.trim() || undefined,
      gstRate: Number(gstRate),
      isTaxInclusive,
      taxableAmount: taxBreakdown.taxableAmount,
      cgst: taxBreakdown.cgst,
      sgst: taxBreakdown.sgst,
      igst: taxBreakdown.igst,
      totalGst: taxBreakdown.totalGst,
      isInterState,
      isEligibleITC,
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
          const newId = e.target.value;
          setProductId(newId);
          lastPopulatedProductIdRef.current = newId;
          const p = products.find((item) => item.id === newId);
          if (p) {
            setPurchasePrice(String(p.purchasePrice || 0));
            if (p.hsnCode) setHsnCode(p.hsnCode);
            if (p.gstRate !== undefined) setGstRate(p.gstRate);
          }
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

      {/* GST Inward Supply & ITC Configuration */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-2xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Supplier GST & Input Tax Credit (ITC)</span>
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
            <input
              type="checkbox"
              checked={isEligibleITC}
              onChange={(e) => setIsEligibleITC(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className={isEligibleITC ? 'text-emerald-800 font-extrabold' : 'text-slate-500'}>
              {isEligibleITC ? '✓ Eligible for ITC (कर वजावट पात्र)' : 'Ineligible (वजावट अपात्र)'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <Input
            label="Supplier Inv No."
            value={supplierInvoiceNumber}
            onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
            placeholder="e.g. POS1/26/18304"
          />

          <Input
            label="Supplier GSTIN"
            value={supplierGstin}
            onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
            placeholder="27AABC..."
          />

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              GST Rate
            </label>
            <select
              value={gstRate}
              onChange={(e) => setGstRate(Number(e.target.value))}
              className="w-full rounded-xl border border-amber-200 py-2.5 px-3 text-xs font-bold bg-white text-slate-900"
            >
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}% GST Rate
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
            <input
              type="checkbox"
              checked={isTaxInclusive}
              onChange={(e) => setIsTaxInclusive(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <span>{isTaxInclusive ? 'Purchase rate includes GST' : 'Add GST on top of rate'}</span>
          </label>
        </div>

        {/* Real-time Purchase Tax Breakdown */}
        <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2 font-semibold">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Taxable Inward</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(taxBreakdown.taxableAmount)}</span>
          </div>

          {!isInterState ? (
            <>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Input CGST ({gstRate / 2}%)</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(taxBreakdown.cgst)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Input SGST ({gstRate / 2}%)</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(taxBreakdown.sgst)}</span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-blue-600 block text-[10px] uppercase font-bold">Input IGST ({gstRate}%)</span>
              <span className="font-mono font-bold text-blue-700">{formatCurrency(taxBreakdown.igst)}</span>
            </div>
          )}

          <div>
            <span className="text-blue-800 block text-[10px] uppercase font-bold">Input Tax Credit</span>
            <span className={`font-mono font-bold ${isEligibleITC ? 'text-emerald-700' : 'text-slate-400 line-through'}`}>
              {formatCurrency(taxBreakdown.totalGst)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Grand Purchase Total</span>
            <span className="font-mono font-black text-slate-950 text-sm">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
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
