# Malhar Tools | मल्हार टूल्स – Shop Management Web App

A simple, clean, professional, and user-friendly Shop Management Web Application built specifically for **Malhar Tools** (hardware and tools shop).

Designed for the shop owner with bilingual support (**English & Marathi**), atomic inventory calculations, installment customer payment tracking, stock alerts, printable reports, and ready for deployment to **Vercel** with **Firebase** authentication and Firestore database.

---

## 🌟 Key Features

### 1. 🔐 Authentication (Firebase Auth)
- Secure email and password login for the shop owner.
- Protected routes and redirection.
- Session persistence and secure logout with confirmation dialog.
- Informative error handling (invalid credentials, network issues).

### 2. 📊 Dashboard Overview
- Instant business overview with zero clutter:
  - **Total Products** & Total Stock Units across all items.
  - **Today's Sales Revenue** & Transaction count.
  - **Today's Purchases** & Stock-In arrivals.
  - **Pending Customer Dues (उधारी)**.
  - **Low Stock** and **Out of Stock** alert indicators.
- Quick actions: Add Product, Record Purchase, Record Sale, Check Dues.
- Recent sales and supplier purchase feeds.

### 3. 📦 Products & Inventory Management
- Add, Edit, and Delete products with confirmation.
- **Historical preservation**: Soft delete mechanism ensures past sales and purchase receipts never break when a product is removed.
- Fields: Name, Category, Unit (Piece, Box, Kg, Meter, Set, Pair, etc.), Purchase Price, Selling Price, Current Stock, Low Stock Alert Threshold, Notes.
- Search by product name or category, filter by stock status (*In Stock*, *Low Stock*, *Out of Stock*).
- Touch-friendly responsive cards on mobile, clean table on desktop.

### 4. 🚚 Purchases / Stock In (Supplier Inflow)
- Record supplier stock arrivals.
- Fields: Product, Quantity, Purchase Price, Total Amount, Date, Supplier Name, Supplier Contact, Payment Status, Notes.
- **Atomic Stock Increase**: Product stock automatically increments in inventory upon saving.
- Complete audit trail created in the `stockMovements` collection.

### 5. 🛒 Daily Sales & Counter Checkout
- Fast counter sale entry with live calculation.
- Fields: Product, Quantity, Selling Price, Date, Payment Mode (Cash, UPI, Bank Transfer, Cheque), Customer Name, Notes.
- **Strict Stock Safety**: Validation prevents selling more than available stock (`"Insufficient stock available"` / `"अपुरा स्टॉक उपलब्ध आहे"`).
- **Atomic Stock Deduction**: Automatically decreases stock.
- **Credit / Partial Payment**: Option to link directly to a customer account for credit sales, automatically logging down-payments and tracking remaining balances.

### 6. 👥 Customer Payments & Installments (खाते व उधारी)
- Customer profile with contact, address, total purchases, total paid, and remaining balance.
- **Installment Recording**: Add installment payments (Payment 1, 2, 3...) with live remaining balance recalculation.
- **Overpayment Guard**: Prevents paying more than the remaining balance owed.
- Full payment history list with payment mode, date, and receipt references.
- Dedicated filter for customers with pending balances.

### 7. ⚠️ Stock Alerts & Print Order Sheet
- **Low Stock**: Current Stock $\le$ Threshold.
- **Out of Stock**: Current Stock $= 0$.
- Dedicated lists with 1-click **Print Order Sheet** for supplier restocking.

### 8. 📈 Comprehensive Reports & Print
- Reports included:
  1. Daily Sales Report
  2. Sales History
  3. Purchase History
  4. Stock Movement Audit Trail
  5. Pending Customer Dues Report
  6. Low Stock Products
  7. Out of Stock Products
- Filterable by date range and specific product.
- Browser print-ready formatting (hides UI navigation and buttons for clean printouts).

### 9. 🌐 Bilingual Support (English | मराठी)
- Fast language switch (`English` / `मराठी`) in header and sidebar.
- Persisted user language preference.
- All forms, validation messages, empty states, confirmation dialogs, and reports are fully localized.

### 10. ⚙️ Shop & Application Settings
- Manage configurable Shop Name (English & Marathi), Address, Contact, Email, Logo URL.
- Application preferences: Default Low Stock Threshold, Custom extensible units and categories.
- Stored configurably in Firebase Firestore (`shops/malhar-tools/settings/general`).

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React Icons
- **Database & Auth**: Google Firebase (Firestore Transactions + Firebase Authentication)
- **Deployment**: Vercel (SPA routing configured in `vercel.json`)
- **Typography**: Inter + Google Noto Sans Devanagari

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Installation
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

> **Note**: If Firebase credentials are not yet entered, the app gracefully operates in local development mode so you can test all features, stock math, and transactions immediately.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build
```bash
npm run build
```

---

## 🔒 Firebase Security Rules

Deploy the included `firestore.rules` file to your Firebase console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shops/{shopId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ☁️ Vercel Deployment

1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project** and select this repository.
3. In **Environment Variables**, add the `VITE_FIREBASE_*` variables from your `.env` file.
4. Click **Deploy**. The included `vercel.json` ensures all client-side routes rewrite properly to `index.html`.
