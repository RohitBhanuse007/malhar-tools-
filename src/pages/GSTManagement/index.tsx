import React, { useState, useMemo } from 'react';
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
  Building,
  CreditCard,
  DollarSign,
  TrendingUp,
  Truck,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Eye,
  FileCheck,
  HelpCircle,
  Save,
  ChevronDown
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
  prepareGstr1Data,
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

type GstSection =
  | 'dashboard'
  | 'sales_report'
  | 'purchase_report'
  | 'summary'
  | 'monthly'
  | 'quarterly'
  | 'return_prep'
  | 'print_download'
  | 'settings';

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

  const [activeSection, setActiveSection] = useState<GstSection>('dashboard');
  const [filterPeriod, setFilterPeriod] = useState<GstFilterPeriod>('this_month');
  const [customFrom, setCustomFrom] = useState(getTodayDateString());
  const [customTo, setCustomTo] = useState(getTodayDateString());

  // Search & filter states within tables
  const [salesSearch, setSalesSearch] = useState('');
  const [salesTypeFilter, setSalesTypeFilter] = useState<'all' | 'b2b' | 'b2c'>('all');
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesItcFilter, setPurchasesItcFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');

  // Selected Sale for viewing GST Tax Invoice modal
  const [viewInvoiceSale, setViewInvoiceSale] = useState<Sale | null>(null);

  // Return prep active tab
  const [returnTab, setReturnTab] = useState<'gstr1' | 'gstr3b'>('gstr1');

  // Month selector for monthly report (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Quarter selector for quarterly report
  const [selectedQuarter, setSelectedQuarter] = useState<'q1' | 'q2' | 'q3' | 'q4'>('q2');

  // GST Settings form state
  const [gstForm, setGstForm] = useState({
    gstin: shopSettings?.gstin || '27AABCM1234F1Z5',
    tradeName: shopSettings?.tradeName || 'Malhar Tools Hardware & Spares',
    state: shopSettings?.state || 'Maharashtra',
    stateCode: shopSettings?.stateCode || '27',
    gstScheme: shopSettings?.gstScheme || 'regular',
    defaultGstRate: shopSettings?.defaultGstRate || 18,
    bankName: shopSettings?.bankName || 'State Bank of India',
    bankAccountNumber: shopSettings?.bankAccountNumber || '389012345678',
    bankIfsc: shopSettings?.bankIfsc || 'SBIN0001234',
    bankBranch: shopSettings?.bankBranch || 'Main Market Branch, Sangli',
    invoicePrefix: shopSettings?.invoicePrefix || 'MT/26-27/',
    invoiceTerms: shopSettings?.invoiceTerms || '1. Goods once sold will not be taken back without original invoice.\n2. Warranty as per manufacturer terms.\n3. Subject to Sangli jurisdiction.',
  });
  const [isSavingGst, setIsSavingGst] = useState(false);

  // Sync shopSettings when updated externally
  React.useEffect(() => {
    if (shopSettings) {
      setGstForm((prev) => ({
        ...prev,
        gstin: shopSettings.gstin || prev.gstin,
        tradeName: shopSettings.tradeName || prev.tradeName,
        state: shopSettings.state || prev.state,
        stateCode: shopSettings.stateCode || prev.stateCode,
        gstScheme: shopSettings.gstScheme || prev.gstScheme,
        defaultGstRate: shopSettings.defaultGstRate ?? prev.defaultGstRate,
        bankName: shopSettings.bankName || prev.bankName,
        bankAccountNumber: shopSettings.bankAccountNumber || prev.bankAccountNumber,
        bankIfsc: shopSettings.bankIfsc || prev.bankIfsc,
        bankBranch: shopSettings.bankBranch || prev.bankBranch,
        invoicePrefix: shopSettings.invoicePrefix || prev.invoicePrefix,
        invoiceTerms: shopSettings.invoiceTerms || prev.invoiceTerms,
      }));
    }
  }, [shopSettings]);

  // Current Date Range calculated from filterPeriod
  const { fromDate, toDate, label: periodLabel } = useMemo(() => {
    return getDateRangeForPeriod(filterPeriod, customFrom, customTo);
  }, [filterPeriod, customFrom, customTo]);

  const shopStateCode = gstForm.stateCode || '27';

  // Overall GST Summary computed for the chosen period
  const gstSummary = useMemo(() => {
    return computeGstSummary(sales, purchases, fromDate, toDate, shopStateCode);
  }, [sales, purchases, fromDate, toDate, shopStateCode]);

  // Normalized Sales for chosen period
  const periodSales = useMemo(() => {
    return sales
      .filter((s) => s.date >= fromDate && s.date <= toDate)
      .map((s) => ({
        original: s,
        norm: normalizeSaleGst(s, shopStateCode),
        isB2B: Boolean(s.customerGstin && s.customerGstin.trim()),
      }));
  }, [sales, fromDate, toDate, shopStateCode]);

  // Filtered Sales Table
  const filteredSalesTable = useMemo(() => {
    return periodSales.filter(({ original, norm, isB2B }) => {
      const q = salesSearch.toLowerCase();
      const matchSearch =
        original.productName.toLowerCase().includes(q) ||
        norm.invoiceNumber.toLowerCase().includes(q) ||
        (original.customerName && original.customerName.toLowerCase().includes(q)) ||
        (original.customerGstin && original.customerGstin.toLowerCase().includes(q));

      const matchType =
        salesTypeFilter === 'all'
          ? true
          : salesTypeFilter === 'b2b'
          ? isB2B
          : !isB2B;

      return matchSearch && matchType;
    });
  }, [periodSales, salesSearch, salesTypeFilter]);

  // Normalized Purchases for chosen period
  const periodPurchases = useMemo(() => {
    return purchases
      .filter((p) => p.date >= fromDate && p.date <= toDate)
      .map((p) => ({
        original: p,
        norm: normalizePurchaseGst(p, shopStateCode),
      }));
  }, [purchases, fromDate, toDate, shopStateCode]);

  // Filtered Purchases Table
  const filteredPurchasesTable = useMemo(() => {
    return periodPurchases.filter(({ original, norm }) => {
      const q = purchasesSearch.toLowerCase();
      const matchSearch =
        original.productName.toLowerCase().includes(q) ||
        norm.invoiceNumber.toLowerCase().includes(q) ||
        original.supplierName.toLowerCase().includes(q) ||
        (original.supplierGstin && original.supplierGstin.toLowerCase().includes(q));

      const matchItc =
        purchasesItcFilter === 'all'
          ? true
          : purchasesItcFilter === 'eligible'
          ? norm.isEligibleITC
          : !norm.isEligibleITC;

      return matchSearch && matchItc;
    });
  }, [periodPurchases, purchasesSearch, purchasesItcFilter]);

  // GSTR-1 Data Preparation
  const gstr1Data = useMemo(() => {
    return prepareGstr1Data(sales, fromDate, toDate, shopStateCode);
  }, [sales, fromDate, toDate, shopStateCode]);

  // Monthly breakdown
  const monthlySummary = useMemo(() => {
    if (!selectedMonth) return null;
    const [y, m] = selectedMonth.split('-');
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const mFrom = `${selectedMonth}-01`;
    const mTo = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    return {
      range: `${mFrom} to ${mTo}`,
      summary: computeGstSummary(sales, purchases, mFrom, mTo, shopStateCode),
    };
  }, [selectedMonth, sales, purchases, shopStateCode]);

  // Quarterly breakdown
  const quarterlySummary = useMemo(() => {
    const qRange = getDateRangeForPeriod(selectedQuarter);
    return {
      range: `${qRange.fromDate} to ${qRange.toDate}`,
      label: qRange.label,
      summary: computeGstSummary(sales, purchases, qRange.fromDate, qRange.toDate, shopStateCode),
    };
  }, [selectedQuarter, sales, purchases, shopStateCode]);

  // Handle Save GST Settings
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
      success('GST and Invoicing settings saved successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to save GST settings.');
    } finally {
      setIsSavingGst(false);
    }
  };

  // CSV Export Handlers
  const handleExportSalesCsv = () => {
    const rows: (string | number)[][] = [
      ['MALHAR TOOLS - GST SALES REPORT (OUTWARD SUPPLIES)'],
      [`Period: ${fromDate} to ${toDate}`, `Generated: ${new Date().toLocaleString()}`],
      ['Shop GSTIN:', shopSettings?.gstin || gstForm.gstin],
      [],
      [
        'Invoice No',
        'Date',
        'Customer Name',
        'Customer GSTIN',
        'Place of Supply',
        'Supply Type',
        'HSN Code',
        'Product',
        'Quantity',
        'Rate',
        'Taxable Value',
        'GST Rate %',
        'CGST (₹)',
        'SGST (₹)',
        'IGST (₹)',
        'Total GST (₹)',
        'Invoice Total (₹)',
        'Payment Mode',
      ],
    ];

    periodSales.forEach(({ original, norm, isB2B }) => {
      rows.push([
        norm.invoiceNumber,
        original.date,
        original.customerName || 'Walk-in Retail',
        original.customerGstin || 'Unregistered',
        norm.isInterState ? 'Inter-State' : 'Intra-State (Maharashtra)',
        isB2B ? 'B2B (Registered)' : 'B2C (Consumer)',
        original.hsnCode || '8204',
        original.productName,
        original.quantity,
        original.sellingPrice,
        norm.taxableAmount,
        norm.gstRate,
        norm.cgst,
        norm.sgst,
        norm.igst,
        norm.totalGst,
        original.totalAmount,
        original.paymentMode,
      ]);
    });

    // Totals row
    rows.push([]);
    rows.push([
      'TOTALS',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      gstSummary.totalTaxableSales,
      '',
      gstSummary.outwardCgst,
      gstSummary.outwardSgst,
      gstSummary.outwardIgst,
      gstSummary.totalOutputTax,
      gstSummary.totalSalesValue,
      '',
    ]);

    exportToCsv(`MalharTools_GST_Sales_${fromDate}_to_${toDate}.csv`, rows);
    success('GST Sales report exported to CSV!');
  };

  const handleExportPurchasesCsv = () => {
    const rows: (string | number)[][] = [
      ['MALHAR TOOLS - GST PURCHASE REPORT (INWARD SUPPLIES)'],
      [`Period: ${fromDate} to ${toDate}`, `Generated: ${new Date().toLocaleString()}`],
      ['Shop GSTIN:', shopSettings?.gstin || gstForm.gstin],
      [],
      [
        'Supplier Invoice No',
        'Date',
        'Supplier Name',
        'Supplier GSTIN',
        'Product Name',
        'Quantity',
        'Purchase Price',
        'Taxable Value',
        'GST Rate %',
        'CGST (₹)',
        'SGST (₹)',
        'IGST (₹)',
        'Total GST (₹)',
        'Total Amount (₹)',
        'ITC Status',
      ],
    ];

    periodPurchases.forEach(({ original, norm }) => {
      rows.push([
        norm.invoiceNumber,
        original.date,
        original.supplierName,
        original.supplierGstin || 'Unregistered',
        original.productName,
        original.quantity,
        original.purchasePrice,
        norm.taxableAmount,
        norm.gstRate,
        norm.cgst,
        norm.sgst,
        norm.igst,
        norm.totalGst,
        original.totalAmount,
        norm.isEligibleITC ? 'Eligible ITC' : 'Ineligible',
      ]);
    });

    // Totals
    rows.push([]);
    rows.push([
      'TOTALS',
      '',
      '',
      '',
      '',
      '',
      '',
      gstSummary.totalTaxablePurchases,
      '',
      gstSummary.inwardCgst,
      gstSummary.inwardSgst,
      gstSummary.inwardIgst,
      gstSummary.totalInputTax,
      gstSummary.totalPurchasesValue,
      `Eligible ITC: ₹${gstSummary.eligibleItc}`,
    ]);

    exportToCsv(`MalharTools_GST_Purchases_${fromDate}_to_${toDate}.csv`, rows);
    success('GST Purchases report exported to CSV!');
  };

  const handleExportGstr1Csv = () => {
    const rows: (string | number)[][] = [
      ['GSTR-1 RETURN SUMMARY (OUTWARD SUPPLIES) - MALHAR TOOLS'],
      [`Period: ${fromDate} to ${toDate}`, `GSTIN: ${shopSettings?.gstin || gstForm.gstin}`],
      [],
      ['TABLE 4: B2B INVOICES (REGISTERED DEALERS)'],
      [
        'Invoice Number',
        'Invoice Date',
        'Customer Name',
        'Customer GSTIN',
        'Place of Supply',
        'Taxable Value',
        'Rate %',
        'CGST',
        'SGST',
        'IGST',
        'Total',
      ],
    ];

    gstr1Data.b2bInvoices.forEach((inv) => {
      rows.push([
        inv.invoiceNumber,
        inv.invoiceDate,
        inv.customerName,
        inv.customerGstin,
        inv.placeOfSupply,
        inv.taxableValue,
        inv.gstRate,
        inv.cgst,
        inv.sgst,
        inv.igst,
        inv.totalAmount,
      ]);
    });

    rows.push([]);
    rows.push(['TABLE 7: B2C SMALL SUMMARY (UNREGISTERED CONSUMERS)']);
    rows.push(['Place of Supply', 'Rate %', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total']);
    gstr1Data.b2cSummaries.forEach((sum) => {
      rows.push([
        sum.placeOfSupply,
        sum.gstRate,
        sum.taxableValue,
        sum.cgst,
        sum.sgst,
        sum.igst,
        sum.totalAmount,
      ]);
    });

    rows.push([]);
    rows.push(['TABLE 12: HSN-WISE SUMMARY OF OUTWARD SUPPLIES']);
    rows.push(['HSN/SAC Code', 'Description', 'UQC', 'Total Qty', 'Total Value', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State Tax', 'Total Tax']);
    gstr1Data.hsnSummary.forEach((h) => {
      rows.push([
        h.hsnCode,
        h.description,
        h.uqc,
        h.totalQuantity,
        h.totalValue,
        h.taxableValue,
        h.igst,
        h.cgst,
        h.sgst,
        h.totalGst,
      ]);
    });

    exportToCsv(`MalharTools_GSTR1_${fromDate}_to_${toDate}.csv`, rows);
    success('GSTR-1 review data exported to CSV!');
  };

  const handleExportGstr3bCsv = () => {
    const rows: (string | number)[][] = [
      ['GSTR-3B RETURN SUMMARY - MALHAR TOOLS'],
      [`Period: ${fromDate} to ${toDate}`, `GSTIN: ${shopSettings?.gstin || gstForm.gstin}`],
      [],
      ['TABLE 3.1: OUTWARD TAXABLE SUPPLIES (OTHER THAN ZERO RATED & EXEMPTED)'],
      ['Nature of Supplies', 'Total Taxable Value', 'Integrated Tax (IGST)', 'Central Tax (CGST)', 'State Tax (SGST)'],
      [
        'Outward Taxable Supplies (Sales)',
        gstSummary.totalTaxableSales,
        gstSummary.outwardIgst,
        gstSummary.outwardCgst,
        gstSummary.outwardSgst,
      ],
      [],
      ['TABLE 4: ELIGIBLE INPUT TAX CREDIT (ITC)'],
      ['Details', 'Integrated Tax (IGST)', 'Central Tax (CGST)', 'State Tax (SGST)', 'Total ITC'],
      [
        '(A) All Other ITC (Purchases of Spares/Tools)',
        gstSummary.inwardIgst,
        gstSummary.inwardCgst,
        gstSummary.inwardSgst,
        gstSummary.eligibleItc,
      ],
      [
        '(B) Ineligible ITC under Sec 17(5)',
        0,
        0,
        0,
        gstSummary.ineligibleItc,
      ],
      [],
      ['TABLE 5.1 & 6: ESTIMATED NET TAX LIABILITY'],
      ['Description', 'Output Tax Liability', 'Eligible ITC Offset', 'Net Cash Tax Payable'],
      [
        'Net GST Payable to Government',
        gstSummary.totalOutputTax,
        gstSummary.eligibleItc,
        gstSummary.netTaxPayable,
      ],
    ];

    exportToCsv(`MalharTools_GSTR3B_${fromDate}_to_${toDate}.csv`, rows);
    success('GSTR-3B summary exported to CSV!');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {language === 'mr' ? 'जीएसटी व्यवस्थापन व परतावा' : 'GST Management & Returns'}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                {language === 'mr'
                  ? 'स्वयंचलित कर गणना, GSTR-1, GSTR-3B अहवाल आणि बिल प्रिंटिंग'
                  : 'Automatic GST calculations, GSTR-1/3B return preparation, and invoice printing'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Print & Quick Export */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrintReport}
            className="shadow-2xs font-bold"
          >
            {t('common.print')}
          </Button>
          <Button
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportSalesCsv}
            className="shadow-xs font-bold"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Global Date / Period Filter Strip (Hidden on settings tab) */}
      {activeSection !== 'settings' && (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'mr' ? 'कालावधी:' : 'Period:'}</span>
            </span>

            {[
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: 'This Month' },
              { id: 'prev_month', label: 'Prev Month' },
              { id: 'q1', label: 'Q1 (Apr-Jun)' },
              { id: 'q2', label: 'Q2 (Jul-Sep)' },
              { id: 'q3', label: 'Q3 (Oct-Dec)' },
              { id: 'q4', label: 'Q4 (Jan-Mar)' },
              { id: 'fy', label: 'FY 26-27' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterPeriod(p.id as GstFilterPeriod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterPeriod === p.id
                    ? 'bg-amber-400 text-slate-950 shadow-2xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-slate-950'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {filterPeriod === 'custom' && (
            <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-100 w-full sm:w-auto">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs font-semibold p-1.5 border border-amber-200 rounded-lg bg-amber-50/50"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs font-semibold p-1.5 border border-amber-200 rounded-lg bg-amber-50/50"
              />
            </div>
          )}

          <div className="text-xs font-bold text-amber-900 bg-amber-100/80 px-3 py-1 rounded-lg">
            {periodLabel}: <span className="font-mono text-slate-900">{fromDate}</span> to{' '}
            <span className="font-mono text-slate-900">{toDate}</span>
          </div>
        </div>
      )}

      {/* Printable Sheet Watermark/Header (Visible Only in Print Mode) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-950 uppercase">{shopSettings?.shopName || 'MALHAR TOOLS'}</h1>
            <p className="text-xs font-bold text-amber-700 uppercase">HARDWARE • TOOLS • SPARES • GST COMPLIANT</p>
            <p className="text-xs text-slate-600">{shopSettings?.address}</p>
            <p className="text-xs font-bold text-slate-900 mt-1">
              GSTIN: {shopSettings?.gstin || gstForm.gstin} | State: {shopSettings?.state || 'Maharashtra'} (Code: {shopStateCode})
            </p>
          </div>
          <div className="text-right">
            <span className="px-2.5 py-1 bg-slate-900 text-amber-300 text-xs font-black rounded uppercase">
              {activeSection.replace(/_/g, ' ').toUpperCase()} REPORT
            </span>
            <p className="text-xs font-bold text-slate-700 mt-2">
              PERIOD: {fromDate} to {toDate}
            </p>
            <p className="text-[10px] text-slate-500">Printed on: {formatDate(new Date())}</p>
          </div>
        </div>
      </div>

      {/* Main Module Navigation Bar (Tabs for 9 sections) */}
      <div className="bg-white p-2 rounded-2xl border border-amber-200/80 shadow-xs flex flex-wrap gap-1.5 print:hidden">
        {[
          { id: 'dashboard', label: 'GST Dashboard', icon: TrendingUp },
          { id: 'sales_report', label: 'GST Sales Report', icon: Receipt },
          { id: 'purchase_report', label: 'GST Purchase Report', icon: Truck },
          { id: 'summary', label: 'GST Summary', icon: DollarSign },
          { id: 'monthly', label: 'Monthly Report', icon: Calendar },
          { id: 'quarterly', label: 'Quarterly Report', icon: Calendar },
          { id: 'return_prep', label: 'GST Return Preparation', icon: FileCheck },
          { id: 'print_download', label: 'Print & Download', icon: Printer },
          { id: 'settings', label: 'GST Settings', icon: Building },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as GstSection)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-slate-950 font-bold'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. GST DASHBOARD */}
      {/* ========================================================================= */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Outward Tax */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Outward Tax (Liability)
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs">
                  Sales GST
                </span>
              </div>
              <p className="text-2xl font-black text-slate-950 font-mono mt-2">
                {formatCurrency(gstSummary.totalOutputTax)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Taxable: {formatCurrency(gstSummary.totalTaxableSales)}
              </p>
            </div>

            {/* Inward Tax / Eligible ITC */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Eligible ITC (Input Credit)
                </span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs">
                  Purchase ITC
                </span>
              </div>
              <p className="text-2xl font-black text-blue-600 font-mono mt-2">
                {formatCurrency(gstSummary.eligibleItc)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Ineligible ITC: {formatCurrency(gstSummary.ineligibleItc)}
              </p>
            </div>

            {/* Net Tax Liability */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Net Tax Payable (Cash)
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs">
                  Estimated
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-600 font-mono mt-2">
                {formatCurrency(gstSummary.netTaxPayable)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                After offsetting eligible ITC
              </p>
            </div>

            {/* Total Turnover */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Gross Turnover
                </span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                  {periodSales.length} Invoices
                </span>
              </div>
              <p className="text-2xl font-black text-slate-950 font-mono mt-2">
                {formatCurrency(gstSummary.totalSalesValue)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Gross sales for selected period
              </p>
            </div>
          </div>

          {/* Tax Slabs Distribution & Alerts Box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Slabs breakdown */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5">
              <h3 className="text-base font-extrabold text-slate-950 mb-3 flex items-center justify-between">
                <span>Tax Breakdown by GST Slab (दरानुसार वर्गीकरण)</span>
                <span className="text-xs font-bold text-slate-500 font-normal">Common Rates: 0%, 5%, 12%, 18%, 28%</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/80 text-[11px] font-bold text-slate-700 uppercase">
                      <th className="p-3">GST Slab</th>
                      <th className="p-3 text-right">Taxable Sales (₹)</th>
                      <th className="p-3 text-right">Output GST (₹)</th>
                      <th className="p-3 text-right">Taxable Purchases (₹)</th>
                      <th className="p-3 text-right">Input GST (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 font-semibold">
                    {GST_RATES.map((rate) => {
                      const data = gstSummary.rateWiseSummary[rate] || {
                        taxableSales: 0,
                        salesGst: 0,
                        taxablePurchases: 0,
                        purchasesGst: 0,
                      };
                      return (
                        <tr key={rate} className="hover:bg-amber-50/40">
                          <td className="p-3 font-mono font-bold text-slate-950">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                              {rate}% GST
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-900">
                            {formatCurrency(data.taxableSales)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-800">
                            {formatCurrency(data.salesGst)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            {formatCurrency(data.taxablePurchases)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-blue-700">
                            {formatCurrency(data.purchasesGst)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance & Validation Alerts Widget */}
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-950 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>GST Compliance & Validation</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-950">Shop GSTIN Configured</p>
                      <p className="text-emerald-800 font-mono font-semibold text-[11px] mt-0.5">
                        {shopSettings?.gstin || gstForm.gstin} ({gstForm.stateCode} - {gstForm.state})
                      </p>
                    </div>
                  </div>

                  {gstr1Data.validationWarnings.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">Zero Validation Warnings</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          All recorded invoices have valid GST formats and HSN assignments.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 space-y-1.5 max-h-48 overflow-y-auto">
                      <p className="font-bold text-amber-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{gstr1Data.validationWarnings.length} Warnings to Review:</span>
                      </p>
                      {gstr1Data.validationWarnings.slice(0, 4).map((w, i) => (
                        <p key={i} className="text-[11px] text-amber-900 leading-tight">
                          • <b className="font-mono">{w.invoiceNumber}</b>: {w.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-amber-100 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-bold justify-center"
                  onClick={() => setActiveSection('return_prep')}
                >
                  Go to Return Preparation <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GST SALES REPORT */}
      {/* ========================================================================= */}
      {activeSection === 'sales_report' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3 print:hidden">
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Search invoice number, customer name, GSTIN, or product..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                leftAddon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={salesTypeFilter}
                onChange={(e) => setSalesTypeFilter(e.target.value as any)}
                className="w-full text-xs font-bold py-2.5 px-3 rounded-xl border border-amber-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="all">All Sales (B2B + B2C)</option>
                <option value="b2b">B2B Registered (With GSTIN)</option>
                <option value="b2c">B2C Retail (Walk-in / No GSTIN)</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportSalesCsv}
            >
              Export CSV
            </Button>
          </div>

          {/* Table */}
          {filteredSalesTable.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="No Sales Invoices Found"
              description="No sales recorded in the selected period match your search filter."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="p-3">Invoice No.</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer / GSTIN</th>
                      <th className="p-3">Product (HSN)</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Taxable (₹)</th>
                      <th className="p-3 text-center">Rate</th>
                      <th className="p-3 text-right">CGST (₹)</th>
                      <th className="p-3 text-right">SGST (₹)</th>
                      <th className="p-3 text-right">IGST (₹)</th>
                      <th className="p-3 text-right">Total (₹)</th>
                      <th className="p-3 text-center print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 font-semibold">
                    {filteredSalesTable.map(({ original, norm, isB2B }) => (
                      <tr key={original.id} className="hover:bg-amber-50/40">
                        <td className="p-3 font-mono font-bold text-slate-950">
                          {norm.invoiceNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {formatDate(original.date)}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">
                            {original.customerName || 'Walk-in Retail'}
                          </span>
                          {isB2B ? (
                            <span className="font-mono text-[10px] text-amber-800 font-bold">
                              GSTIN: {original.customerGstin}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Unregistered</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-800">
                          <span className="font-bold block">{original.productName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            HSN: {original.hsnCode || '8204'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {original.quantity}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(norm.taxableAmount)}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                            {norm.gstRate}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {formatCurrency(norm.cgst)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {formatCurrency(norm.sgst)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-700">
                          {formatCurrency(norm.igst)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-950">
                          {formatCurrency(original.totalAmount)}
                        </td>
                        <td className="p-3 text-center print:hidden">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setViewInvoiceSale(original)}
                            className="font-bold text-[11px] py-1 px-2"
                          >
                            Invoice
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Footer */}
                  <tfoot>
                    <tr className="bg-amber-100/70 border-t-2 border-amber-300 font-black text-xs text-slate-950">
                      <td colSpan={5} className="p-3 text-right uppercase tracking-wider">
                        Total GST Sales ({filteredSalesTable.length} Invoices):
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(
                          filteredSalesTable.reduce((acc, { norm }) => acc + norm.taxableAmount, 0)
                        )}
                      </td>
                      <td></td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(
                          filteredSalesTable.reduce((acc, { norm }) => acc + norm.cgst, 0)
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(
                          filteredSalesTable.reduce((acc, { norm }) => acc + norm.sgst, 0)
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-blue-800">
                        {formatCurrency(
                          filteredSalesTable.reduce((acc, { norm }) => acc + norm.igst, 0)
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-base text-slate-950">
                        {formatCurrency(
                          filteredSalesTable.reduce((acc, { original }) => acc + Number(original.totalAmount || 0), 0)
                        )}
                      </td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GST PURCHASE REPORT */}
      {/* ========================================================================= */}
      {activeSection === 'purchase_report' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3 print:hidden">
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Search supplier name, invoice, GSTIN, or product..."
                value={purchasesSearch}
                onChange={(e) => setPurchasesSearch(e.target.value)}
                leftAddon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={purchasesItcFilter}
                onChange={(e) => setPurchasesItcFilter(e.target.value as any)}
                className="w-full text-xs font-bold py-2.5 px-3 rounded-xl border border-amber-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="all">All Inward Purchases</option>
                <option value="eligible">Eligible ITC Only</option>
                <option value="ineligible">Ineligible ITC Only</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportPurchasesCsv}
            >
              Export CSV
            </Button>
          </div>

          {filteredPurchasesTable.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-8 h-8" />}
              title="No Purchase Invoices Found"
              description="No purchases recorded in the selected period match your filter."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="p-3">Supplier Inv No.</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Supplier / GSTIN</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Taxable (₹)</th>
                      <th className="p-3 text-center">Rate</th>
                      <th className="p-3 text-right">CGST (₹)</th>
                      <th className="p-3 text-right">SGST (₹)</th>
                      <th className="p-3 text-right">IGST (₹)</th>
                      <th className="p-3 text-right">Total (₹)</th>
                      <th className="p-3 text-center">ITC Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 font-semibold">
                    {filteredPurchasesTable.map(({ original, norm }) => (
                      <tr key={original.id} className="hover:bg-amber-50/40">
                        <td className="p-3 font-mono font-bold text-slate-950">
                          {norm.invoiceNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {formatDate(original.date)}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">
                            {original.supplierName}
                          </span>
                          {original.supplierGstin && (
                            <span className="font-mono text-[10px] text-slate-600 font-bold">
                              GSTIN: {original.supplierGstin}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-800 font-bold">
                          {original.productName}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-800">
                          +{original.quantity}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(norm.taxableAmount)}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                            {norm.gstRate}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {formatCurrency(norm.cgst)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {formatCurrency(norm.sgst)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-700">
                          {formatCurrency(norm.igst)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-950">
                          {formatCurrency(original.totalAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              norm.isEligibleITC
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {norm.isEligibleITC ? 'Eligible' : 'Blocked'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Footer */}
                  <tfoot>
                    <tr className="bg-amber-100/70 border-t-2 border-amber-300 font-black text-xs text-slate-950">
                      <td colSpan={5} className="p-3 text-right uppercase tracking-wider">
                        Total Inward Purchases:
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(
                          filteredPurchasesTable.reduce((acc, { norm }) => acc + norm.taxableAmount, 0)
                        )}
                      </td>
                      <td></td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(
                          filteredPurchasesTable.reduce((acc, { norm }) => acc + norm.cgst, 0)
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(
                          filteredPurchasesTable.reduce((acc, { norm }) => acc + norm.sgst, 0)
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-blue-800">
                        {formatCurrency(
                          filteredPurchasesTable.reduce((acc, { norm }) => acc + norm.igst, 0)
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-base text-slate-950">
                        {formatCurrency(
                          filteredPurchasesTable.reduce((acc, { original }) => acc + Number(original.totalAmount || 0), 0)
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GST SUMMARY */}
      {/* ========================================================================= */}
      {activeSection === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Outward Tax Details */}
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  <span>Outward Supplies (Sales)</span>
                </h3>
                <span className="text-xs font-bold font-mono text-slate-500">
                  {periodSales.length} Invoices
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Gross Sales Revenue:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.totalSalesValue)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Taxable Value (Before Tax):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.totalTaxableSales)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Central GST (CGST Output):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.outwardCgst)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>State GST (SGST Output):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.outwardSgst)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Integrated GST (IGST Output):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.outwardIgst)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-amber-200 text-sm font-black text-amber-900 bg-amber-50 p-2 rounded-lg">
                  <span>Total Output Tax Liability:</span>
                  <span className="font-mono">{formatCurrency(gstSummary.totalOutputTax)}</span>
                </div>
              </div>
            </div>

            {/* Inward Tax & ITC Details */}
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span>Inward Supplies & ITC (Purchases)</span>
                </h3>
                <span className="text-xs font-bold font-mono text-slate-500">
                  {periodPurchases.length} Invoices
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Gross Purchase Inward:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.totalPurchasesValue)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Taxable Value (Before Tax):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.totalTaxablePurchases)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Input CGST:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.inwardCgst)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Input SGST:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.inwardSgst)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 font-semibold">
                  <span>Input IGST:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstSummary.inwardIgst)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200 text-sm font-black text-blue-900 bg-blue-50 p-2 rounded-lg">
                  <span>Total Eligible ITC:</span>
                  <span className="font-mono">{formatCurrency(gstSummary.eligibleItc)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Computation Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-amber-400 font-bold uppercase text-xs tracking-wider">
                  Net Tax Liability Calculation
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-1">
                  Estimated Net Cash Payable: {formatCurrency(gstSummary.netTaxPayable)}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Formula: Output Tax ({formatCurrency(gstSummary.totalOutputTax)}) − Eligible ITC ({formatCurrency(gstSummary.eligibleItc)}) = {formatCurrency(gstSummary.netTaxPayable)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrintReport}
                  className="bg-slate-800 text-white hover:bg-slate-700 border-slate-600 font-bold"
                >
                  Print Summary
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExportGstr3bCsv}
                  className="font-bold"
                >
                  Export GSTR-3B CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MONTHLY GST REPORT */}
      {/* ========================================================================= */}
      {activeSection === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Select Month for GST Filing:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold p-2 border border-amber-300 rounded-xl bg-amber-50/50"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrintReport}
            >
              Print Monthly Report
            </Button>
          </div>

          {monthlySummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-amber-200/80">
                  <span className="text-xs font-bold text-slate-500 uppercase">Monthly Output GST</span>
                  <p className="text-xl font-black text-amber-900 font-mono mt-1">
                    {formatCurrency(monthlySummary.summary.totalOutputTax)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sales Taxable: {formatCurrency(monthlySummary.summary.totalTaxableSales)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200/80">
                  <span className="text-xs font-bold text-slate-500 uppercase">Monthly Input ITC</span>
                  <p className="text-xl font-black text-blue-700 font-mono mt-1">
                    {formatCurrency(monthlySummary.summary.eligibleItc)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Purchases Taxable: {formatCurrency(monthlySummary.summary.totalTaxablePurchases)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200/80">
                  <span className="text-xs font-bold text-slate-500 uppercase">Net Monthly Tax</span>
                  <p className="text-xl font-black text-emerald-600 font-mono mt-1">
                    {formatCurrency(monthlySummary.summary.netTaxPayable)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cash liability to deposit
                  </p>
                </div>
              </div>

              {/* Month Slabs Table */}
              <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs">
                <h4 className="font-extrabold text-sm text-slate-900 mb-3">
                  Monthly Rate-wise Supply Distribution ({selectedMonth})
                </h4>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/80 font-bold text-slate-700 uppercase">
                      <th className="p-2.5">Rate Slab</th>
                      <th className="p-2.5 text-right">Taxable Outward (Sales)</th>
                      <th className="p-2.5 text-right">Output Tax</th>
                      <th className="p-2.5 text-right">Taxable Inward (Purchases)</th>
                      <th className="p-2.5 text-right">Eligible ITC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 font-semibold">
                    {GST_RATES.map((rate) => {
                      const d = monthlySummary.summary.rateWiseSummary[rate];
                      return (
                        <tr key={rate}>
                          <td className="p-2.5 font-bold font-mono">{rate}% GST</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(d?.taxableSales)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-800">
                            {formatCurrency(d?.salesGst)}
                          </td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(d?.taxablePurchases)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                            {formatCurrency(d?.purchasesGst)}
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

      {/* ========================================================================= */}
      {/* 6. QUARTERLY GST REPORT */}
      {/* ========================================================================= */}
      {activeSection === 'quarterly' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Select Quarter (QRMP Scheme):
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'q1', label: 'Q1 (Apr - Jun)' },
                  { id: 'q2', label: 'Q2 (Jul - Sep)' },
                  { id: 'q3', label: 'Q3 (Oct - Dec)' },
                  { id: 'q4', label: 'Q4 (Jan - Mar)' },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuarter(q.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedQuarter === q.id
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-100 text-slate-700 hover:bg-amber-100'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrintReport}
            >
              Print Quarter Report
            </Button>
          </div>

          {quarterlySummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-amber-200/80">
                  <span className="text-xs font-bold text-slate-500 uppercase">Quarterly Output Tax</span>
                  <p className="text-xl font-black text-amber-900 font-mono mt-1">
                    {formatCurrency(quarterlySummary.summary.totalOutputTax)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gross Turnover: {formatCurrency(quarterlySummary.summary.totalSalesValue)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200/80">
                  <span className="text-xs font-bold text-slate-500 uppercase">Quarterly Eligible ITC</span>
                  <p className="text-xl font-black text-blue-700 font-mono mt-1">
                    {formatCurrency(quarterlySummary.summary.eligibleItc)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Purchases Value: {formatCurrency(quarterlySummary.summary.totalPurchasesValue)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200/80">
                  <span className="text-xs font-bold text-slate-500 uppercase">Net Quarterly Payable</span>
                  <p className="text-xl font-black text-emerald-600 font-mono mt-1">
                    {formatCurrency(quarterlySummary.summary.netTaxPayable)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cash liability to deposit
                  </p>
                </div>
              </div>

              {/* Quarter Slabs Table */}
              <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs">
                <h4 className="font-extrabold text-sm text-slate-900 mb-3">
                  Quarterly Tax Slab Details ({quarterlySummary.label})
                </h4>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/80 font-bold text-slate-700 uppercase">
                      <th className="p-2.5">Rate Slab</th>
                      <th className="p-2.5 text-right">Taxable Outward (Sales)</th>
                      <th className="p-2.5 text-right">Output Tax</th>
                      <th className="p-2.5 text-right">Taxable Inward (Purchases)</th>
                      <th className="p-2.5 text-right">Eligible ITC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 font-semibold">
                    {GST_RATES.map((rate) => {
                      const d = quarterlySummary.summary.rateWiseSummary[rate];
                      return (
                        <tr key={rate}>
                          <td className="p-2.5 font-bold font-mono">{rate}% GST</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(d?.taxableSales)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-800">
                            {formatCurrency(d?.salesGst)}
                          </td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(d?.taxablePurchases)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                            {formatCurrency(d?.purchasesGst)}
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

      {/* ========================================================================= */}
      {/* 7. GST RETURN PREPARATION (GSTR-1 & GSTR-3B) */}
      {/* ========================================================================= */}
      {activeSection === 'return_prep' && (
        <div className="space-y-6">
          {/* Important Legal Notice Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-amber-950">
              <span className="font-extrabold uppercase tracking-wide block">
                GST Return Preparation & Review Module
              </span>
              This module prepares and validates your outward supplies (GSTR-1) and summary liability (GSTR-3B) for review.
              <b> Note:</b> This system generates accurate return data for review and export. Returns must be uploaded/filed directly on the government GST portal (gst.gov.in) by the authorized shop owner.
            </div>
          </div>

          {/* Sub-tabs: GSTR-1 vs GSTR-3B */}
          <div className="flex items-center justify-between border-b border-amber-200">
            <div className="flex gap-2">
              <button
                onClick={() => setReturnTab('gstr1')}
                className={`py-3 px-5 text-sm font-extrabold border-b-2 transition-all ${
                  returnTab === 'gstr1'
                    ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                GSTR-1 (Outward Supplies)
              </button>
              <button
                onClick={() => setReturnTab('gstr3b')}
                className={`py-3 px-5 text-sm font-extrabold border-b-2 transition-all ${
                  returnTab === 'gstr3b'
                    ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                GSTR-3B (Monthly/Quarterly Summary)
              </button>
            </div>

            <div className="pb-2">
              {returnTab === 'gstr1' ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleExportGstr1Csv}
                >
                  Export GSTR-1 Data (CSV)
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleExportGstr3bCsv}
                >
                  Export GSTR-3B Summary (CSV)
                </Button>
              )}
            </div>
          </div>

          {/* GSTR-1 Panels */}
          {returnTab === 'gstr1' && (
            <div className="space-y-6">
              {/* Table 4: B2B Invoices */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-slate-950 text-sm">
                    Table 4: B2B Invoices (Supplies to Registered Dealers)
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {gstr1Data.b2bInvoices.length} Registered Invoices
                  </span>
                </div>

                {gstr1Data.b2bInvoices.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 italic">
                    No sales with customer GSTIN registered in this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-amber-50/70 border-b border-amber-200/80 font-bold text-slate-700">
                          <th className="p-2.5">Invoice No</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Customer Name</th>
                          <th className="p-2.5">Customer GSTIN</th>
                          <th className="p-2.5 text-right">Taxable (₹)</th>
                          <th className="p-2.5 text-center">Rate</th>
                          <th className="p-2.5 text-right">CGST</th>
                          <th className="p-2.5 text-right">SGST</th>
                          <th className="p-2.5 text-right">IGST</th>
                          <th className="p-2.5 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100/60 font-semibold">
                        {gstr1Data.b2bInvoices.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="p-2.5 font-mono font-bold text-slate-950">{inv.invoiceNumber}</td>
                            <td className="p-2.5 font-mono text-slate-600">{formatDate(inv.invoiceDate)}</td>
                            <td className="p-2.5 font-bold text-slate-900">{inv.customerName}</td>
                            <td className="p-2.5 font-mono font-bold text-amber-900">{inv.customerGstin}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(inv.taxableValue)}</td>
                            <td className="p-2.5 text-center font-mono">{inv.gstRate}%</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(inv.cgst)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(inv.sgst)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(inv.igst)}</td>
                            <td className="p-2.5 text-right font-mono font-black">{formatCurrency(inv.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table 7: B2C Small */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-slate-950 text-sm">
                    Table 7: B2C (Small) Supplies (Aggregated Retail Sales to Consumers)
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    Grouped by POS & GST Rate
                  </span>
                </div>

                {gstr1Data.b2cSummaries.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 italic">
                    No retail B2C transactions in this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-amber-50/70 border-b border-amber-200/80 font-bold text-slate-700">
                          <th className="p-2.5">Place of Supply</th>
                          <th className="p-2.5 text-center">Applicable Rate</th>
                          <th className="p-2.5 text-right">Taxable Value (₹)</th>
                          <th className="p-2.5 text-right">CGST (₹)</th>
                          <th className="p-2.5 text-right">SGST (₹)</th>
                          <th className="p-2.5 text-right">IGST (₹)</th>
                          <th className="p-2.5 text-right">Total Invoice Value (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100/60 font-semibold">
                        {gstr1Data.b2cSummaries.map((sum, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="p-2.5 font-bold text-slate-900">{sum.placeOfSupply}</td>
                            <td className="p-2.5 text-center font-mono font-bold">{sum.gstRate}%</td>
                            <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(sum.taxableValue)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(sum.cgst)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(sum.sgst)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(sum.igst)}</td>
                            <td className="p-2.5 text-right font-mono font-black">{formatCurrency(sum.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table 12: HSN Summary */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-slate-950 text-sm">
                    Table 12: HSN-wise Summary of Outward Supplies
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    Mandatory for GST returns
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50/70 border-b border-amber-200/80 font-bold text-slate-700">
                        <th className="p-2.5">HSN Code</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-center">UQC</th>
                        <th className="p-2.5 text-center">Total Qty</th>
                        <th className="p-2.5 text-right">Taxable Value</th>
                        <th className="p-2.5 text-right">CGST</th>
                        <th className="p-2.5 text-right">SGST</th>
                        <th className="p-2.5 text-right">IGST</th>
                        <th className="p-2.5 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60 font-semibold">
                      {gstr1Data.hsnSummary.map((h, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/40">
                          <td className="p-2.5 font-mono font-black text-amber-900">{h.hsnCode}</td>
                          <td className="p-2.5 font-bold text-slate-900">{h.description}</td>
                          <td className="p-2.5 text-center font-mono">{h.uqc}</td>
                          <td className="p-2.5 text-center font-mono font-bold">{h.totalQuantity}</td>
                          <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(h.taxableValue)}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(h.cgst)}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(h.sgst)}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(h.igst)}</td>
                          <td className="p-2.5 text-right font-mono font-black">{formatCurrency(h.totalValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* GSTR-3B Panel */}
          {returnTab === 'gstr3b' && (
            <div className="space-y-6">
              {/* 3.1 Outward supplies */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5 space-y-3">
                <h3 className="font-extrabold text-slate-950 text-sm">
                  3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
                </h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/80 font-bold text-slate-700">
                      <th className="p-2.5">Nature of Supplies</th>
                      <th className="p-2.5 text-right">Total Taxable Value (₹)</th>
                      <th className="p-2.5 text-right">Integrated Tax (IGST)</th>
                      <th className="p-2.5 text-right">Central Tax (CGST)</th>
                      <th className="p-2.5 text-right">State Tax (SGST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 font-semibold">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900">
                        (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                        {formatCurrency(gstSummary.totalTaxableSales)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-blue-800">
                        {formatCurrency(gstSummary.outwardIgst)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(gstSummary.outwardCgst)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(gstSummary.outwardSgst)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-500">
                        (d) Inward supplies (liable to reverse charge)
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-400">₹0</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">₹0</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">₹0</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">₹0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Eligible ITC */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5 space-y-3">
                <h3 className="font-extrabold text-slate-950 text-sm">
                  4. Eligible Input Tax Credit (ITC)
                </h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/80 font-bold text-slate-700">
                      <th className="p-2.5">Details</th>
                      <th className="p-2.5 text-right">Integrated Tax (IGST)</th>
                      <th className="p-2.5 text-right">Central Tax (CGST)</th>
                      <th className="p-2.5 text-right">State Tax (SGST)</th>
                      <th className="p-2.5 text-right">Total ITC (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 font-semibold">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900">
                        (A) ITC Available (whether in full or part) - (5) All other ITC
                      </td>
                      <td className="p-2.5 text-right font-mono text-blue-800">
                        {formatCurrency(gstSummary.inwardIgst)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(gstSummary.inwardCgst)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900">
                        {formatCurrency(gstSummary.inwardSgst)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(gstSummary.eligibleItc)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-500">
                        (B) Ineligible ITC - As per section 17(5)
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-400">₹0</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">₹0</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">₹0</td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                        {formatCurrency(gstSummary.ineligibleItc)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 5.1 & 6. Net Tax Payable */}
              <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5 space-y-3">
                <h3 className="font-extrabold text-slate-950 text-sm">
                  5.1 & 6. Payment of Tax (Net Liability to Deposit)
                </h3>
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 uppercase">
                      Total Output Tax Liability
                    </span>
                    <p className="text-lg font-black text-slate-950 font-mono">
                      {formatCurrency(gstSummary.totalOutputTax)}
                    </p>
                  </div>
                  <div className="text-center font-bold text-slate-400 text-lg">−</div>
                  <div>
                    <span className="text-xs font-bold text-blue-900 uppercase">
                      Eligible Input Tax Credit
                    </span>
                    <p className="text-lg font-black text-blue-800 font-mono">
                      {formatCurrency(gstSummary.eligibleItc)}
                    </p>
                  </div>
                  <div className="text-center font-bold text-slate-400 text-lg">=</div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 uppercase">
                      Net Tax Payable in Cash
                    </span>
                    <p className="text-xl font-black text-emerald-700 font-mono">
                      {formatCurrency(gstSummary.netTaxPayable)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PRINT & DOWNLOAD REPORTS */}
      {/* ========================================================================= */}
      {activeSection === 'print_download' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-amber-200/80 p-6 shadow-xs">
            <h3 className="text-lg font-black text-slate-950 mb-2">
              Print & Export Command Center
            </h3>
            <p className="text-xs text-slate-600 mb-6 font-medium">
              Generate pixel-perfect A4 printable reports and export complete GST datasets to CSV and Excel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <span className="font-bold text-xs uppercase text-slate-700 block">
                  1. Sales Tax Register
                </span>
                <p className="text-[11px] text-slate-500">
                  Itemized outward sales register with HSN codes, GSTINs, and tax breakdown.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                    onClick={handlePrintReport}
                  >
                    Print Sales Report
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportSalesCsv}
                  >
                    Download CSV
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <span className="font-bold text-xs uppercase text-slate-700 block">
                  2. Purchase Tax Register
                </span>
                <p className="text-[11px] text-slate-500">
                  Itemized inward purchases with supplier GSTINs and eligible ITC classification.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                    onClick={handlePrintReport}
                  >
                    Print Purchase Report
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportPurchasesCsv}
                  >
                    Download CSV
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <span className="font-bold text-xs uppercase text-slate-700 block">
                  3. GSTR-1 Preparation
                </span>
                <p className="text-[11px] text-slate-500">
                  Table 4 B2B, Table 7 B2C, and Table 12 HSN summary formatted for review.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                    onClick={handlePrintReport}
                  >
                    Print GSTR-1
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportGstr1Csv}
                  >
                    Download CSV
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <span className="font-bold text-xs uppercase text-slate-700 block">
                  4. GSTR-3B Summary
                </span>
                <p className="text-[11px] text-slate-500">
                  Outward tax liability, eligible ITC offset, and estimated net tax deposit.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                    onClick={handlePrintReport}
                  >
                    Print GSTR-3B
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportGstr3bCsv}
                  >
                    Download CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. GST SETTINGS */}
      {/* ========================================================================= */}
      {activeSection === 'settings' && (
        <form onSubmit={handleSaveGstSettings} className="space-y-6">
          <Card>
            <CardHeader
              title="Shop GST Configuration"
              subtitle="Configure GSTIN, state code, scheme, and bank details for invoices"
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Shop GSTIN (15 Alphanumeric Characters)"
                    name="gstin"
                    value={gstForm.gstin}
                    onChange={(e) =>
                      setGstForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
                    }
                    placeholder="27AABCM1234F1Z5"
                    required
                  />
                  {gstForm.gstin && (
                    <div className="mt-1">
                      {validateGstin(gstForm.gstin).isValid ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valid GSTIN structure (State: {validateGstin(gstForm.gstin).stateName})
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {validateGstin(gstForm.gstin).error}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Input
                  label="Legal / Trade Name"
                  name="tradeName"
                  value={gstForm.tradeName}
                  onChange={(e) =>
                    setGstForm((prev) => ({ ...prev, tradeName: e.target.value }))
                  }
                  placeholder="Malhar Tools Hardware & Spares"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    State & Code (राज्य व कोड)
                  </label>
                  <select
                    value={gstForm.stateCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const s = getStateByCode(code);
                      setGstForm((prev) => ({
                        ...prev,
                        stateCode: code,
                        state: s?.name || prev.state,
                      }));
                    }}
                    className="w-full rounded-xl border border-amber-200 py-2.5 px-3 text-xs font-bold bg-white text-slate-900"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    GST Taxpayer Scheme
                  </label>
                  <select
                    value={gstForm.gstScheme}
                    onChange={(e) =>
                      setGstForm((prev) => ({ ...prev, gstScheme: e.target.value as any }))
                    }
                    className="w-full rounded-xl border border-amber-200 py-2.5 px-3 text-xs font-bold bg-white text-slate-900"
                  >
                    <option value="regular">Regular Taxpayer (निमित करदाता)</option>
                    <option value="composition">Composition Scheme (कंपोझिशन योजना)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Default GST Rate for Tools
                  </label>
                  <select
                    value={gstForm.defaultGstRate}
                    onChange={(e) =>
                      setGstForm((prev) => ({ ...prev, defaultGstRate: Number(e.target.value) }))
                    }
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

              {/* Invoice Prefix & Bank Details */}
              <div className="pt-4 border-t border-amber-100">
                <h4 className="font-extrabold text-sm text-slate-900 mb-3">
                  Invoice & Bank Account Details (Appears on Tax Invoices)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    label="Invoice Prefix"
                    value={gstForm.invoicePrefix}
                    onChange={(e) =>
                      setGstForm((prev) => ({ ...prev, invoicePrefix: e.target.value }))
                    }
                    placeholder="MT/26-27/"
                  />
                  <Input
                    label="Bank Name"
                    value={gstForm.bankName}
                    onChange={(e) =>
                      setGstForm((prev) => ({ ...prev, bankName: e.target.value }))
                    }
                    placeholder="State Bank of India"
                  />
                  <Input
                    label="Account Number"
                    value={gstForm.bankAccountNumber}
                    onChange={(e) =>
                      setGstForm((prev) => ({ ...prev, bankAccountNumber: e.target.value }))
                    }
                    placeholder="389012345678"
                  />
                  <Input
                    label="IFSC Code"
                    value={gstForm.bankIfsc}
                    onChange={(e) =>
                      setGstForm((prev) => ({ ...prev, bankIfsc: e.target.value.toUpperCase() }))
                    }
                    placeholder="SBIN0001234"
                  />
                </div>
              </div>

              {/* Terms and conditions */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Tax Invoice Terms & Conditions
                </label>
                <textarea
                  rows={3}
                  value={gstForm.invoiceTerms}
                  onChange={(e) =>
                    setGstForm((prev) => ({ ...prev, invoiceTerms: e.target.value }))
                  }
                  className="w-full rounded-xl border border-amber-200 text-xs font-medium p-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSavingGst}
                  className="font-bold shadow-xs"
                >
                  Save GST Settings
                </Button>
              </div>
            </CardBody>
          </Card>
        </form>
      )}

      {/* ========================================================================= */}
      {/* GST TAX INVOICE MODAL (Triggered when viewing invoice from Sales Report) */}
      {/* ========================================================================= */}
      {viewInvoiceSale && (
        <Modal
          isOpen={Boolean(viewInvoiceSale)}
          onClose={() => setViewInvoiceSale(null)}
          title="Tax Invoice"
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
