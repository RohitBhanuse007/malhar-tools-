import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Building2,
  CreditCard,
  TrendingUp,
  Truck,
  ShoppingCart,
  ShieldCheck,
  Eye,
  Save,
  RotateCcw,
  Check,
  ReceiptText
} from 'lucide-react';
import { Sale, Purchase, Product, Customer, ShopSettings, GstFilterPeriod } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { GstTaxInvoice } from '../../components/gst/GstTaxInvoice';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import {
  INDIAN_STATES,
  GST_RATES,
  getStateByCode,
  validateGstin,
  getDateRangeForPeriod,
  normalizeSaleGst,
  normalizePurchaseGst,
  computeGstSummary,
  exportToCsv,
} from '../../utils/gstUtils';

interface GSTManagementPageProps {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  customers: Customer[];
  shopSettings?: ShopSettings | null;
  onSaveSettings: (settings: Partial<ShopSettings>) => Promise<void>;
}

type GstSection = 'summary' | 'sales' | 'purchases' | 'monthly' | 'settings';

export const GSTManagementPage: React.FC<GSTManagementPageProps> = ({
  sales,
  purchases,
  products,
  customers,
  shopSettings,
  onSaveSettings,
}) => {
  const { t, language } = useLanguage();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<GstSection>('summary');

  // Summary period filter: daily, monthly, yearly, custom
  const [summaryPeriod, setSummaryPeriod] = useState<GstFilterPeriod>('this_month');
  const [customFrom, setCustomFrom] = useState(getTodayDateString());
  const [customTo, setCustomTo] = useState(getTodayDateString());

  // Search & filter states
  const [salesSearch, setSalesSearch] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('');
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesDateFilter, setPurchasesDateFilter] = useState('');
  const [itcFilter, setItcFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');

  // Selected Sale for viewing GST Tax Invoice modal
  const [viewInvoiceSale, setViewInvoiceSale] = useState<Sale | null>(null);

  // Month selector for monthly report (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  });

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
      });
    }
  }, [shopSettings]);

  const shopStateCode = shopSettings?.stateCode || '27';

  // Computed Date Range for GST Summary
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(summaryPeriod, customFrom, customTo);
  }, [summaryPeriod, customFrom, customTo]);

  // Computed Summary Data for the active period
  const summaryData = useMemo(() => {
    return computeGstSummary(sales, purchases, dateRange.fromDate, dateRange.toDate, shopStateCode);
  }, [sales, purchases, dateRange, shopStateCode]);

  // Filtered Sales List
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const norm = normalizeSaleGst(s, shopStateCode);
      const matchesSearch =
        s.productName.toLowerCase().includes(salesSearch.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(salesSearch.toLowerCase())) ||
        (s.customerGstin && s.customerGstin.toLowerCase().includes(salesSearch.toLowerCase())) ||
        (norm.invoiceNumber && norm.invoiceNumber.toLowerCase().includes(salesSearch.toLowerCase()));

      const matchesDate = salesDateFilter ? s.date === salesDateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [sales, salesSearch, salesDateFilter, shopStateCode]);

  // Filtered Purchases List
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const norm = normalizePurchaseGst(p, shopStateCode);
      const matchesSearch =
        p.productName.toLowerCase().includes(purchasesSearch.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(purchasesSearch.toLowerCase()) ||
        (p.supplierGstin && p.supplierGstin.toLowerCase().includes(purchasesSearch.toLowerCase())) ||
        (norm.invoiceNumber && norm.invoiceNumber.toLowerCase().includes(purchasesSearch.toLowerCase()));

      const matchesDate = purchasesDateFilter ? p.date === purchasesDateFilter : true;
      const matchesItc =
        itcFilter === 'all'
          ? true
          : itcFilter === 'eligible'
          ? norm.isEligibleITC
          : !norm.isEligibleITC;

      return matchesSearch && matchesDate && matchesItc;
    });
  }, [purchases, purchasesSearch, purchasesDateFilter, itcFilter, shopStateCode]);

  // Monthly Report Data
  const monthlyData = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const fromDate = `${selectedMonth}-01`;
    const toDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

    const monthSummary = computeGstSummary(sales, purchases, fromDate, toDate, shopStateCode);
    const monthSales = sales.filter((s) => s.date >= fromDate && s.date <= toDate);
    const monthPurchases = purchases.filter((p) => p.date >= fromDate && p.date <= toDate);

    return {
      fromDate,
      toDate,
      monthSummary,
      monthSales,
      monthPurchases,
    };
  }, [selectedMonth, sales, purchases, shopStateCode]);

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

  // Export GST Summary to CSV
  const handleExportSummaryCsv = () => {
    const headers = ['Category', 'Taxable Amount (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total GST (₹)', 'Grand Total (₹)'];
    const rows = [
      headers,
      [
        'Sales (Output Tax Collected)',
        summaryData.totalTaxableSales,
        summaryData.outwardCgst,
        summaryData.outwardSgst,
        summaryData.outwardIgst,
        summaryData.totalOutputTax,
        summaryData.totalSalesValue,
      ],
      [
        'Purchases (Input Tax Credit / Paid)',
        summaryData.totalTaxablePurchases,
        summaryData.inwardCgst,
        summaryData.inwardSgst,
        summaryData.inwardIgst,
        summaryData.eligibleItc,
        summaryData.totalPurchasesValue,
      ],
      [
        'Net Estimated Tax (Payable / Balance)',
        summaryData.totalTaxableSales - summaryData.totalTaxablePurchases,
        summaryData.outwardCgst - summaryData.inwardCgst,
        summaryData.outwardSgst - summaryData.inwardSgst,
        summaryData.outwardIgst - summaryData.inwardIgst,
        summaryData.netTaxPayable,
        summaryData.totalSalesValue - summaryData.totalPurchasesValue,
      ],
    ];
    exportToCsv(`Malhar_Tools_GST_Summary_${dateRange.fromDate}_to_${dateRange.toDate}`, rows);
    success('GST Summary exported to CSV.');
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
    exportToCsv(`Malhar_Tools_GST_Sales_${getTodayDateString()}`, rows);
    success('GST Sales report exported to CSV.');
  };

  // Export Purchases Report to CSV
  const handleExportPurchasesCsv = () => {
    const headers = [
      'Supplier Invoice No',
      'Date',
      'Supplier Name',
      'Supplier GSTIN',
      'Product Name',
      'Quantity',
      'Taxable Value (₹)',
      'GST Rate (%)',
      'CGST (₹)',
      'SGST (₹)',
      'IGST (₹)',
      'Total Amount (₹)',
      'ITC Eligibility',
    ];
    const rows = [
      headers,
      ...filteredPurchases.map((p) => {
        const norm = normalizePurchaseGst(p, shopStateCode);
        return [
          norm.invoiceNumber,
          p.date,
          p.supplierName,
          p.supplierGstin || '-',
          p.productName,
          p.quantity,
          norm.taxableAmount,
          norm.gstRate,
          norm.cgst,
          norm.sgst,
          norm.igst,
          p.totalAmount,
          norm.isEligibleITC ? 'Eligible' : 'Ineligible',
        ];
      }),
    ];
    exportToCsv(`Malhar_Tools_GST_Purchases_${getTodayDateString()}`, rows);
    success('GST Purchases report exported to CSV.');
  };

  // Export Monthly Report to CSV
  const handleExportMonthlyCsv = () => {
    const headers = [
      'Type',
      'Invoice/Bill No',
      'Date',
      'Party Name',
      'GSTIN',
      'Product',
      'Taxable Value (₹)',
      'GST Rate (%)',
      'CGST (₹)',
      'SGST (₹)',
      'IGST (₹)',
      'Total (₹)',
    ];
    const salesRows = monthlyData.monthSales.map((s) => {
      const norm = normalizeSaleGst(s, shopStateCode);
      return [
        'Sale',
        norm.invoiceNumber,
        s.date,
        s.customerName || 'Counter',
        s.customerGstin || '-',
        s.productName,
        norm.taxableAmount,
        norm.gstRate,
        norm.cgst,
        norm.sgst,
        norm.igst,
        s.totalAmount,
      ];
    });
    const purchaseRows = monthlyData.monthPurchases.map((p) => {
      const norm = normalizePurchaseGst(p, shopStateCode);
      return [
        'Purchase',
        norm.invoiceNumber,
        p.date,
        p.supplierName,
        p.supplierGstin || '-',
        p.productName,
        norm.taxableAmount,
        norm.gstRate,
        norm.cgst,
        norm.sgst,
        norm.igst,
        p.totalAmount,
      ];
    });

    const rows = [headers, ...salesRows, ...purchaseRows];
    exportToCsv(`Malhar_Tools_Monthly_GST_${selectedMonth}`, rows);
    success('Monthly GST report exported to CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header with Malhar Tools Logo */}
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
                <span>{t('gst.title')}</span>
              </h1>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {shopSettings?.shopName || 'Malhar Tools'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
              {t('gst.subtitle')}
            </p>
          </div>
        </div>

        {/* Quick Shop GSTIN Badge */}
        <div className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-slate-800 flex items-center gap-2 shrink-0 shadow-xs">
          <Building2 className="w-4 h-4 text-amber-600" />
          <span>GSTIN: <strong className="font-mono text-slate-950 font-bold">{shopSettings?.gstin || '27AMWPB3781F1ZR'}</strong></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-amber-200/60 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'summary'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{t('gst.summaryTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'sales'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{t('gst.salesTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'purchases'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{t('gst.purchasesTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'monthly'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('gst.monthlyTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{t('gst.settingsTab')}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GST SUMMARY (Daily, Monthly, Yearly)              */}
      {/* ======================================================== */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Period Filter Bar & Actions */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">
                Period:
              </span>
              <button
                type="button"
                onClick={() => setSummaryPeriod('today')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  summaryPeriod === 'today'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('gst.daily')}
              </button>
              <button
                type="button"
                onClick={() => setSummaryPeriod('this_month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  summaryPeriod === 'this_month'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('gst.monthly')}
              </button>
              <button
                type="button"
                onClick={() => setSummaryPeriod('fy')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  summaryPeriod === 'fy'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('gst.yearly')}
              </button>
              <button
                type="button"
                onClick={() => setSummaryPeriod('custom')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  summaryPeriod === 'custom'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('gst.customRange')}
              </button>

              {summaryPeriod === 'custom' && (
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                  />
                  <span className="text-xs text-slate-500">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Print & Download buttons */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                {t('gst.printSummary')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportSummaryCsv}
              >
                {t('gst.downloadCsv')}
              </Button>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Sales & Output Tax */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Sales (Outward)
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {formatCurrency(summaryData.totalSalesValue)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Taxable Sales:</span>
                  <strong className="text-slate-900">{formatCurrency(summaryData.totalTaxableSales)}</strong>
                </div>
                <div className="flex justify-between text-amber-800 font-semibold">
                  <span>Total Output GST:</span>
                  <span>{formatCurrency(summaryData.totalOutputTax)}</span>
                </div>
              </div>
            </div>

            {/* 2. Total Purchases & Input Tax */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Purchases (Inward)
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {formatCurrency(summaryData.totalPurchasesValue)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Taxable Purchases:</span>
                  <strong className="text-slate-900">{formatCurrency(summaryData.totalTaxablePurchases)}</strong>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Eligible ITC:</span>
                  <span>{formatCurrency(summaryData.eligibleItc)}</span>
                </div>
              </div>
            </div>

            {/* 3. Net Tax Liability */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Estimated Net Tax
              </span>
              <div
                className={`text-2xl font-black mt-1 ${
                  summaryData.netTaxPayable > 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(summaryData.netTaxPayable)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                {summaryData.netTaxPayable > 0 ? (
                  <span className="text-amber-900 font-medium">
                    Output Tax − Eligible ITC Credit
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold">
                    ✓ Full ITC balance covers output tax
                  </span>
                )}
              </div>
            </div>

            {/* 4. Transactions Count */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Activity in Period
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {dateRange.label}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Sales Invoices:</span>
                  <strong className="text-slate-900">{sales.filter((s) => s.date >= dateRange.fromDate && s.date <= dateRange.toDate).length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Purchase Bills:</span>
                  <strong className="text-slate-900">{purchases.filter((p) => p.date >= dateRange.fromDate && p.date <= dateRange.toDate).length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Simple GST Reconciliation Table */}
          <Card>
            <CardHeader
              title="GST Summary Table"
              subtitle={`Tax reconciliation between Sales (Output Tax) and Purchases (Input Tax Credit) for ${dateRange.label}`}
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-4">Transaction Type</th>
                      <th className="py-3 px-4 text-right">Taxable Value</th>
                      <th className="py-3 px-4 text-right">CGST</th>
                      <th className="py-3 px-4 text-right">SGST</th>
                      <th className="py-3 px-4 text-right">IGST</th>
                      <th className="py-3 px-4 text-right">Total GST</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-amber-50/30">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        Sales (Outward Tax Collected)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(summaryData.totalTaxableSales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(summaryData.outwardCgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(summaryData.outwardSgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(summaryData.outwardIgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                        {formatCurrency(summaryData.totalOutputTax)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-950">
                        {formatCurrency(summaryData.totalSalesValue)}
                      </td>
                    </tr>

                    <tr className="hover:bg-amber-50/30">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        Purchases (Input Tax Credit / Paid)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(summaryData.totalTaxablePurchases)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(summaryData.inwardCgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(summaryData.inwardSgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(summaryData.inwardIgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(summaryData.eligibleItc)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-950">
                        {formatCurrency(summaryData.totalPurchasesValue)}
                      </td>
                    </tr>

                    <tr className="bg-amber-100/40 font-bold border-t-2 border-amber-300">
                      <td className="py-3 px-4 text-slate-950">
                        Estimated Net Balance
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-950">
                        {formatCurrency(summaryData.totalTaxableSales - summaryData.totalTaxablePurchases)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-950">
                        {formatCurrency(Math.max(0, summaryData.outwardCgst - summaryData.inwardCgst))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-950">
                        {formatCurrency(Math.max(0, summaryData.outwardSgst - summaryData.inwardSgst))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-950">
                        {formatCurrency(Math.max(0, summaryData.outwardIgst - summaryData.inwardIgst))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-amber-900 text-base">
                        {formatCurrency(summaryData.netTaxPayable)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-950">
                        {formatCurrency(summaryData.totalSalesValue - summaryData.totalPurchasesValue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Rate-Wise Breakdown Table */}
          <Card>
            <CardHeader
              title="GST Rate-wise Breakdown"
              subtitle="Applicable GST rates across sales and purchases"
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Rate</th>
                      <th className="py-2.5 px-4 text-right">Taxable Sales</th>
                      <th className="py-2.5 px-4 text-right">Sales GST</th>
                      <th className="py-2.5 px-4 text-right">Taxable Purchases</th>
                      <th className="py-2.5 px-4 text-right">Purchase GST (ITC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {GST_RATES.map((rate) => {
                      const data = summaryData.rateWiseSummary[rate] || {
                        taxableSales: 0,
                        salesGst: 0,
                        taxablePurchases: 0,
                        purchasesGst: 0,
                      };
                      return (
                        <tr key={rate} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">
                            {rate}% GST
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                            {formatCurrency(data.taxableSales)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-800">
                            {formatCurrency(data.salesGst)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                            {formatCurrency(data.taxablePurchases)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">
                            {formatCurrency(data.purchasesGst)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Disclaimer Note */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>{t('gst.disclaimer')}</p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SALES GST & INVOICES                              */}
      {/* ======================================================== */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Search, Filter & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by customer, invoice no, product..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <input
                type="date"
                value={salesDateFilter}
                onChange={(e) => setSalesDateFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-xl px-3 py-2"
              />
              {salesDateFilter && (
                <button
                  type="button"
                  onClick={() => setSalesDateFilter('')}
                  className="text-xs text-amber-800 font-bold hover:underline"
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
                {t('gst.printReport')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportSalesCsv}
              >
                {t('gst.downloadCsv')}
              </Button>
            </div>
          </div>

          {/* Sales Table */}
          {filteredSales.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="w-8 h-8" />}
              title="No Sales Found"
              description="No sales match the search or filter criteria."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/60 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Taxable</th>
                      <th className="py-3 px-4 text-center">Rate</th>
                      <th className="py-3 px-4 text-right">GST</th>
                      <th className="py-3 px-4 text-right">Total</th>
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
                              <span>{t('gst.printInvoice')}</span>
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
      {/* TAB 3: PURCHASE GST & ITC                                */}
      {/* ======================================================== */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Search, Filter & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by supplier, invoice no, product..."
                  value={purchasesSearch}
                  onChange={(e) => setPurchasesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <input
                type="date"
                value={purchasesDateFilter}
                onChange={(e) => setPurchasesDateFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-xl px-3 py-2"
              />
              <select
                value={itcFilter}
                onChange={(e: any) => setItcFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
              >
                <option value="all">All Purchases</option>
                <option value="eligible">Eligible ITC Only</option>
                <option value="ineligible">Ineligible Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                {t('gst.printReport')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportPurchasesCsv}
              >
                {t('gst.downloadCsv')}
              </Button>
            </div>
          </div>

          {/* Purchases Table */}
          {filteredPurchases.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-8 h-8" />}
              title="No Purchases Found"
              description="No purchases match the search or filter criteria."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/60 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-4">Bill #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Taxable</th>
                      <th className="py-3 px-4 text-center">Rate</th>
                      <th className="py-3 px-4 text-right">Input GST</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">ITC Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases.map((p) => {
                      const norm = normalizePurchaseGst(p, shopStateCode);
                      return (
                        <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {norm.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">
                            {formatDate(p.date)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">
                              {p.supplierName}
                            </span>
                            {p.supplierGstin && (
                              <span className="text-[10px] font-mono text-slate-500 block">
                                GSTIN: {p.supplierGstin}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {p.productName}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                            {p.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            {formatCurrency(norm.taxableAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                              {norm.gstRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                            {formatCurrency(norm.totalGst)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-950">
                            {formatCurrency(p.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {norm.isEligibleITC ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check className="w-3 h-3" />
                                <span>Eligible ITC</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                Ineligible
                              </span>
                            )}
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
      {/* TAB 4: MONTHLY GST REPORT                                */}
      {/* ======================================================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector Bar & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Month:
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                {t('gst.printReport')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportMonthlyCsv}
              >
                {t('gst.downloadCsv')}
              </Button>
            </div>
          </div>

          {/* Monthly KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Month's Taxable Turnover
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {formatCurrency(monthlyData.monthSummary.totalTaxableSales)}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Gross: {formatCurrency(monthlyData.monthSummary.totalSalesValue)}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Output GST Collected
              </span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatCurrency(monthlyData.monthSummary.totalOutputTax)}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {monthlyData.monthSales.length} Invoices Issued
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Eligible Input Credit (ITC)
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatCurrency(monthlyData.monthSummary.eligibleItc)}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {monthlyData.monthPurchases.length} Purchase Bills
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/60 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Net Tax Payable (Est.)
              </span>
              <div
                className={`text-2xl font-black mt-1 ${
                  monthlyData.monthSummary.netTaxPayable > 0 ? 'text-amber-900' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(monthlyData.monthSummary.netTaxPayable)}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                After ITC Credit Offset
              </span>
            </div>
          </div>

          {/* Month Sales & Purchases Quick Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Month Sales */}
            <Card>
              <CardHeader
                title={`Sales in ${selectedMonth}`}
                subtitle={`${monthlyData.monthSales.length} Total Sales Invoices`}
              />
              <CardBody className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Party</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">GST</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyData.monthSales.map((s) => {
                        const norm = normalizeSaleGst(s, shopStateCode);
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono">{s.date}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900 truncate max-w-[130px]">
                              {s.customerName || 'Counter'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(norm.taxableAmount)}</td>
                            <td className="py-2 px-3 text-right font-mono text-amber-800 font-semibold">{formatCurrency(norm.totalGst)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">{formatCurrency(s.totalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            {/* Month Purchases */}
            <Card>
              <CardHeader
                title={`Purchases in ${selectedMonth}`}
                subtitle={`${monthlyData.monthPurchases.length} Total Inward Bills`}
              />
              <CardBody className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Supplier</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">ITC</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyData.monthPurchases.map((p) => {
                        const norm = normalizePurchaseGst(p, shopStateCode);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono">{p.date}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900 truncate max-w-[130px]">
                              {p.supplierName}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(norm.taxableAmount)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">{formatCurrency(norm.totalGst)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">{formatCurrency(p.totalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: GST SETTINGS                                      */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveGstSettings} className="space-y-6">
          <Card>
            <CardHeader
              title="Shop GST & Tax Profile"
              subtitle="Configure your shop's GSTIN, state, trade name, and default tax rate"
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Shop GSTIN (15 characters)"
                    value={gstForm.gstin}
                    onChange={(e) => setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AMWPB3781F1ZR"
                    required
                  />
                  {gstForm.gstin && (
                    <div className="mt-1">
                      {validateGstin(gstForm.gstin).isValid ? (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valid GSTIN (State: {validateGstin(gstForm.gstin).stateName})</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-medium">
                          {validateGstin(gstForm.gstin).error}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Input
                  label="Legal / Trade Name"
                  value={gstForm.tradeName}
                  onChange={(e) => setGstForm({ ...gstForm, tradeName: e.target.value })}
                  placeholder="Malhar Tools Hardware & Spares"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm bg-white"
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
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm bg-white"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}% GST
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Invoice Number Prefix"
                  value={gstForm.invoicePrefix}
                  onChange={(e) => setGstForm({ ...gstForm, invoicePrefix: e.target.value })}
                  placeholder="MT/26-27/"
                  helperText="Prefix used for sales tax invoices"
                />
              </div>
            </CardBody>
          </Card>

          {/* Bank Details for Tax Invoices */}
          <Card>
            <CardHeader
              title="Bank Details (Printed on Invoices)"
              subtitle="Customers can make direct NEFT/RTGS/UPI payments to this account"
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  value={gstForm.bankName}
                  onChange={(e) => setGstForm({ ...gstForm, bankName: e.target.value })}
                  placeholder="State Bank of India"
                />

                <Input
                  label="Bank Account Number"
                  value={gstForm.bankAccountNumber}
                  onChange={(e) => setGstForm({ ...gstForm, bankAccountNumber: e.target.value })}
                  placeholder="389012345678"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="IFSC Code"
                  value={gstForm.bankIfsc}
                  onChange={(e) => setGstForm({ ...gstForm, bankIfsc: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                />

                <Input
                  label="Branch Name / Location"
                  value={gstForm.bankBranch}
                  onChange={(e) => setGstForm({ ...gstForm, bankBranch: e.target.value })}
                  placeholder="Main Market Branch, Sangli"
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

      {/* ======================================================== */}
      {/* GST TAX INVOICE MODAL (1-Click Print & View)             */}
      {/* ======================================================== */}
      {viewInvoiceSale && (
        <Modal
          isOpen={Boolean(viewInvoiceSale)}
          onClose={() => setViewInvoiceSale(null)}
          title="GST Tax Invoice Preview"
          maxWidth="xl"
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
