import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShopSettings } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  shopSettings?: ShopSettings | null;
  pageTitle: string;
  pageSubtitle?: string;
  onQuickAction?: (action: 'product' | 'purchase' | 'sale') => void;
  lowStockCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  onNavigate,
  shopSettings,
  pageTitle,
  pageSubtitle,
  onQuickAction,
  lowStockCount = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { logout } = useAuth();
  const { t } = useLanguage();

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      setIsLogoutModalOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-faint-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        shopSettings={shopSettings}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        lowStockCount={lowStockCount}
      />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          onQuickAction={onQuickAction}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Logout confirmation dialog */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        title={t('auth.logout')}
        message={t('auth.logoutConfirm')}
        confirmLabel={t('auth.logout')}
        variant="danger"
      />
    </div>
  );
};
