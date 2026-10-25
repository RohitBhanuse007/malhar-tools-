import React from 'react';
import { Printer, Download, X, CheckCircle, Building2, Phone, Mail, ShieldCheck } from 'lucide-react';
import { Sale, ShopSettings } from '../../types';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { amountToWords, normalizeSaleGst, getStateByCode } from '../../utils/gstUtils';
import { useLanguage } from '../../context/LanguageContext';

interface GstTaxInvoiceProps {
  sale: Sale;
  shopSettings?: ShopSettings | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const GstTaxInvoice: React.FC<GstTaxInvoiceProps> = ({
  sale,
  shopSettings,
  onClose,
  isModal = false,
}) => {
  const { language } = useLanguage();

  const shopStateCode = shopSettings?.stateCode || '27';
  const norm = normalizeSaleGst(sale, shopStateCode);

  const shopName = language === 'mr' && shopSettings?.shopNameMr
    ? shopSettings.shopNameMr
    : shopSettings?.shopName || 'Malhar Tools';

  const shopAddress = shopSettings?.address || 'Shop No. 4, Main Hardware Market, Station Road, Sangli, Maharashtra';
  const primaryContact = shopSettings?.contactNumber || '+91 9270693111';
  const secondaryContact = shopSettings?.secondaryContactNumber || '+91 9172978555';
  const shopContact = secondaryContact && secondaryContact !== primaryContact
    ? `${primaryContact}, ${secondaryContact}`
    : primaryContact;
  const shopEmail = shopSettings?.email || 'bhanusedarshan@gmail.com';
  const shopGstin = shopSettings?.gstin || '27AMWPB3781F1ZR';
  const shopState = shopSettings?.state || 'Maharashtra';

  const customerStateObj = getStateByCode(sale.customerStateCode) || getStateByCode(shopStateCode);
  const placeOfSupply = customerStateObj
    ? `${customerStateObj.code}-${customerStateObj.name}`
    : `${shopStateCode}-${shopState}`;

  const isB2B = Boolean(sale.customerGstin && sale.customerGstin.trim());
  const grandTotal = Number(sale.totalAmount) || (norm.taxableAmount + norm.totalGst);
  const words = amountToWords(grandTotal);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const invoiceContent = (
    <div
      id="printable-gst-invoice"
      className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-xs leading-relaxed"
    >
      {/* Top Header / Brand banner */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-black border border-amber-500/50 p-1 flex items-center justify-center shrink-0">
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
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                  {shopName}
                </h1>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest hidden sm:inline">
                  • HARDWARE & SPARES
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium max-w-md">{shopAddress}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600 mt-1 font-semibold">
                <span>Phone: <b className="text-slate-900">{shopContact}</b></span>
                <span>Email: <b className="text-slate-900">{shopEmail}</b></span>
              </div>
            </div>
          </div>

          {/* Tax Invoice Badge */}
          <div className="sm:text-right shrink-0 bg-amber-50/80 border border-amber-300/80 p-3 rounded-xl sm:min-w-[190px]">
            <span className="inline-block px-2 py-0.5 bg-slate-900 text-amber-300 font-black text-[11px] tracking-wider rounded uppercase">
              TAX INVOICE
            </span>
            <p className="text-[10px] text-slate-500 font-bold mt-1">ORIGINAL FOR RECIPIENT</p>
            <p className="text-xs font-black text-slate-950 font-mono mt-1">
              GSTIN: {shopGstin}
            </p>
            <p className="text-[11px] font-bold text-slate-700">
              State: {shopState} (Code: {shopStateCode})
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Meta Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
        {/* Bill To */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Billed To (Customer Details)
          </span>
          <p className="text-sm font-black text-slate-950">
            {sale.customerName || 'Walk-in Retail Customer'}
          </p>
          {sale.customerAddress && (
            <p className="text-slate-600 mt-0.5">{sale.customerAddress}</p>
          )}
          <div className="mt-2 space-y-0.5 text-[11px]">
            <p className="font-semibold text-slate-700">
              Customer GSTIN:{' '}
              {isB2B ? (
                <span className="font-mono font-bold text-slate-950">{sale.customerGstin}</span>
              ) : (
                <span className="text-slate-500 italic">Unregistered (B2C)</span>
              )}
            </p>
            <p className="font-semibold text-slate-700">
              Place of Supply:{' '}
              <span className="font-bold text-slate-900">{placeOfSupply}</span>
            </p>
          </div>
        </div>

        {/* Invoice Numbers */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Invoice Reference Details
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Invoice Number</span>
              <span className="font-mono font-black text-slate-950 text-sm">{norm.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Invoice Date</span>
              <span className="font-mono font-bold text-slate-900">{formatDate(sale.date)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Payment Mode</span>
              <span className="font-bold text-slate-900">{sale.paymentMode}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Reverse Charge</span>
              <span className="font-bold text-slate-900">NO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-[10px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300">
              <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
              <th className="p-2 border-r border-slate-300">Description of Goods</th>
              <th className="p-2 border-r border-slate-300 text-center w-20">HSN/SAC</th>
              <th className="p-2 border-r border-slate-300 text-center w-14">Qty</th>
              <th className="p-2 border-r border-slate-300 text-right w-20">Rate (₹)</th>
              <th className="p-2 border-r border-slate-300 text-right w-24">Taxable Value</th>
              {norm.isInterState ? (
                <th className="p-2 border-r border-slate-300 text-right w-24">
                  IGST ({norm.gstRate}%)
                </th>
              ) : (
                <>
                  <th className="p-2 border-r border-slate-300 text-right w-20">
                    CGST ({norm.gstRate / 2}%)
                  </th>
                  <th className="p-2 border-r border-slate-300 text-right w-20">
                    SGST ({norm.gstRate / 2}%)
                  </th>
                </>
              )}
              <th className="p-2 text-right w-24">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-200">
            <tr>
              <td className="p-2.5 border-r border-slate-300 text-center font-mono">1</td>
              <td className="p-2.5 border-r border-slate-300 font-bold text-slate-950">
                {sale.productName}
                {sale.notes && (
                  <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                    {sale.notes}
                  </span>
                )}
              </td>
              <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                {sale.hsnCode || '8204'}
              </td>
              <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold">
                {sale.quantity}
              </td>
              <td className="p-2.5 border-r border-slate-300 text-right font-mono">
                {formatCurrency(sale.sellingPrice)}
              </td>
              <td className="p-2.5 border-r border-slate-300 text-right font-mono font-semibold">
                {formatCurrency(norm.taxableAmount)}
              </td>
              {norm.isInterState ? (
                <td className="p-2.5 border-r border-slate-300 text-right font-mono font-semibold">
                  {formatCurrency(norm.igst)}
                </td>
              ) : (
                <>
                  <td className="p-2.5 border-r border-slate-300 text-right font-mono font-semibold">
                    {formatCurrency(norm.cgst)}
                  </td>
                  <td className="p-2.5 border-r border-slate-300 text-right font-mono font-semibold">
                    {formatCurrency(norm.sgst)}
                  </td>
                </>
              )}
              <td className="p-2.5 text-right font-mono font-black text-slate-950">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tax Breakdown & Summary Box */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-300 pt-4">
        {/* Left Side: Amount in Words */}
        <div className="space-y-3">
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">
              Total Amount in Words:
            </span>
            <p className="text-xs font-bold text-slate-900 italic mt-0.5">
              {words}
            </p>
          </div>
        </div>

        {/* Right Side: Totals Calculation */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-600 font-medium">
            <span>Total Taxable Value:</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(norm.taxableAmount)}</span>
          </div>

          {!norm.isInterState ? (
            <>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Central GST (CGST {norm.gstRate / 2}%):</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(norm.cgst)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>State GST (SGST {norm.gstRate / 2}%):</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(norm.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>Integrated GST (IGST {norm.gstRate}%):</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(norm.igst)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-slate-700 font-semibold border-t border-slate-300 pt-1.5">
            <span>Total Tax Amount (GST):</span>
            <span className="font-mono font-bold text-amber-800">{formatCurrency(norm.totalGst)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-950 font-black text-sm bg-amber-100/70 p-2.5 rounded-lg border border-amber-300">
            <span>Grand Invoice Total:</span>
            <span className="font-mono text-base text-slate-950">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Signatures */}
      <div className="mt-6 pt-4 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
            Terms & Conditions
          </span>
          <p className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-line">
            {shopSettings?.invoiceTerms ||
              '1. Goods once sold will not be taken back without original tax invoice.\n2. Warranty as per manufacturer policy.\n3. Subject to local jurisdiction.'}
          </p>
        </div>

        <div className="flex flex-col items-end justify-between text-right min-h-[70px]">
          <span className="text-[10px] font-bold text-slate-800 uppercase">
            For {shopName}
          </span>
          <div className="pt-8">
            <span className="text-[11px] font-bold text-slate-900 border-t border-slate-800 pt-1 block">
              Authorized Signatory
            </span>
          </div>
        </div>
      </div>

      {/* Computer generated notice footer */}
      <div className="mt-4 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        This is a computer-generated GST Tax Invoice. No physical signature is required.
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="space-y-4">
        {/* Modal Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-900 text-sm">
              GST Tax Invoice Preview ({norm.invoiceNumber})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print Invoice
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadPdf}
            >
              Download PDF
            </Button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Invoice Body */}
        {invoiceContent}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3 print:hidden">
        <Button
          variant="outline"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
        >
          Print Invoice
        </Button>
        <Button
          variant="primary"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleDownloadPdf}
        >
          Download PDF
        </Button>
      </div>
      {invoiceContent}
    </div>
  );
};
