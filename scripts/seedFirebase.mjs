import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

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
const auth = getAuth(app);

const SHOP_ID = 'malhar-tools';

export const SHOP_SETTINGS = {
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
  invoiceTerms: '1. Goods once sold will not be taken back without original invoice. 2. Warranty/guarantee as per manufacturer terms. 3. Subject to Sangli jurisdiction.',
  fontSettings: {
    fontFamily: 'Inter',
    fontSize: 'md',
    fontWeight: 'medium',
    fontColor: '#0f172a'
  }
};

export const ALL_PRODUCTS = [
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
    description: 'HSN: 68042210 | Supplier: Sumangal Sales Corp (Inv: 2627/119)',
    isDeleted: false,
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
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
    isDeleted: false,
    createdAt: '2026-09-07T11:00:00.000Z',
    updatedAt: '2026-09-07T11:00:00.000Z',
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
    isDeleted: false,
    createdAt: '2026-09-07T11:00:00.000Z',
    updatedAt: '2026-09-07T11:00:00.000Z',
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
    hsnCode: '84879000',
    gstRate: 18,
    description: 'HSN: 84879000 | Pneumatic Air Blow Gun 100mm | Supplier: Bhide Yantra Loha',
    isDeleted: false,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'prod_de_spanner_dep12',
    name: 'TAPARIA-D/E SPANNER SET NO. DEP 12 (12 PC)',
    category: 'Hand Tools',
    unit: 'Set',
    sellingPrice: 850,
    purchasePrice: 594.75,
    currentStock: 1,
    lowStockThreshold: 1,
    hsnCode: '82041110',
    gstRate: 18,
    description: 'HSN: 82041110 | Double Ended Spanner Set 12 Pcs | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_ring_spanner_1812',
    name: 'TAPARIA-RING SPANNER SET NO.1812 ( SET OF 12 PC)',
    category: 'Hand Tools',
    unit: 'Set',
    sellingPrice: 1800,
    purchasePrice: 1260.87,
    currentStock: 1,
    lowStockThreshold: 1,
    hsnCode: '82041110',
    gstRate: 18,
    description: 'HSN: 82041110 | Ring Spanner Set 12 Pcs | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_comb_spanner_cs11',
    name: 'TAPARIA-COMBINATION SPANNER CS11 - 11MM',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 40,
    purchasePrice: 25.62,
    currentStock: 5,
    lowStockThreshold: 2,
    hsnCode: '82041110',
    gstRate: 18,
    description: 'HSN: 82041110 | Combination Spanner 11mm | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_comb_spanner_cs10',
    name: 'TAPARIA-COMBINATION SPANNER CS10 - 10MM',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 40,
    purchasePrice: 25.01,
    currentStock: 5,
    lowStockThreshold: 2,
    hsnCode: '82041110',
    gstRate: 18,
    description: 'HSN: 82041110 | Combination Spanner 10mm | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_t_socket_tsw14',
    name: 'TAPARIA-T SOCKET WRENCHS TSW14',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 195,
    purchasePrice: 130.54,
    currentStock: 5,
    lowStockThreshold: 2,
    hsnCode: '82042000',
    gstRate: 18,
    description: 'HSN: 82042000 | T-Socket Wrench 14mm | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_t_socket_tsw11',
    name: 'TAPARIA-T SOCKET WRENCHS TSW11',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 190,
    purchasePrice: 127.49,
    currentStock: 5,
    lowStockThreshold: 2,
    hsnCode: '82042000',
    gstRate: 18,
    description: 'HSN: 82042000 | T-Socket Wrench 11mm | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_t_socket_tsw10',
    name: 'TAPARIA-T SOCKET WRENCHS TSW10',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 185,
    purchasePrice: 124.44,
    currentStock: 5,
    lowStockThreshold: 2,
    hsnCode: '82042000',
    gstRate: 18,
    description: 'HSN: 82042000 | T-Socket Wrench 10mm | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_c_clamp_1260_3',
    name: 'TAPARIA-C CLAMP NO.1260-3',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 390,
    purchasePrice: 270.84,
    currentStock: 2,
    lowStockThreshold: 1,
    hsnCode: '82057000',
    gstRate: 18,
    description: 'HSN: 82057000 | Heavy C-Clamp 3 inch | Supplier: V V Enterprises',
    isDeleted: false,
    createdAt: '2026-08-31T10:30:00.000Z',
    updatedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'prod_addison_drill_7',
    name: 'ADDISON-M2 HSS PSTD JS MAGIC SHINE 7.0',
    category: 'Hand Tools',
    unit: 'Piece',
    sellingPrice: 130,
    purchasePrice: 86.17,
    currentStock: 10,
    lowStockThreshold: 3,
    hsnCode: '82075000',
    gstRate: 18,
    description: 'HSN: 82075000 | High Speed Steel Drill Bit 7.0mm | Supplier: Bhide Yantra Loha',
    isDeleted: false,
    createdAt: '2026-08-17T09:30:00.000Z',
    updatedAt: '2026-08-17T09:30:00.000Z',
  },
  {
    id: 'prod_wd40_64gm',
    name: 'RUST PREVENTIVE WD40(64GM)',
    category: 'Paints & Adhesives',
    unit: 'Piece',
    sellingPrice: 150,
    purchasePrice: 114.8,
    currentStock: 12,
    lowStockThreshold: 4,
    hsnCode: '34031900',
    gstRate: 18,
    description: 'HSN: 34031900 | Rust Preventive Spray 64g Can | Supplier: Bhide Yantra Loha',
    isDeleted: false,
    createdAt: '2026-08-17T09:30:00.000Z',
    updatedAt: '2026-08-17T09:30:00.000Z',
  },
];

export const ALL_PURCHASES = [
  {
    id: 'pur_sumangal_01',
    productId: 'prod_mounted_point_a11',
    productName: 'A-11 PINK MOUNTED POINT',
    quantity: 200,
    purchasePrice: 12.5,
    totalAmount: 2500,
    date: '2026-09-22',
    supplierName: 'SUMANGAL SALES CORPORATION',
    supplierContact: '9765152388, 7219192578',
    paymentStatus: 'paid',
    notes: 'Invoice No: 2627/119 | Kolhapur | HSN: 68042210',
    createdAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'pur_vv_pipe_wrench',
    productId: 'prod_pipe_wrench_1274_14',
    productName: 'TAPARIA-PIPE WRENCH NO.1274-14',
    quantity: 5,
    purchasePrice: 307.44,
    totalAmount: 1537.2,
    date: '2026-09-07',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18304',
    createdAt: '2026-09-07T11:00:00.000Z',
  },
  {
    id: 'pur_vv_t_socket_8',
    productId: 'prod_t_socket_tsw8',
    productName: 'TAPARIA-T SOCKET WRENCHS TSW8',
    quantity: 5,
    purchasePrice: 120.78,
    totalAmount: 603.9,
    date: '2026-09-07',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18304',
    createdAt: '2026-09-07T11:00:00.000Z',
  },
  {
    id: 'pur_bhide_air_gun',
    productId: 'prod_air_gun_ag02',
    productName: 'AIR GUN MODEL NO. AG-02 - 100MM LONG NOZZLE',
    quantity: 4,
    purchasePrice: 98.4,
    totalAmount: 393.6,
    date: '2026-09-01',
    supplierName: 'BHIDE YANTRA LOHA VASTU KENDRA',
    supplierContact: 'Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice: 100mm Long Nozzle | HSN: 84879000',
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'pur_vv_spanner_dep12',
    productId: 'prod_de_spanner_dep12',
    productName: 'TAPARIA-D/E SPANNER SET NO. DEP 12 (12 PC)',
    quantity: 1,
    purchasePrice: 594.75,
    totalAmount: 594.75,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_vv_ring_1812',
    productId: 'prod_ring_spanner_1812',
    productName: 'TAPARIA-RING SPANNER SET NO.1812 ( SET OF 12 PC)',
    quantity: 1,
    purchasePrice: 1260.87,
    totalAmount: 1260.87,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_vv_comb_cs11',
    productId: 'prod_comb_spanner_cs11',
    productName: 'TAPARIA-COMBINATION SPANNER CS11 - 11MM',
    quantity: 5,
    purchasePrice: 25.62,
    totalAmount: 128.1,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_vv_comb_cs10',
    productId: 'prod_comb_spanner_cs10',
    productName: 'TAPARIA-COMBINATION SPANNER CS10 - 10MM',
    quantity: 5,
    purchasePrice: 25.01,
    totalAmount: 125.05,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_vv_tsw14',
    productId: 'prod_t_socket_tsw14',
    productName: 'TAPARIA-T SOCKET WRENCHS TSW14',
    quantity: 5,
    purchasePrice: 130.54,
    totalAmount: 652.7,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_vv_tsw11',
    productId: 'prod_t_socket_tsw11',
    productName: 'TAPARIA-T SOCKET WRENCHS TSW11',
    quantity: 5,
    purchasePrice: 127.49,
    totalAmount: 637.45,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_vv_tsw10',
    productId: 'prod_t_socket_tsw10',
    productName: 'TAPARIA-T SOCKET WRENCHS TSW10',
    quantity: 5,
    purchasePrice: 124.44,
    totalAmount: 622.2,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_vv_clamp_3',
    productId: 'prod_c_clamp_1260_3',
    productName: 'TAPARIA-C CLAMP NO.1260-3',
    quantity: 2,
    purchasePrice: 270.84,
    totalAmount: 541.68,
    date: '2026-08-31',
    supplierName: 'V V ENTERPRISES',
    supplierContact: '0233-2373220 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18179',
    createdAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'pur_bhide_drill_7',
    productId: 'prod_addison_drill_7',
    productName: 'ADDISON-M2 HSS PSTD JS MAGIC SHINE 7.0',
    quantity: 10,
    purchasePrice: 86.17,
    totalAmount: 861.72,
    date: '2026-08-17',
    supplierName: 'BHIDE YANTRA LOHA VASTU KENDRA',
    supplierContact: '9850880701 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18744',
    createdAt: '2026-08-17T09:30:00.000Z',
  },
  {
    id: 'pur_bhide_wd40',
    productId: 'prod_wd40_64gm',
    productName: 'RUST PREVENTIVE WD40(64GM)',
    quantity: 12,
    purchasePrice: 114.8,
    totalAmount: 1377.6,
    date: '2026-08-17',
    supplierName: 'BHIDE YANTRA LOHA VASTU KENDRA',
    supplierContact: '9850880701 / Sangli',
    paymentStatus: 'paid',
    notes: 'Invoice No: POS1/26/18744',
    createdAt: '2026-08-17T09:30:00.000Z',
  },
];

export const ALL_CUSTOMERS = [
  {
    id: 'cust_walk_in',
    name: 'Counter / Walk-in Customer (रोख ग्राहक)',
    contactNumber: '+91 99999 99999',
    address: 'Sangli, Maharashtra',
    totalPurchaseAmount: 0,
    totalPaid: 0,
    remainingBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust_patil_auto',
    name: 'Patil Auto Works (पाटील ऑटो वर्क्स)',
    contactNumber: '+91 98220 12345',
    address: 'MIDC Kupwad, Sangli',
    gstin: '27ABCDE1234F1Z5',
    totalPurchaseAmount: 12500,
    totalPaid: 10000,
    remainingBalance: 2500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust_shree_fabricators',
    name: 'Shree Fabricators & Hardware (श्री फॅब्रिकेटर्स)',
    contactNumber: '+91 94230 67890',
    address: 'Station Road, Miraj',
    gstin: '27XYZAB5678C1Z2',
    totalPurchaseAmount: 28400,
    totalPaid: 28400,
    remainingBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

async function seedData() {
  console.log(`\n======================================================`);
  console.log(`Connecting to Firebase project: ${firebaseConfig.projectId}...`);
  console.log(`======================================================\n`);

  // Attempt authentication so security rules (request.auth != null) are satisfied
  try {
    console.log('Authenticating as Malhar Tools Owner (owner@malhartools.com)...');
    try {
      await signInWithEmailAndPassword(auth, 'owner@malhartools.com', 'malhar123');
      console.log('✓ Successfully signed in to Firebase Auth.');
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, 'owner@malhartools.com', 'malhar123');
          console.log('✓ Successfully registered and signed in owner account.');
        } catch (createErr) {
          console.warn('Notice on user registration:', createErr.message);
        }
      } else {
        console.warn('Notice on sign in:', authErr.message);
      }
    }
  } catch (e) {
    console.warn('Auth wrapper notice:', e.message);
  }

  try {
    // 1. Seed Settings
    console.log('1. Uploading Shop Settings to "shops/malhar-tools/settings/general"...');
    const settingsRef = doc(db, `shops/${SHOP_ID}/settings/general`);
    await setDoc(settingsRef, {
      ...SHOP_SETTINGS,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('   ✓ Shop Settings uploaded successfully.');

    // 2. Seed Products
    console.log(`2. Uploading ${ALL_PRODUCTS.length} Products to "shops/malhar-tools/products"...`);
    const batch = writeBatch(db);
    for (const prod of ALL_PRODUCTS) {
      const prodRef = doc(db, `shops/${SHOP_ID}/products/${prod.id}`);
      batch.set(prodRef, {
        ...prod,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
    console.log(`   ✓ ${ALL_PRODUCTS.length} Products uploaded successfully.`);

    // 3. Seed Purchases
    console.log(`3. Uploading ${ALL_PURCHASES.length} Purchases to "shops/malhar-tools/purchases"...`);
    const purBatch = writeBatch(db);
    for (const pur of ALL_PURCHASES) {
      const purRef = doc(db, `shops/${SHOP_ID}/purchases/${pur.id}`);
      purBatch.set(purRef, {
        ...pur,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await purBatch.commit();
    console.log(`   ✓ ${ALL_PURCHASES.length} Purchases uploaded successfully.`);

    // 4. Seed Customers
    console.log(`4. Uploading ${ALL_CUSTOMERS.length} Customers to "shops/malhar-tools/customers"...`);
    const custBatch = writeBatch(db);
    for (const cust of ALL_CUSTOMERS) {
      const custRef = doc(db, `shops/${SHOP_ID}/customers/${cust.id}`);
      custBatch.set(custRef, {
        ...cust,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await custBatch.commit();
    console.log(`   ✓ ${ALL_CUSTOMERS.length} Customers uploaded successfully.`);

    console.log('\n======================================================');
    console.log('🎉 SUCCESS: ALL DATA WAS PUSHED TO FIRESTORE!');
    console.log(`- Shop Settings: Updated`);
    console.log(`- Products: ${ALL_PRODUCTS.length}`);
    console.log(`- Purchases: ${ALL_PURCHASES.length}`);
    console.log(`- Customers: ${ALL_CUSTOMERS.length}`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Data migration encountered an error:');
    console.error(error.message || error);
    process.exit(1);
  }
}

seedData();
