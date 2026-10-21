import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCYixSuwqVY9wXu_zzdHklZ8yVC62kfx00",
  authDomain: "malhar-tools.firebaseapp.com",
  projectId: "malhar-tools",
  storageBucket: "malhar-tools.firebasestorage.app",
  messagingSenderId: "995944064187",
  appId: "1:995944064187:web:eb368e05fe46864923f59e",
  measurementId: "G-3BL0QMG21P"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHOP_ID = 'malhar-tools';

const DEFAULT_SHOP_SETTINGS = {
  shopName: 'Malhar Tools',
  shopNameMr: 'मल्हार टूल्स',
  address: 'Shop No. 4, Main Hardware Market, Station Road, Sangli, Maharashtra',
  contactNumber: '+91 98765 43210',
  email: 'owner@malhartools.com',
  logoUrl: '/logo.png',
  defaultLanguage: 'en',
  defaultLowStockThreshold: 5,
  customUnits: ['Piece', 'Box', 'Kg', 'Meter', 'Set', 'Pair', 'Roll', 'Packet', 'Litre'],
  customCategories: [
    'Hand Tools',
    'Power Tools',
    'Fasteners & Screws',
    'Plumbing & Pipes',
    'Electricals',
    'Paints & Adhesives',
    'Safety Equipment',
    'Hardware Fittings',
    'General Materials'
  ],
  gstin: '27AABCM1234F1Z5',
  state: 'Maharashtra',
  stateCode: '27',
  tradeName: 'Malhar Tools Hardware & Spares',
  gstScheme: 'regular',
  defaultGstRate: 18,
  bankName: 'State Bank of India',
  bankAccountNumber: '389012345678',
  bankIfsc: 'SBIN0001234',
  bankBranch: 'Main Market Branch, Sangli',
  invoicePrefix: 'MT/26-27/',
  invoiceTerms: '1. Goods once sold will not be taken back without original invoice. 2. Warranty/guarantee as per manufacturer terms. 3. Subject to Sangli jurisdiction.'
};

const PRODUCTS = [
  {
    id: 'prod_mounted_point_a11',
    name: 'A-11 PINK MOUNTED POINT',
    category: 'Power Tools',
    unit: 'Piece',
    sellingPrice: 20,
    purchasePrice: 12.5,
    currentStock: 200,
    lowStockThreshold: 20,
    hsnCode: '68042210',
    gstRate: 18,
    description: 'HSN: 68042210 | Supplier: Sumangal Sales Corp',
    isDeleted: false
  },
  {
    id: 'prod_pipe_wrench_1274_14',
    name: 'TAPARIA-PIPE WRENCH NO.1274-14',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 450,
    purchasePrice: 307.44,
    currentStock: 5,
    lowStockThreshold: 2,
    hsnCode: '82041220',
    gstRate: 18,
    description: 'HSN: 82041220 | Heavy Duty Pipe Wrench 14 inch | Supplier: V V Enterprises',
    isDeleted: false
  },
  {
    id: 'prod_t_socket_tsw8',
    name: 'TAPARIA-T SOCKET WRENCHS TSW8',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 180,
    purchasePrice: 120.78,
    currentStock: 5,
    lowStockThreshold: 2,
    hsnCode: '82042000',
    gstRate: 18,
    description: 'HSN: 82042000 | T-Socket Wrench 8mm | Supplier: V V Enterprises',
    isDeleted: false
  },
  {
    id: 'prod_air_gun_ag02',
    name: 'AIR GUN MODEL NO. AG-02 - 100MM LONG NOZZLE',
    category: 'Power Tools',
    unit: 'Piece',
    sellingPrice: 150,
    purchasePrice: 98.4,
    currentStock: 4,
    lowStockThreshold: 2,
    hsnCode: '84818090',
    gstRate: 18,
    description: 'HSN: 84818090 | Air Gun 100mm Nozzle | Supplier: V V Enterprises',
    isDeleted: false
  },
  {
    id: 'prod_cut_off_wheel_100x1x16',
    name: '4" CUT OFF WHEEL 100 X 1 X 16 GREEN (FLEXOVIT)',
    category: 'Power Tools',
    unit: 'Piece',
    sellingPrice: 15,
    purchasePrice: 8.7,
    currentStock: 150,
    lowStockThreshold: 25,
    hsnCode: '68042210',
    gstRate: 18,
    description: 'HSN: 68042210 | 4 inch Cutting Wheel | Supplier: Sumangal Sales Corp',
    isDeleted: false
  },
  {
    id: 'prod_hammer_drill_bit_6x160',
    name: 'HAMMER DRILL BITS 6 X 160 (BOSCH SDS PLUS-1)',
    category: 'Power Tools',
    unit: 'Piece',
    sellingPrice: 85,
    purchasePrice: 53.0,
    currentStock: 20,
    lowStockThreshold: 5,
    hsnCode: '82075050',
    gstRate: 18,
    description: 'HSN: 82075050 | Bosch SDS Plus 6x160mm Drill Bit | Supplier: Sumangal Sales Corp',
    isDeleted: false
  },
  {
    id: 'prod_wd40_63g',
    name: 'WD-40 MULTI USE SPRAY 63.8GM',
    category: 'Paints & Adhesives',
    unit: 'Piece',
    sellingPrice: 120,
    purchasePrice: 77.0,
    currentStock: 30,
    lowStockThreshold: 6,
    hsnCode: '34039900',
    gstRate: 18,
    description: 'HSN: 34039900 | Rust Remover and Lubricant Spray | Supplier: Sumangal Sales Corp',
    isDeleted: false
  },
  {
    id: 'prod_taparia_screw_driver_812',
    name: 'TAPARIA-SCREW DRIVERS NO.812',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 90,
    purchasePrice: 56.64,
    currentStock: 10,
    lowStockThreshold: 3,
    hsnCode: '82054000',
    gstRate: 18,
    description: 'HSN: 82054000 | Flat Head Screwdriver No. 812 | Supplier: V V Enterprises',
    isDeleted: false
  },
  {
    id: 'prod_teflon_tape_12mm',
    name: 'CHAMPION PTFE THREAD SEAL TAPE 12MM',
    category: 'Plumbing & Pipes',
    unit: 'Roll',
    sellingPrice: 20,
    purchasePrice: 10.5,
    currentStock: 100,
    lowStockThreshold: 15,
    hsnCode: '39191000',
    gstRate: 18,
    description: 'HSN: 39191000 | Teflon Thread Seal Tape for Plumbing',
    isDeleted: false
  },
  {
    id: 'prod_safety_goggles_clear',
    name: 'INDUSTRIAL SAFETY GOGGLES (CLEAR EYE PROTECTOR)',
    category: 'Safety Equipment',
    unit: 'Piece',
    sellingPrice: 65,
    purchasePrice: 38.0,
    currentStock: 25,
    lowStockThreshold: 5,
    hsnCode: '90049090',
    gstRate: 18,
    description: 'HSN: 90049090 | Anti-dust Clear Safety Glasses',
    isDeleted: false
  }
];

const PURCHASES = [
  {
    id: 'pur_sumangal_2627_119',
    invoiceNumber: '2627/119',
    supplierName: 'Sumangal Sales Corp',
    supplierGstin: '27AAMFS4969A1ZN',
    date: '2026-09-22',
    items: [
      {
        productId: 'prod_mounted_point_a11',
        productName: 'A-11 PINK MOUNTED POINT',
        quantity: 200,
        unitPrice: 12.5,
        hsnCode: '68042210',
        gstRate: 18,
        total: 2500,
      },
      {
        productId: 'prod_cut_off_wheel_100x1x16',
        productName: '4" CUT OFF WHEEL 100 X 1 X 16 GREEN (FLEXOVIT)',
        quantity: 150,
        unitPrice: 8.7,
        hsnCode: '68042210',
        gstRate: 18,
        total: 1305,
      }
    ],
    taxableAmount: 3805,
    cgstAmount: 342.45,
    sgstAmount: 342.45,
    igstAmount: 0,
    totalTaxAmount: 684.9,
    roundOff: 0.1,
    grandTotal: 4490,
    paymentStatus: 'paid',
    notes: 'Sumangal Sales Corp Hardware Tools Consignment'
  },
  {
    id: 'pur_vv_ent_1110',
    invoiceNumber: '1110',
    supplierName: 'V V Enterprises',
    supplierGstin: '27AALFV5108C1ZD',
    date: '2026-09-07',
    items: [
      {
        productId: 'prod_pipe_wrench_1274_14',
        productName: 'TAPARIA-PIPE WRENCH NO.1274-14',
        quantity: 5,
        unitPrice: 307.44,
        hsnCode: '82041220',
        gstRate: 18,
        total: 1537.2,
      },
      {
        productId: 'prod_air_gun_ag02',
        productName: 'AIR GUN MODEL NO. AG-02 - 100MM LONG NOZZLE',
        quantity: 4,
        unitPrice: 98.4,
        hsnCode: '84818090',
        gstRate: 18,
        total: 393.6,
      }
    ],
    taxableAmount: 1930.8,
    cgstAmount: 173.77,
    sgstAmount: 173.77,
    igstAmount: 0,
    totalTaxAmount: 347.54,
    roundOff: -0.34,
    grandTotal: 2278,
    paymentStatus: 'paid',
    notes: 'Taparia Hand & Air Tools Invoice'
  }
];

const CUSTOMERS = [
  {
    id: 'cust_walk_in',
    name: 'Counter / Walk-in Customer',
    nameMr: 'काउंटर / रोख ग्राहक',
    contact: '+91 99999 99999',
    address: 'Sangli, Maharashtra',
    totalPurchases: 0,
    outstandingBalance: 0,
    creditLimit: 50000,
    isDeleted: false,
  },
  {
    id: 'cust_patil_auto',
    name: 'Patil Auto Works',
    nameMr: 'पाटील ऑटो वर्क्स',
    contact: '+91 98220 12345',
    address: 'MIDC Kupwad, Sangli',
    gstin: '27ABCDE1234F1Z5',
    totalPurchases: 12500,
    outstandingBalance: 2500,
    creditLimit: 25000,
    isDeleted: false,
  },
  {
    id: 'cust_shree_fabricators',
    name: 'Shree Fabricators & Hardware',
    nameMr: 'श्री फॅब्रिकेटर्स आणि हार्डवेअर',
    contact: '+91 94230 67890',
    address: 'Station Road, Miraj',
    gstin: '27XYZAB5678C1Z2',
    totalPurchases: 28400,
    outstandingBalance: 0,
    creditLimit: 50000,
    isDeleted: false,
  }
];

async function seedData() {
  console.log(`Starting data migration to Firebase Firestore for project: ${firebaseConfig.projectId}...`);

  try {
    // 1. Seed Settings
    console.log('1. Uploading Shop Settings...');
    const settingsRef = doc(db, `shops/${SHOP_ID}/settings/general`);
    await setDoc(settingsRef, {
      ...DEFAULT_SHOP_SETTINGS,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('   ✓ Shop Settings uploaded successfully.');

    // 2. Seed Products
    console.log(`2. Uploading ${PRODUCTS.length} Products...`);
    const batch = writeBatch(db);
    for (const prod of PRODUCTS) {
      const prodRef = doc(db, `shops/${SHOP_ID}/products/${prod.id}`);
      batch.set(prodRef, {
        ...prod,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
    console.log('   ✓ Products uploaded successfully.');

    // 3. Seed Purchases
    console.log(`3. Uploading ${PURCHASES.length} Purchases...`);
    const purBatch = writeBatch(db);
    for (const pur of PURCHASES) {
      const purRef = doc(db, `shops/${SHOP_ID}/purchases/${pur.id}`);
      purBatch.set(purRef, {
        ...pur,
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
    await purBatch.commit();
    console.log('   ✓ Purchases uploaded successfully.');

    // 4. Seed Customers
    console.log(`4. Uploading ${CUSTOMERS.length} Customers...`);
    const custBatch = writeBatch(db);
    for (const cust of CUSTOMERS) {
      const custRef = doc(db, `shops/${SHOP_ID}/customers/${cust.id}`);
      custBatch.set(custRef, {
        ...cust,
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
    await custBatch.commit();
    console.log('   ✓ Customers uploaded successfully.');

    console.log('\n=============================================');
    console.log('🎉 ALL DATA SUCCESSFULLY UPLOADED TO FIREBASE!');
    console.log('=============================================');
  } catch (error) {
    console.error('\n❌ Data migration encountered an error:');
    console.error(error);
  }
}

seedData();
