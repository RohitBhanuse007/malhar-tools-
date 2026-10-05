import React from 'react';
import { Menu, Globe, Plus, ShoppingCart, Truck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  pageTitle: string;
  pageSubtitle?: string;
  onQuickAction?: (action: 'product' | 'purchase' | 'sale') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  pageTitle,
  pageSubtitle,
  onQuickAction,
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-20 bg-faint-50/95 backdrop-blur-md border-b border-amber-200/60 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left section: mobile hamburger + titles */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate tracking-tight">
            {pageTitle}
          </h2>
          {pageSubtitle && (
            <p className="text-xs text-slate-500 hidden sm:block truncate mt-0.5">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right section: Quick actions + language pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onQuickAction && (
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5 text-amber-700" />}
              onClick={() => onQuickAction('product')}
            >
              {t('dashboard.addProduct')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Truck className="w-3.5 h-3.5 text-amber-800" />}
              onClick={() => onQuickAction('purchase')}
            >
              {t('dashboard.addPurchase')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShoppingCart className="w-3.5 h-3.5 text-slate-950" />}
              onClick={() => onQuickAction('sale')}
            >
              {t('dashboard.addSale')}
            </Button>
          </div>
        )}

        {/* Quick language toggle pill */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200/80 hover:bg-amber-100/60 text-slate-800 bg-white/80 transition-colors shadow-2xs"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-amber-600" />
          <span>{language === 'en' ? 'मराठी' : 'English'}</span>
        </button>
      </div>
    </header>
  );
};
