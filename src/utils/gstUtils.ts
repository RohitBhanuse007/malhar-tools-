import { Sale, Purchase, GstRate, GstFilterPeriod, GstSummaryData, GstTaxBreakdown } from '../types';
import { getTodayDateString } from './formatters';

// Standard 2-digit GST state codes according to Indian GST law
export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const GST_RATES: GstRate[] = [0, 5, 12, 18, 28];

export function getStateByCode(code?: string): { code: string; name: string } | undefined {
  if (!code) return undefined;
  const cleanCode = code.trim().padStart(2, '0');
  return INDIAN_STATES.find((s) => s.code === cleanCode);
}

export function getStateByName(name?: string): { code: string; name: string } | undefined {
  if (!name) return undefined;
  const cleanName = name.trim().toLowerCase();
  return INDIAN_STATES.find((s) => s.name.toLowerCase() === cleanName);
}

/**
 * Validates a 15-character GSTIN format:
 * 2 digits (State Code) + 5 letters (PAN) + 4 digits (PAN) + 1 letter (PAN) + 1 digit/char (Entity) + 'Z' + 1 checksum
 */
export function validateGstin(gstin?: string): {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  error?: string;
} {
  if (!gstin || !gstin.trim()) {
    return { isValid: false, error: 'GSTIN is empty.' };
  }

  const clean = gstin.trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (clean.length !== 15) {
    return {
      isValid: false,
      error: `GSTIN must be exactly 15 characters (currently ${clean.length}).`,
    };
  }

  if (!gstinRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN structure. Format: 27ABCDE1234F1Z5',
    };
  }

  const stateCode = clean.substring(0, 2);
  const state = getStateByCode(stateCode);

  return {
    isValid: true,
    stateCode,
    stateName: state?.name || 'Unknown State',
  };
}

/**
 * Calculates line-level GST breakdown with precision
 */
export function calculateGstLineItem({
  quantity,
  unitPrice,
  gstRate,
  discount = 0,
  isTaxInclusive = false,
  isInterState = false,
}: {
  quantity: number;
  unitPrice: number;
  gstRate: number;
  discount?: number;
  isTaxInclusive?: boolean;
  isInterState?: boolean;
}): GstTaxBreakdown {
  const qty = Math.max(0, Number(quantity) || 0);
  const price = Math.max(0, Number(unitPrice) || 0);
  const disc = Math.max(0, Number(discount) || 0);
  const rate = Math.max(0, Number(gstRate) || 0);

  const rawGross = Math.max(0, qty * price - disc);

  let taxableAmount = 0;
  let totalGst = 0;
  let grandTotal = 0;

  if (rate === 0) {
    taxableAmount = Number(rawGross.toFixed(2));
    totalGst = 0;
    grandTotal = taxableAmount;
  } else if (isTaxInclusive) {
    taxableAmount = Number((rawGross / (1 + rate / 100)).toFixed(2));
    totalGst = Number((rawGross - taxableAmount).toFixed(2));
    grandTotal = Number(rawGross.toFixed(2));
  } else {
    taxableAmount = Number(rawGross.toFixed(2));
    totalGst = Number(((taxableAmount * rate) / 100).toFixed(2));
    grandTotal = Number((taxableAmount + totalGst).toFixed(2));
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = totalGst;
    cgst = 0;
    sgst = 0;
  } else {
    igst = 0;
    cgst = Number((totalGst / 2).toFixed(2));
    sgst = Number((totalGst - cgst).toFixed(2)); // Exact penny balance
  }

  return {
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalGst,
    grandTotal,
  };
}

/**
 * Converts Indian Rupee amounts into Words (Crores, Lakhs, Thousands, Hundreds)
 */
export function amountToWords(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount === 0) {
    return 'Zero Rupees Only';
  }

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertUnderThousand(num: number): string {
    let str = '';
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += ones[num] + ' ';
    }
    return str.trim();
  }

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let result = '';

  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem %= 100000;

  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  const hundredAndBelow = rem;

  if (crore > 0) {
    result += convertUnderThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertUnderThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertUnderThousand(thousand) + ' Thousand ';
  }
  if (hundredAndBelow > 0) {
    result += convertUnderThousand(hundredAndBelow) + ' ';
  }

  result = result.trim() ? result.trim() + ' Rupees' : 'Zero Rupees';

  if (paise > 0) {
    result += ' and ' + convertUnderThousand(paise) + ' Paise';
  }

  return (amount < 0 ? 'Minus ' : '') + result + ' Only';
}

/**
 * Computes standard date intervals for GST filing periods
 */
export function getDateRangeForPeriod(
  period: GstFilterPeriod,
  customFrom?: string,
  customTo?: string
): { fromDate: string; toDate: string; label: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 = Jan, 3 = Apr, etc.)

  const pad = (n: number) => String(n).padStart(2, '0');

  switch (period) {
    case 'today': {
      const todayStr = getTodayDateString();
      return { fromDate: todayStr, toDate: todayStr, label: 'Today' };
    }
    case 'this_month': {
      const start = `${year}-${pad(month + 1)}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return { fromDate: start, toDate: end, label: `This Month (${monthNames[month]} ${year})` };
    }
    case 'prev_month': {
      const prevDate = new Date(year, month - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth();
      const start = `${prevYear}-${pad(prevMonth + 1)}-01`;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      const end = `${prevYear}-${pad(prevMonth + 1)}-${pad(lastDay)}`;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return { fromDate: start, toDate: end, label: `Previous Month (${monthNames[prevMonth]} ${prevYear})` };
    }
    case 'q1': {
      // Q1: Apr 1 - Jun 30
      const qYear = month >= 3 ? year : year - 1;
      return { fromDate: `${qYear}-04-01`, toDate: `${qYear}-06-30`, label: `Q1 (Apr - Jun ${qYear})` };
    }
    case 'q2': {
      // Q2: Jul 1 - Sep 30
      const qYear = month >= 3 ? year : year - 1;
      return { fromDate: `${qYear}-07-01`, toDate: `${qYear}-09-30`, label: `Q2 (Jul - Sep ${qYear})` };
    }
    case 'q3': {
      // Q3: Oct 1 - Dec 31
      const qYear = month >= 3 ? year : year - 1;
      return { fromDate: `${qYear}-10-01`, toDate: `${qYear}-12-31`, label: `Q3 (Oct - Dec ${qYear})` };
    }
    case 'q4': {
      // Q4: Jan 1 - Mar 31
      const qYear = month >= 3 ? year + 1 : year;
      return { fromDate: `${qYear}-01-01`, toDate: `${qYear}-03-31`, label: `Q4 (Jan - Mar ${qYear})` };
    }
    case 'fy': {
      // Indian Financial Year: Apr 1 of starting year to Mar 31 of next year
      const fyStart = month >= 3 ? year : year - 1;
      const fyEnd = fyStart + 1;
      return {
        fromDate: `${fyStart}-04-01`,
        toDate: `${fyEnd}-03-31`,
        label: `FY ${fyStart}-${String(fyEnd).slice(-2)}`,
      };
    }
    case 'custom':
    default: {
      const from = customFrom || getTodayDateString();
      const to = customTo || getTodayDateString();
      return { fromDate: from, toDate: to, label: `Custom (${from} to ${to})` };
    }
  }
}

/**
 * Normalizes a Sale object to ensure clean GST numbers
 */
export function normalizeSaleGst(sale: Sale, shopStateCode: string = '27'): {
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  isInterState: boolean;
  invoiceNumber: string;
} {
  const isInterState = sale.isInterState ?? (
    !!sale.customerStateCode && sale.customerStateCode !== shopStateCode
  );

  const gstRate = sale.gstRate !== undefined ? Number(sale.gstRate) : 18; // default 18% if not specified
  const totalAmount = Number(sale.totalAmount) || 0;

  let taxableAmount = sale.taxableAmount !== undefined ? Number(sale.taxableAmount) : 0;
  let totalGst = sale.totalGst !== undefined ? Number(sale.totalGst) : 0;
  let cgst = sale.cgst !== undefined ? Number(sale.cgst) : 0;
  let sgst = sale.sgst !== undefined ? Number(sale.sgst) : 0;
  let igst = sale.igst !== undefined ? Number(sale.igst) : 0;

  // Fallback calculation for legacy sales where tax fields weren't saved
  if (taxableAmount === 0 && totalAmount > 0) {
    const calc = calculateGstLineItem({
      quantity: sale.quantity || 1,
      unitPrice: sale.sellingPrice || totalAmount,
      gstRate,
      discount: sale.discount || 0,
      isTaxInclusive: true, // Legacy bills are treated as inclusive of taxes
      isInterState,
    });
    taxableAmount = calc.taxableAmount;
    totalGst = calc.totalGst;
    cgst = calc.cgst;
    sgst = calc.sgst;
    igst = calc.igst;
  }

  const invoiceNumber = sale.invoiceNumber || `INV-${sale.id.slice(-6).toUpperCase()}`;

  return {
    taxableAmount,
    gstRate,
    cgst,
    sgst,
    igst,
    totalGst,
    isInterState,
    invoiceNumber,
  };
}

/**
 * Normalizes a Purchase object to ensure clean GST numbers
 */
export function normalizePurchaseGst(purchase: Purchase, shopStateCode: string = '27'): {
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  isInterState: boolean;
  isEligibleITC: boolean;
  invoiceNumber: string;
} {
  const isInterState = purchase.isInterState ?? (
    !!purchase.supplierStateCode && purchase.supplierStateCode !== shopStateCode
  );

  const gstRate = purchase.gstRate !== undefined ? Number(purchase.gstRate) : 18;
  const totalAmount = Number(purchase.totalAmount) || 0;

  let taxableAmount = purchase.taxableAmount !== undefined ? Number(purchase.taxableAmount) : 0;
  let totalGst = purchase.totalGst !== undefined ? Number(purchase.totalGst) : 0;
  let cgst = purchase.cgst !== undefined ? Number(purchase.cgst) : 0;
  let sgst = purchase.sgst !== undefined ? Number(purchase.sgst) : 0;
  let igst = purchase.igst !== undefined ? Number(purchase.igst) : 0;
  const isEligibleITC = purchase.isEligibleITC !== undefined ? purchase.isEligibleITC : true;

  if (taxableAmount === 0 && totalAmount > 0) {
    const calc = calculateGstLineItem({
      quantity: purchase.quantity || 1,
      unitPrice: purchase.purchasePrice || totalAmount,
      gstRate,
      isTaxInclusive: true,
      isInterState,
    });
    taxableAmount = calc.taxableAmount;
    totalGst = calc.totalGst;
    cgst = calc.cgst;
    sgst = calc.sgst;
    igst = calc.igst;
  }

  const invoiceNumber = purchase.invoiceNumber || `PUR-${purchase.id.slice(-6).toUpperCase()}`;

  return {
    taxableAmount,
    gstRate,
    cgst,
    sgst,
    igst,
    totalGst,
    isInterState,
    isEligibleITC,
    invoiceNumber,
  };
}

/**
 * Computes consolidated GST summary from Sales and Purchases within a date range
 */
export function computeGstSummary(
  sales: Sale[],
  purchases: Purchase[],
  fromDate: string,
  toDate: string,
  shopStateCode: string = '27'
): GstSummaryData {
  const filteredSales = sales.filter((s) => s.date >= fromDate && s.date <= toDate);
  const filteredPurchases = purchases.filter((p) => p.date >= fromDate && p.date <= toDate);

  let totalSalesValue = 0;
  let totalTaxableSales = 0;
  let outwardCgst = 0;
  let outwardSgst = 0;
  let outwardIgst = 0;

  let totalPurchasesValue = 0;
  let totalTaxablePurchases = 0;
  let inwardCgst = 0;
  let inwardSgst = 0;
  let inwardIgst = 0;
  let eligibleItc = 0;
  let ineligibleItc = 0;

  const rateWiseSummary: Record<number, {
    taxableSales: number;
    salesGst: number;
    taxablePurchases: number;
    purchasesGst: number;
  }> = {
    0: { taxableSales: 0, salesGst: 0, taxablePurchases: 0, purchasesGst: 0 },
    5: { taxableSales: 0, salesGst: 0, taxablePurchases: 0, purchasesGst: 0 },
    12: { taxableSales: 0, salesGst: 0, taxablePurchases: 0, purchasesGst: 0 },
    18: { taxableSales: 0, salesGst: 0, taxablePurchases: 0, purchasesGst: 0 },
    28: { taxableSales: 0, salesGst: 0, taxablePurchases: 0, purchasesGst: 0 },
  };

  filteredSales.forEach((s) => {
    totalSalesValue += Number(s.totalAmount) || 0;
    const norm = normalizeSaleGst(s, shopStateCode);

    totalTaxableSales += norm.taxableAmount;
    outwardCgst += norm.cgst;
    outwardSgst += norm.sgst;
    outwardIgst += norm.igst;

    const rate = norm.gstRate in rateWiseSummary ? norm.gstRate : 18;
    rateWiseSummary[rate].taxableSales += norm.taxableAmount;
    rateWiseSummary[rate].salesGst += norm.totalGst;
  });

  filteredPurchases.forEach((p) => {
    totalPurchasesValue += Number(p.totalAmount) || 0;
    const norm = normalizePurchaseGst(p, shopStateCode);

    totalTaxablePurchases += norm.taxableAmount;
    inwardCgst += norm.cgst;
    inwardSgst += norm.sgst;
    inwardIgst += norm.igst;

    if (norm.isEligibleITC) {
      eligibleItc += norm.totalGst;
    } else {
      ineligibleItc += norm.totalGst;
    }

    const rate = norm.gstRate in rateWiseSummary ? norm.gstRate : 18;
    rateWiseSummary[rate].taxablePurchases += norm.taxableAmount;
    rateWiseSummary[rate].purchasesGst += norm.totalGst;
  });

  const totalOutputTax = Number((outwardCgst + outwardSgst + outwardIgst).toFixed(2));
  const totalInputTax = Number((inwardCgst + inwardSgst + inwardIgst).toFixed(2));
  const netTaxPayable = Number(Math.max(0, totalOutputTax - eligibleItc).toFixed(2));

  return {
    totalSalesValue: Number(totalSalesValue.toFixed(2)),
    totalTaxableSales: Number(totalTaxableSales.toFixed(2)),
    outwardCgst: Number(outwardCgst.toFixed(2)),
    outwardSgst: Number(outwardSgst.toFixed(2)),
    outwardIgst: Number(outwardIgst.toFixed(2)),
    totalOutputTax,

    totalPurchasesValue: Number(totalPurchasesValue.toFixed(2)),
    totalTaxablePurchases: Number(totalTaxablePurchases.toFixed(2)),
    inwardCgst: Number(inwardCgst.toFixed(2)),
    inwardSgst: Number(inwardSgst.toFixed(2)),
    inwardIgst: Number(inwardIgst.toFixed(2)),
    totalInputTax,
    eligibleItc: Number(eligibleItc.toFixed(2)),
    ineligibleItc: Number(ineligibleItc.toFixed(2)),

    netTaxPayable,
    rateWiseSummary,
  };
}

/**
 * GSTR-1 Structure:
 * - Table 4: B2B Invoices (Registered buyers with valid GSTIN)
 * - Table 7: B2C Small (Unregistered buyers)
 * - Table 12: HSN Summary
 */
export interface Gstr1PreparationData {
  b2bInvoices: {
    invoiceNumber: string;
    invoiceDate: string;
    customerName: string;
    customerGstin: string;
    placeOfSupply: string;
    taxableValue: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }[];
  b2cSummaries: {
    placeOfSupply: string;
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }[];
  hsnSummary: {
    hsnCode: string;
    description: string;
    uqc: string;
    totalQuantity: number;
    totalValue: number;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    totalGst: number;
  }[];
  validationWarnings: {
    type: 'warning' | 'error';
    invoiceNumber: string;
    message: string;
  }[];
}

export function prepareGstr1Data(
  sales: Sale[],
  fromDate: string,
  toDate: string,
  shopStateCode: string = '27'
): Gstr1PreparationData {
  const filtered = sales.filter((s) => s.date >= fromDate && s.date <= toDate);
  const b2bInvoices: Gstr1PreparationData['b2bInvoices'] = [];
  const b2cMap = new Map<string, {
    placeOfSupply: string;
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }>();

  const hsnMap = new Map<string, {
    hsnCode: string;
    description: string;
    uqc: string;
    totalQuantity: number;
    totalValue: number;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    totalGst: number;
  }>();

  const validationWarnings: Gstr1PreparationData['validationWarnings'] = [];
  const seenInvoices = new Set<string>();

  filtered.forEach((sale) => {
    const norm = normalizeSaleGst(sale, shopStateCode);
    const invoiceNum = norm.invoiceNumber;

    // Check duplicate invoice numbers
    if (seenInvoices.has(invoiceNum)) {
      validationWarnings.push({
        type: 'error',
        invoiceNumber: invoiceNum,
        message: `Duplicate Invoice Number detected: ${invoiceNum}.`,
      });
    } else {
      seenInvoices.add(invoiceNum);
    }

    const posState = getStateByCode(sale.customerStateCode) || getStateByCode(shopStateCode);
    const pos = posState ? `${posState.code}-${posState.name}` : `${shopStateCode}-Maharashtra`;

    // B2B vs B2C
    if (sale.customerGstin && sale.customerGstin.trim()) {
      const gstinVal = validateGstin(sale.customerGstin);
      if (!gstinVal.isValid) {
        validationWarnings.push({
          type: 'warning',
          invoiceNumber: invoiceNum,
          message: `Customer ${sale.customerName || 'B2B'} has invalid GSTIN: "${sale.customerGstin}".`,
        });
      }

      b2bInvoices.push({
        invoiceNumber: invoiceNum,
        invoiceDate: sale.date,
        customerName: sale.customerName || 'Registered Dealer',
        customerGstin: sale.customerGstin.trim().toUpperCase(),
        placeOfSupply: pos,
        taxableValue: norm.taxableAmount,
        gstRate: norm.gstRate,
        cgst: norm.cgst,
        sgst: norm.sgst,
        igst: norm.igst,
        totalAmount: Number(sale.totalAmount) || (norm.taxableAmount + norm.totalGst),
      });
    } else {
      // B2C summary by Place of Supply & GST Rate
      const key = `${pos}_${norm.gstRate}`;
      const existing = b2cMap.get(key) || {
        placeOfSupply: pos,
        gstRate: norm.gstRate,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 0,
      };

      existing.taxableValue += norm.taxableAmount;
      existing.cgst += norm.cgst;
      existing.sgst += norm.sgst;
      existing.igst += norm.igst;
      existing.totalAmount += Number(sale.totalAmount) || (norm.taxableAmount + norm.totalGst);
      b2cMap.set(key, existing);
    }

    // HSN Summary
    const hsn = sale.hsnCode || '8204'; // Default hardware tool HSN if unassigned
    if (!sale.hsnCode) {
      validationWarnings.push({
        type: 'warning',
        invoiceNumber: invoiceNum,
        message: `Product "${sale.productName}" has no HSN/SAC code assigned. Using default 8204.`,
      });
    }

    const existingHsn = hsnMap.get(hsn) || {
      hsnCode: hsn,
      description: sale.productName || 'Hardware & Hand Tools',
      uqc: 'NOS',
      totalQuantity: 0,
      totalValue: 0,
      taxableValue: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      totalGst: 0,
    };

    existingHsn.totalQuantity += Number(sale.quantity) || 1;
    existingHsn.taxableValue += norm.taxableAmount;
    existingHsn.totalValue += Number(sale.totalAmount) || (norm.taxableAmount + norm.totalGst);
    existingHsn.igst += norm.igst;
    existingHsn.cgst += norm.cgst;
    existingHsn.sgst += norm.sgst;
    existingHsn.totalGst += norm.totalGst;
    hsnMap.set(hsn, existingHsn);
  });

  return {
    b2bInvoices,
    b2cSummaries: Array.from(b2cMap.values()),
    hsnSummary: Array.from(hsnMap.values()),
    validationWarnings,
  };
}

/**
 * Downloads data as a CSV file with UTF-8 BOM for full Excel and regional character support
 */
export function exportToCsv(filename: string, rows: (string | number | undefined | null)[][]): void {
  const processCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) return '""';
    const cellStr = String(cell);
    if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n')) {
      return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return `"${cellStr}"`;
  };

  const csvContent = '\uFEFF' + rows.map((row) => row.map(processCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Auto-generates sequential GST invoice numbers e.g. MT/26-27/0001
 */
export function generateNextInvoiceNumber(existingSales: Sale[], prefix: string = 'MT/26-27/'): string {
  const currentYearSales = existingSales.filter((s) => s.invoiceNumber && s.invoiceNumber.startsWith(prefix));
  let maxSeq = 0;

  currentYearSales.forEach((s) => {
    const suffix = s.invoiceNumber?.replace(prefix, '') || '';
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  });

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}
