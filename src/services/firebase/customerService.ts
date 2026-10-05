import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, SHOP_ID, isFirebaseConfigured } from './config';
import { Customer, CustomerPayment } from '../../types';

const CUSTOMERS_COLLECTION = `shops/${SHOP_ID}/customers`;
const PAYMENTS_COLLECTION = `shops/${SHOP_ID}/payments`;
const LOCAL_CUSTOMERS_KEY = 'malhar_tools_customers';
const LOCAL_PAYMENTS_KEY = 'malhar_tools_customer_payments';

function getLocalCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomers(items: Customer[]): void {
  localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(items));
}

function getLocalPayments(): CustomerPayment[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPayments(items: CustomerPayment[]): void {
  localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(items));
}

export async function getCustomers(): Promise<Customer[]> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const q = query(collection(firestore, CUSTOMERS_COLLECTION), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    } catch {
      const snapshot = await getDocs(collection(firestore, CUSTOMERS_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    }
  }

  return getLocalCustomers();
}

export async function createCustomer(data: {
  name: string;
  contactNumber: string;
  address?: string;
  initialDues?: number;
  notes?: string;
}): Promise<string> {
  const initialDues = Number(data.initialDues) || 0;
  const firestore = db;

  if (isFirebaseConfigured() && firestore) {
    const docRef = await addDoc(collection(firestore, CUSTOMERS_COLLECTION), {
      name: data.name,
      contactNumber: data.contactNumber,
      address: data.address || '',
      totalPurchaseAmount: initialDues,
      totalPaid: 0,
      remainingBalance: initialDues,
      notes: data.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  const customers = getLocalCustomers();
  const newCustomer: Customer = {
    id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: data.name,
    contactNumber: data.contactNumber,
    address: data.address || '',
    totalPurchaseAmount: initialDues,
    totalPaid: 0,
    remainingBalance: initialDues,
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  customers.push(newCustomer);
  saveLocalCustomers(customers);
  return newCustomer.id;
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const docRef = doc(firestore, CUSTOMERS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const customers = getLocalCustomers();
  const index = customers.findIndex(c => c.id === id);
  if (index !== -1) {
    customers[index] = {
      ...customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveLocalCustomers(customers);
  }
}

export async function recordCustomerPayment(paymentData: {
  customerId: string;
  amount: number;
  paymentDate: string;
  paymentMode: CustomerPayment['paymentMode'];
  reference?: string;
  notes?: string;
}): Promise<string> {
  const amount = Number(paymentData.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    let newPaymentId = '';

    await runTransaction(firestore, async (transaction) => {
      const custRef = doc(firestore, CUSTOMERS_COLLECTION, paymentData.customerId);
      const custDoc = await transaction.get(custRef);

      if (!custDoc.exists()) {
        throw new Error('Customer account not found.');
      }

      const customer = custDoc.data() as Customer;
      const currentRemaining = Number(customer.remainingBalance) || 0;

      if (amount > currentRemaining) {
        throw new Error(
          `Payment amount (₹${amount}) cannot exceed remaining balance (₹${currentRemaining}).`
        );
      }

      const newRemaining = Math.max(0, currentRemaining - amount);
      const newPaid = (Number(customer.totalPaid) || 0) + amount;

      // Update customer balance
      transaction.update(custRef, {
        remainingBalance: newRemaining,
        totalPaid: newPaid,
        updatedAt: serverTimestamp(),
      });

      // Insert payment record
      const payRef = doc(collection(firestore, PAYMENTS_COLLECTION));
      newPaymentId = payRef.id;

      transaction.set(payRef, {
        customerId: paymentData.customerId,
        customerName: customer.name,
        amount,
        paymentDate: paymentData.paymentDate,
        paymentMode: paymentData.paymentMode,
        reference: paymentData.reference || '',
        notes: paymentData.notes || '',
        createdAt: serverTimestamp(),
      });
    });

    return newPaymentId;
  }

  // Local persistent transaction fallback
  const customers = getLocalCustomers();
  const index = customers.findIndex(c => c.id === paymentData.customerId);
  if (index === -1) {
    throw new Error('Customer account not found.');
  }

  const customer = customers[index];
  const currentRemaining = Number(customer.remainingBalance) || 0;
  if (amount > currentRemaining) {
    throw new Error(
      `Payment amount (₹${amount}) cannot exceed remaining balance (₹${currentRemaining}).`
    );
  }

  const newRemaining = Math.max(0, currentRemaining - amount);
  customers[index].remainingBalance = newRemaining;
  customers[index].totalPaid = (Number(customer.totalPaid) || 0) + amount;
  customers[index].updatedAt = new Date().toISOString();
  saveLocalCustomers(customers);

  const payments = getLocalPayments();
  const newPayment: CustomerPayment = {
    id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    customerId: paymentData.customerId,
    customerName: customer.name,
    amount,
    paymentDate: paymentData.paymentDate,
    paymentMode: paymentData.paymentMode,
    reference: paymentData.reference || '',
    notes: paymentData.notes || '',
    createdAt: new Date().toISOString(),
  };

  payments.unshift(newPayment);
  saveLocalPayments(payments);
  return newPayment.id;
}

export async function getCustomerPayments(customerId?: string): Promise<CustomerPayment[]> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      let q = query(collection(firestore, PAYMENTS_COLLECTION), orderBy('createdAt', 'desc'));
      if (customerId) {
        q = query(
          collection(firestore, PAYMENTS_COLLECTION),
          where('customerId', '==', customerId),
          orderBy('createdAt', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerPayment));
    } catch {
      const snapshot = await getDocs(collection(firestore, PAYMENTS_COLLECTION));
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerPayment));
      return customerId ? items.filter(p => p.customerId === customerId) : items;
    }
  }

  const payments = getLocalPayments();
  return customerId ? payments.filter(p => p.customerId === customerId) : payments;
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void): () => void {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const q = collection(firestore, CUSTOMERS_COLLECTION);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      callback(items);
    });
    return unsubscribe;
  }

  let lastCustRaw = '';
  const poll = () => {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY) || '';
    if (raw !== lastCustRaw) {
      lastCustRaw = raw;
      callback(getLocalCustomers());
    }
  };
  poll();
  const interval = setInterval(poll, 1500);
  return () => clearInterval(interval);
}

export function subscribeToCustomerPayments(
  customerId: string | undefined,
  callback: (payments: CustomerPayment[]) => void
): () => void {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const q = collection(firestore, PAYMENTS_COLLECTION);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerPayment));
      if (customerId) {
        items = items.filter(p => p.customerId === customerId);
      }
      callback(items);
    });
    return unsubscribe;
  }

  let lastPayRaw = '';
  const poll = () => {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY) || '';
    if (raw !== lastPayRaw) {
      lastPayRaw = raw;
      const items = getLocalPayments();
      callback(customerId ? items.filter(p => p.customerId === customerId) : items);
    }
  };
  poll();
  const interval = setInterval(poll, 1500);
  return () => clearInterval(interval);
}
