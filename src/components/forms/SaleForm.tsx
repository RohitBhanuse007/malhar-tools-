import React, { useState, useEffect, useRef } from 'react';
import { Product, Customer, PaymentMode } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { validateSale } from '../../utils/validators';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { CreateSaleInput } from '../../services/firebase/saleService';
import { updateProduct } from '../../services/firebase/productService';
import { calculateGstLineItem, INDIAN_STATES, getStateByCode, GST_RATES } from '../../utils/gstUtils';
import { AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

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
  const { t, language } = useLanguage();

  const [productId, setProductId] = useState(preselectedProductId || (products[0]?.id || ''));
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState(() => {
    const initialProd = products.find((p) => p.id === (preselectedProductId || products[0]?.id));
    return initialProd ? String(initialProd.sellingPrice || 0) : '';
  });
  const [updateMasterPrice, setUpdateMasterPrice] = useState(false);
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [initialPaid, setInitialPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // GST & Tax Invoice states
  const [hsnCode, setHsnCode] = useState(() => {
    const initialProd = products.find((p) => p.id === (preselectedProductId || products[0]?.id));
    return initialProd?.hsnCode || '8204';
  });
  const [gstRate, setGstRate] = useState<number>(() => {
    const initialProd = products.find((p) => p.id === (preselectedProductId || products[0]?.id));
    return initialProd?.gstRate !== undefined ? initialProd.gstRate : 18;
  });
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState('27');
  const [discount, setDiscount] = useState('0');
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    return `MT/26-27/${String(Math.floor(1000 + Math.random() * 9000))}`;
  });

  const selectedProduct = products.find((p) => p.id === productId);
  const availableStock = selectedProduct ? Number(selectedProduct.currentStock) || 0 : 0;

  const lastPopulatedProductIdRef = useRef<string>(productId);

  // Auto populate selling price and GST details ONLY when selecting a new product or initial load
  useEffect(() => {
    if (productId) {
      if (productId !== lastPopulatedProductIdRef.current || !sellingPrice) {
        const p = products.find((item) => item.id === productId);
        if (p) {
          setSellingPrice(String(p.sellingPrice || 0));
          if (p.hsnCode) setHsnCode(p.hsnCode);
          if (p.gstRate !== undefined) setGstRate(p.gstRate);
          lastPopulatedProductIdRef.current = productId;
        }
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

  const isInterState = customerStateCode !== '27';
  const taxBreakdown = calculateGstLineItem({
    quantity: Number(quantity) || 0,
    unitPrice: Number(sellingPrice) || 0,
    gstRate: Number(gstRate) || 0,
    discount: Number(discount) || 0,
    isTaxInclusive,
    isInterState,
  });
  const totalAmount = taxBreakdown.grandTotal;
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

    if (
      updateMasterPrice &&
      Number(sellingPrice) > 0 &&
      selectedProduct &&
      Number(sellingPrice) !== Number(selectedProduct.sellingPrice)
    ) {
      try {
        await updateProduct(productId, { sellingPrice: Number(sellingPrice) });
      } catch (err) {
        console.error('Failed to update product master selling price:', err);
      }
    }

    await onSubmit({
      productId,
      productName: selectedProduct.name,
      quantity: Number(quantity),
      sellingPrice: Number(sellingPrice),
      totalAmount,
      date,
      paymentMode,
      customerName: customerName.trim(),
      customerId: customerId || '',
      initialPaid: isCreditSale ? Number(initialPaid) || 0 : totalAmount,
      notes: notes.trim(),
      // GST snapshot fields
      invoiceNumber: invoiceNumber.trim(),
      customerGstin: customerGstin.trim().toUpperCase(),
      customerState: getStateByCode(customerStateCode)?.name || 'Maharashtra',
      customerStateCode: customerStateCode || '27',
      hsnCode: hsnCode.trim(),
      gstRate: Number(gstRate),
      isTaxInclusive,
      taxableAmount: taxBreakdown.taxableAmount,
      cgst: taxBreakdown.cgst,
      sgst: taxBreakdown.sgst,
      igst: taxBreakdown.igst,
      totalGst: taxBreakdown.totalGst,
      isInterState,
      discount: Number(discount) || 0,
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
          const newId = e.target.value;
          setProductId(newId);
          lastPopulatedProductIdRef.current = newId;
          const p = products.find((item) => item.id === newId);
          if (p) {
            setSellingPrice(String(p.sellingPrice || 0));
            setUpdateMasterPrice(false);
          }
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

      {/* Price Difference Indicator & Optional Master Price Update */}
      {selectedProduct && Number(sellingPrice) > 0 && Number(sellingPrice) !== Number(selectedProduct.sellingPrice) && (
        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
          <span className="text-slate-600">
            {language === 'mr' ? 'प्रॉडक्टची मूळ किंमत:' : 'Catalog Default Price:'}{' '}
            <span className="font-bold font-mono text-slate-800">₹{selectedProduct.sellingPrice}</span>
          </span>
          <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-amber-900 hover:text-amber-950">
            <input
              type="checkbox"
              checked={updateMasterPrice}
              onChange={(e) => setUpdateMasterPrice(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 border-amber-400 focus:ring-amber-500"
            />
            <span>
              {language === 'mr'
                ? `मूळ प्रॉडक्टची किंमत पण ₹${sellingPrice} करा`
                : `Update catalog price to ₹${sellingPrice}`}
            </span>
          </label>
        </div>
      )}

      {/* GST & Tax Classification Panel */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-2xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-600" />
            <span>GST & Tax Invoice Configuration</span>
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
            <input
              type="checkbox"
              checked={isTaxInclusive}
              onChange={(e) => setIsTaxInclusive(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <span>{isTaxInclusive ? 'Tax-Inclusive (किंमत कर समाविष्ट)' : 'Exclusive (+ GST)'}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <Input
            label="HSN / SAC"
            value={hsnCode}
            onChange={(e) => setHsnCode(e.target.value)}
            placeholder="8204"
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
                  {r}% GST
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Discount (₹)"
            type="number"
            min="0"
            step="any"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
            leftAddon="₹"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <Input
            label="Customer GSTIN (B2B Only)"
            value={customerGstin}
            onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
            placeholder="e.g. 27ABCDE1234F1Z5"
          />

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Place of Supply (State)
            </label>
            <select
              value={customerStateCode}
              onChange={(e) => setCustomerStateCode(e.target.value)}
              className="w-full rounded-xl border border-amber-200 py-2.5 px-3 text-xs font-bold bg-white text-slate-900"
            >
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Tax Breakdown Strip */}
        <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2 font-semibold">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Taxable Amount</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(taxBreakdown.taxableAmount)}</span>
          </div>

          {!isInterState ? (
            <>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">CGST ({gstRate / 2}%)</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(taxBreakdown.cgst)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">SGST ({gstRate / 2}%)</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(taxBreakdown.sgst)}</span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-blue-600 block text-[10px] uppercase font-bold">IGST Inter-State ({gstRate}%)</span>
              <span className="font-mono font-bold text-blue-700">{formatCurrency(taxBreakdown.igst)}</span>
            </div>
          )}

          <div>
            <span className="text-amber-800 block text-[10px] uppercase font-bold">Total GST</span>
            <span className="font-mono font-bold text-amber-800">{formatCurrency(taxBreakdown.totalGst)}</span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Grand Total</span>
            <span className="font-mono font-black text-emerald-600 text-sm">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
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
