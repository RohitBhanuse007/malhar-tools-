import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Building2,
  CreditCard,
  ShoppingCart,
  Save,
  Check,
  Plus,
  Receipt,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Sale, Purchase, Product, Customer, ShopSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { GstTaxInvoice } from '../../components/gst/GstTaxInvoice';
import { SaleForm } from '../../components/forms/SaleForm';
import { CreateSaleInput } from '../../services/firebase/saleService';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import {
  INDIAN_STATES,
  GST_RATES,
  getStateByCode,
  normalizeSaleGst,
  exportToCsv,
} from '../../utils/gstUtils';

interface GSTManagementPageProps {
  sales: Sale[];
  purchases?: Purchase[];
  products: Product[];
  customers: Customer[];
  shopSettings?: ShopSettings | null;
  onSaveSettings: (settings: Partial<ShopSettings>) => Promise<void>;
  onAddSale?: (saleData: CreateSaleInput) => Promise<void>;
}

type GstSection = 'bills' | 'settings';

export const GSTManagementPage: React.FC<GSTManagementPageProps> = ({
  sales,
  products,
  customers,
  shopSettings,
  onSaveSettings,
  onAddSale,
}) => {
  const { t, language } = useLanguage();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<GstSection>('bills');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('');

  // Selected Sale for viewing GST Tax Invoice modal
  const [viewInvoiceSale, setViewInvoiceSale] = useState<Sale | null>(null);

  // Modal to create new GST Bill
  const [isCreateBillModalOpen, setIsCreateBillModalOpen] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // GST Settings form state
  const [gstForm, setGstForm] = useState({
    gstin: shopSettings?.gstin || '27AMWPB3781F1ZR',
    tradeName: shopSettings?.tradeName || 'Malhar Tools Hardware & Spares',
    state: shopSettings?.state || 'Maharashtra',
    stateCode: shopSettings?.stateCode || '27',
    defaultGstRate: shopSettings?.defaultGstRate || 18,
    bankName: shopSettings?.bankName || '',
    bankAccountNumber: shopSettings?.bankAccountNumber || '',
    bankIfsc: shopSettings?.bankIfsc || '',
    bankBranch: shopSettings?.bankBranch || '',
    invoicePrefix: shopSettings?.invoicePrefix || 'MT/26-27/',
    invoiceTerms: shopSettings?.invoiceTerms || '',
  });
  const [isSavingGst, setIsSavingGst] = useState(false);

  useEffect(() => {
    if (shopSettings) {
      setGstForm({
        gstin: shopSettings.gstin || '27AMWPB3781F1ZR',
        tradeName: shopSettings.tradeName || 'Malhar Tools Hardware & Spares',
        state: shopSettings.state || 'Maharashtra',
        stateCode: shopSettings.stateCode || '27',
        defaultGstRate: shopSettings.defaultGstRate || 18,
        bankName: shopSettings.bankName || '',
        bankAccountNumber: shopSettings.bankAccountNumber || '',
        bankIfsc: shopSettings.bankIfsc || '',
        bankBranch: shopSettings.bankBranch || '',
        invoicePrefix: shopSettings.invoicePrefix || 'MT/26-27/',
        invoiceTerms: shopSettings.invoiceTerms || '',
      });
    }
  }, [shopSettings]);

  const shopStateCode = shopSettings?.stateCode || '27';

  // Filtered Sales List
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const norm = normalizeSaleGst(s, shopStateCode);
      const q = salesSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.productName.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerGstin && s.customerGstin.toLowerCase().includes(q)) ||
        (norm.invoiceNumber && norm.invoiceNumber.toLowerCase().includes(q));

      const matchesDate = salesDateFilter ? s.date === salesDateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [sales, salesSearch, salesDateFilter, shopStateCode]);

  // Aggregate Stats for GST Bills
  const billStats = useMemo(() => {
    let totalTaxable = 0;
    let totalGst = 0;
    let totalGrand = 0;
    for (const s of filteredSales) {
      const norm = normalizeSaleGst(s, shopStateCode);
      totalTaxable += norm.taxableAmount;
      totalGst += norm.totalGst;
      totalGrand += s.totalAmount;
    }
    return {
      count: filteredSales.length,
      totalTaxable,
      totalGst,
      totalGrand,
    };
  }, [filteredSales, shopStateCode]);

  // Handle saving GST settings
  const handleSaveGstSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGst(true);
    try {
      const stateObj = getStateByCode(gstForm.stateCode);
      const updated: Partial<ShopSettings> = {
        ...gstForm,
        state: stateObj?.name || gstForm.state,
        defaultGstRate: Number(gstForm.defaultGstRate) || 18,
      };
      await onSaveSettings(updated);
      success('GST settings saved successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to save GST settings.');
    } finally {
      setIsSavingGst(false);
    }
  };

  // Export Sales Report to CSV
  const handleExportSalesCsv = () => {
    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Customer GSTIN',
      'Product Name',
      'Quantity',
      'Taxable Value (₹)',
      'GST Rate (%)',
      'CGST (₹)',
      'SGST (₹)',
      'IGST (₹)',
      'Total Bill (₹)',
    ];
    const rows = [
      headers,
      ...filteredSales.map((s) => {
        const norm = normalizeSaleGst(s, shopStateCode);
        return [
          norm.invoiceNumber,
          s.date,
          s.customerName || 'Walk-in Counter',
          s.customerGstin || '-',
          s.productName,
          s.quantity,
          norm.taxableAmount,
          norm.gstRate,
          norm.cgst,
          norm.sgst,
          norm.igst,
          s.totalAmount,
        ];
      }),
    ];
    exportToCsv(`Malhar_Tools_GST_Bills_${getTodayDateString()}`, rows);
    success('GST Bills list exported to CSV.');
  };

  // Handle creating a new GST Bill from modal
  const handleCreateBill = async (saleData: CreateSaleInput) => {
    if (!onAddSale) {
      toastError('Add sale action not available.');
      return;
    }
    setIsSubmittingSale(true);
    try {
      await onAddSale(saleData);
      setIsCreateBillModalOpen(false);
      success('GST Bill created successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to create GST Bill.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Malhar Tools Official Logo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-xs">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black border border-amber-500/40 p-1.5 shrink-0 overflow-hidden shadow-md flex items-center justify-center">
            <img
              src={shopSettings?.logoUrl || '/logo.png'}
              alt="Malhar Tools Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{language === 'mr' ? 'जीएसटी बिल आणि इनव्हॉइस' : 'GST Bills & Invoices'}</span>
              </h1>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {shopSettings?.shopName || 'Malhar Tools'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
              {language === 'mr'
                ? 'ग्राहकांसाठी अधिकृत जीएसटी कर इनव्हॉइस तयार करा, पहा आणि प्रिंट करा'
                : 'Create, manage, and print official GST tax invoices for customers'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Quick Shop GSTIN Badge */}
          <div className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-slate-800 flex items-center gap-2 shrink-0 shadow-xs">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>GSTIN: <strong className="font-mono text-slate-950 font-bold">{shopSettings?.gstin || '27AMWPB3781F1ZR'}</strong></span>
          </div>

          {/* New GST Bill button */}
          {onAddSale && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateBillModalOpen(true)}
              className="shadow-sm shadow-amber-500/20 whitespace-nowrap"
            >
              {language === 'mr' ? 'नवीन बिल बनवा' : 'Create GST Bill'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-amber-200/60 pb-px">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'bills'
              ? 'border-amber-500 text-amber-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{language === 'mr' ? 'जीएसटी बिल (GST Bills)' : 'GST Bills & Invoices'}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-900 font-bold">
            {sales.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{language === 'mr' ? 'जीएसटी सेटिंग्ज (Settings)' : 'GST Settings'}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GST BILLS LIST & ACTIONS                          */}
      {/* ======================================================== */}
      {activeTab === 'bills' && (
        <div className="space-y-5">
          {/* Clean Bill Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-amber-200/70 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'mr' ? 'एकूण जीएसटी बिल' : 'Total GST Bills'}
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {billStats.count} <span className="text-xs text-slate-400 font-semibold">{language === 'mr' ? 'इनव्हॉइस' : 'Invoices'}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/70 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'mr' ? 'एकूण करपात्र मूल्य' : 'Total Taxable Value'}
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {formatCurrency(billStats.totalTaxable)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/70 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'mr' ? 'एकूण गोळा झालेला GST' : 'Total GST Collected'}
              </span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatCurrency(billStats.totalGst)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/70 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'mr' ? 'एकूण बिल रक्कम' : 'Total Billed Value'}
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {formatCurrency(billStats.totalGrand)}
              </div>
            </div>
          </div>

          {/* Search, Filter & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    language === 'mr'
                      ? 'बिल नंबर, ग्राहक, GSTIN किंवा उत्पादनानुसार शोधा...'
                      : 'Search by invoice #, customer name, GSTIN, or product...'
                  }
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-semibold"
                />
              </div>
              <input
                type="date"
                value={salesDateFilter}
                onChange={(e) => setSalesDateFilter(e.target.value)}
                className="text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-semibold bg-white"
              />
              {salesDateFilter && (
                <button
                  type="button"
                  onClick={() => setSalesDateFilter('')}
                  className="text-xs text-amber-800 font-bold hover:underline px-1"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                {language === 'mr' ? 'प्रिंट यादी' : 'Print List'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportSalesCsv}
              >
                {language === 'mr' ? 'CSV डाउनलोड' : 'Export CSV'}
              </Button>
            </div>
          </div>

          {/* Bills Table */}
          {filteredSales.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="w-8 h-8" />}
              title={language === 'mr' ? 'कोणतेही जीएसटी बिल आढळले नाही' : 'No GST Bills Found'}
              description={
                language === 'mr'
                  ? 'सध्याच्या शोधाशी जुळणारे कोणतेही जीएसटी बिल नाही.'
                  : 'No GST bills match the search or filter criteria.'
              }
              actionLabel={onAddSale ? (language === 'mr' ? '+ नवीन बिल बनवा' : '+ Create GST Bill') : undefined}
              onAction={onAddSale ? () => setIsCreateBillModalOpen(true) : undefined}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/60 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer / Party</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Taxable</th>
                      <th className="py-3 px-4 text-center">GST Rate</th>
                      <th className="py-3 px-4 text-right">GST Amount</th>
                      <th className="py-3 px-4 text-right">Total Bill</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((s) => {
                      const norm = normalizeSaleGst(s, shopStateCode);
                      return (
                        <tr key={s.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {norm.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">
                            {formatDate(s.date)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">
                              {s.customerName || 'Walk-in Counter'}
                            </span>
                            {s.customerGstin && (
                              <span className="text-[10px] font-mono text-slate-500 block">
                                GSTIN: {s.customerGstin}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {s.productName}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                            {s.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            {formatCurrency(norm.taxableAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                              {norm.gstRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-800 font-semibold">
                            {formatCurrency(norm.totalGst)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-950">
                            {formatCurrency(s.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setViewInvoiceSale(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs transition-colors"
                              title="Print GST Tax Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{language === 'mr' ? 'प्रिंट बिल' : 'Print Bill'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GST SETTINGS                                      */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveGstSettings} className="space-y-6 max-w-4xl">
          <Card>
            <CardHeader
              title={language === 'mr' ? 'दुकान जीएसटी तपशील' : 'Shop GST Details'}
              subtitle={
                language === 'mr'
                  ? 'तुमचा अधिकृत GSTIN क्रमांक आणि व्यवसायाचे नाव कॉन्फिगर करा'
                  : 'Configure your official GSTIN and business trade name printed on tax invoices'
              }
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Shop GSTIN Number"
                  value={gstForm.gstin}
                  onChange={(e) => setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="27AMWPB3781F1ZR"
                  required
                />

                <Input
                  label="Trade / Legal Name"
                  value={gstForm.tradeName}
                  onChange={(e) => setGstForm({ ...gstForm, tradeName: e.target.value })}
                  placeholder="Malhar Tools Hardware & Spares"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Shop State (Place of Supply)
                  </label>
                  <select
                    value={gstForm.stateCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const s = getStateByCode(code);
                      setGstForm({
                        ...gstForm,
                        stateCode: code,
                        state: s?.name || gstForm.state,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm bg-white font-medium"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default GST Rate (%)
                  </label>
                  <select
                    value={gstForm.defaultGstRate}
                    onChange={(e) => setGstForm({ ...gstForm, defaultGstRate: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm bg-white font-medium"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}% GST
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={language === 'mr' ? 'इनव्हॉइस सिरीयल आणि अटी' : 'Invoice Serial & Terms'}
              subtitle={
                language === 'mr'
                  ? 'इनव्हॉइस नंबर प्रीफिक्स आणि बिलावरील नियम व अटी'
                  : 'Customize invoice numbering sequence and conditions displayed on invoices'
              }
            />
            <CardBody className="space-y-4">
              <Input
                label="Invoice Number Prefix"
                value={gstForm.invoicePrefix}
                onChange={(e) => setGstForm({ ...gstForm, invoicePrefix: e.target.value })}
                placeholder="MT/26-27/"
                helperText="Example: MT/26-27/0001"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Terms & Conditions (Printed on Invoice)
                </label>
                <textarea
                  rows={3}
                  value={gstForm.invoiceTerms}
                  onChange={(e) => setGstForm({ ...gstForm, invoiceTerms: e.target.value })}
                  placeholder="1. Goods once sold will not be taken back without original invoice..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={isSavingGst}
              className="shadow-sm shadow-amber-500/20"
            >
              Save GST Settings
            </Button>
          </div>
        </form>
      )}

      {/* Modal: Create New GST Bill */}
      {isCreateBillModalOpen && (
        <Modal
          isOpen={isCreateBillModalOpen}
          onClose={() => setIsCreateBillModalOpen(false)}
          title={language === 'mr' ? 'नवीन जीएसटी बिल बनवा' : 'Create New GST Bill'}
          subtitle={
            language === 'mr'
              ? 'उत्पादन निवडून ग्राहकाचे नाव व जीएसटी तपशील भरा'
              : 'Select product and enter customer tax information'
          }
          maxWidth="lg"
        >
          <SaleForm
            products={products}
            customers={customers}
            onSubmit={handleCreateBill}
            onCancel={() => setIsCreateBillModalOpen(false)}
            isLoading={isSubmittingSale}
          />
        </Modal>
      )}

      {/* Modal: View & Print GST Tax Invoice */}
      {viewInvoiceSale && (
        <Modal
          isOpen={Boolean(viewInvoiceSale)}
          onClose={() => setViewInvoiceSale(null)}
          title={language === 'mr' ? 'जीएसटी टॅक्स इनव्हॉइस' : 'GST Tax Invoice'}
          maxWidth="2xl"
        >
          <GstTaxInvoice
            sale={viewInvoiceSale}
            shopSettings={shopSettings}
            onClose={() => setViewInvoiceSale(null)}
            isModal={true}
          />
        </Modal>
      )}
    </div>
  );
};
