import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  AlertTriangle,
  LogOut,
  Wrench,
  Globe,
  Database
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ShopSettings } from '../../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  shopSettings?: ShopSettings | null;
  onLogoutClick: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  shopSettings,
  onLogoutClick,
  isOpenMobile,
  onCloseMobile,
  lowStockCount = 0,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { isFirebaseConnected } = useAuth();

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'products', label: t('nav.products'), icon: Boxes },
    { id: 'purchases', label: t('nav.purchases'), icon: Truck },
    { id: 'sales', label: t('nav.sales'), icon: ShoppingCart },
    { id: 'customers', label: t('nav.customers'), icon: Users },
    { 
      id: 'alerts', 
      label: t('nav.alerts'), 
      icon: AlertTriangle,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'reports', label: t('nav.reports'), icon: BarChart3 },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const shopDisplayName = language === 'mr' && shopSettings?.shopNameMr
    ? shopSettings.shopNameMr
    : shopSettings?.shopName || 'Malhar Tools';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 flex items-center justify-center text-slate-950 shadow-md shrink-0">
          {shopSettings?.logoUrl ? (
            <img
              src={shopSettings.logoUrl}
              alt="Logo"
              className="w-10 h-10 rounded-xl object-contain p-1"
            />
          ) : (
            <Wrench className="w-5 h-5 text-slate-950" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-white text-base truncate tracking-tight">
            {shopDisplayName}
          </h1>
          <p className="text-xs text-slate-400 truncate">
            {t('common.shopSubtitle')}
          </p>
        </div>
      </div>

      {/* Database Status indicator */}
      <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Database className="w-3.5 h-3.5" />
          <span>Firebase</span>
        </span>
        <span
          className={`px-2 py-0.5 rounded-full font-medium text-[11px] flex items-center gap-1 ${
            isFirebaseConnected
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
              : 'bg-amber-950 text-amber-300 border border-amber-800/60'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          {isFirebaseConnected ? 'Connected' : 'Offline Mode'}
        </span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors text-left group ${
                isActive
                  ? 'bg-brand-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-amber-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-300'
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    isActive
                      ? 'bg-slate-950 text-brand-300'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Language Switcher Footer & Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {/* Language switch */}
        <div className="bg-slate-800/80 p-1.5 rounded-xl flex items-center border border-slate-700/60">
          <div className="flex items-center gap-1.5 px-2 text-xs text-slate-400 shrink-0">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div className="grid grid-cols-2 gap-1 w-full text-xs font-semibold">
            <button
              onClick={() => setLanguage('en')}
              className={`py-1.5 rounded-lg transition-all text-center ${
                language === 'en'
                  ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('mr')}
              className={`py-1.5 rounded-lg transition-all text-center ${
                language === 'mr'
                  ? 'bg-brand-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              मराठी
            </button>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogoutClick}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>{t('auth.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
