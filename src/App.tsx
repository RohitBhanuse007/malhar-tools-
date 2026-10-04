import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ProductsPage } from './pages/Products';
import { PurchasesPage } from './pages/Purchases';
import { SalesPage } from './pages/Sales';
import { CustomersPage } from './pages/Customers';
import { AlertsPage } from './pages/Alerts';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { Spinner } from './components/ui/Spinner';

// Services
import {
  subscribeToProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './services/firebase/productService';
import { subscribeToPurchases, createPurchase } from './services/firebase/purchaseService';
import { subscribeToSales, createSale, CreateSaleInput } from './services/firebase/saleService';
import {
  subscribeToCustomers,
  subscribeToCustomerPayments,
  createCustomer,
  recordCustomerPayment,
} from './services/firebase/customerService';
import { subscribeToStockMovements } from './services/firebase/stockMovementService';
import {
  subscribeToShopSettings,
  updateShopSettings,
  DEFAULT_SHOP_SETTINGS,
} from './services/firebase/settingsService';

// Types
import {
  Product,
  Purchase,
  Sale,
  Customer,
  CustomerPayment,
  StockMovement,
  ShopSettings,
} from './types';
import { Wrench } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  // Real-time states
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);

  // Quick Action Modal states triggered across pages
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [preselectedProductId, setPreselectedProductId] = useState<string | undefined>(undefined);

  // Subscribe to real-time updates when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubs = [
      subscribeToProducts(setProducts),
      subscribeToPurchases(setPurchases),
      subscribeToSales(setSales),
      subscribeToCustomers(setCustomers),
      subscribeToCustomerPayments(undefined, setCustomerPayments),
      subscribeToStockMovements(setStockMovements),
      subscribeToShopSettings((settings) => {
        setShopSettings(settings);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub && unsub());
    };
  }, [isAuthenticated]);

  // Loading screen during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-xl mb-4 animate-bounce">
          <Wrench className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          {language === 'mr' ? 'मल्हार टूल्स' : 'Malhar Tools'}
        </h2>
        <Spinner size="md" label={t('auth.authChecking')} className="text-white" />
      </div>
    );
  }

  // Unauthenticated user -> Login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Quick action dispatcher
  const handleQuickAction = (action: 'product' | 'purchase' | 'sale') => {
    setPreselectedProductId(undefined);
    if (action === 'product') {
      setCurrentPage('products');
      setIsAddProductOpen(true);
    } else if (action === 'purchase') {
      setCurrentPage('purchases');
      setIsAddPurchaseOpen(true);
    } else if (action === 'sale') {
      setCurrentPage('sales');
      setIsAddSaleOpen(true);
    }
  };

  const handleQuickPurchase = (productId: string) => {
    setPreselectedProductId(productId);
    setCurrentPage('purchases');
    setIsAddPurchaseOpen(true);
  };

  const handleQuickSale = (productId: string) => {
    setPreselectedProductId(productId);
    setCurrentPage('sales');
    setIsAddSaleOpen(true);
  };

  // Low stock counter for alert pill
  const lowStockCount = products.filter(
    (p) => p.currentStock <= p.lowStockThreshold
  ).length;

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return t('nav.dashboard');
      case 'products':
        return t('nav.products');
      case 'purchases':
        return t('nav.purchases');
      case 'sales':
        return t('nav.sales');
      case 'customers':
        return t('nav.customers');
      case 'alerts':
        return t('nav.alerts');
      case 'reports':
        return t('nav.reports');
      case 'settings':
        return t('nav.settings');
      default:
        return 'Malhar Tools';
    }
  };

  const getPageSubtitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return t('dashboard.subtitle');
      case 'products':
        return t('products.subtitle');
      case 'purchases':
        return t('purchases.subtitle');
      case 'sales':
        return t('sales.subtitle');
      case 'customers':
        return t('customers.subtitle');
      case 'alerts':
        return t('alerts.subtitle');
      case 'reports':
        return t('reports.subtitle');
      case 'settings':
        return t('settings.subtitle');
      default:
        return undefined;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      shopSettings={shopSettings}
      pageTitle={getPageTitle()}
      pageSubtitle={getPageSubtitle()}
      onQuickAction={handleQuickAction}
      lowStockCount={lowStockCount}
    >
      {currentPage === 'dashboard' && (
        <DashboardPage
          products={products}
          purchases={purchases}
          sales={sales}
          customers={customers}
          shopSettings={shopSettings}
          onNavigate={setCurrentPage}
          onOpenAddProduct={() => handleQuickAction('product')}
          onOpenAddPurchase={() => handleQuickAction('purchase')}
          onOpenAddSale={() => handleQuickAction('sale')}
        />
      )}

      {currentPage === 'products' && (
        <ProductsPage
          products={products}
          onAddProduct={async (data) => {
            await createProduct(data);
          }}
          onEditProduct={async (id, data) => {
            await updateProduct(id, data);
          }}
          onDeleteProduct={async (id) => {
            await deleteProduct(id);
          }}
          onQuickPurchase={handleQuickPurchase}
          onQuickSale={handleQuickSale}
          shopSettings={shopSettings}
          isOpenAddModalExternal={isAddProductOpen}
          onCloseAddModalExternal={() => setIsAddProductOpen(false)}
        />
      )}

      {currentPage === 'purchases' && (
        <PurchasesPage
          purchases={purchases}
          products={products}
          onAddPurchase={async (data) => {
            await createPurchase(data);
          }}
          isOpenAddModalExternal={isAddPurchaseOpen}
          onCloseAddModalExternal={() => setIsAddPurchaseOpen(false)}
          preselectedProductId={preselectedProductId}
        />
      )}

      {currentPage === 'sales' && (
        <SalesPage
          sales={sales}
          products={products}
          customers={customers}
          onAddSale={async (data: CreateSaleInput) => {
            await createSale(data);
          }}
          isOpenAddModalExternal={isAddSaleOpen}
          onCloseAddModalExternal={() => setIsAddSaleOpen(false)}
          preselectedProductId={preselectedProductId}
        />
      )}

      {currentPage === 'customers' && (
        <CustomersPage
          customers={customers}
          customerPayments={customerPayments}
          onCreateCustomer={async (data) => {
            await createCustomer(data);
          }}
          onRecordPayment={async (data) => {
            await recordCustomerPayment(data);
          }}
        />
      )}

      {currentPage === 'alerts' && (
        <AlertsPage
          products={products}
          shopSettings={shopSettings}
          onQuickPurchase={handleQuickPurchase}
        />
      )}

      {currentPage === 'reports' && (
        <ReportsPage
          products={products}
          purchases={purchases}
          sales={sales}
          customers={customers}
          stockMovements={stockMovements}
          shopSettings={shopSettings}
        />
      )}

      {currentPage === 'settings' && (
        <SettingsPage
          settings={shopSettings}
          onSaveSettings={async (updated) => {
            await updateShopSettings(updated);
          }}
        />
      )}
    </Layout>
  );
};
