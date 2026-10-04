import React from 'react';
import { StockStatus, PaymentStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StockBadge: React.FC<{ status: StockStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const { t } = useLanguage();

  if (status === 'out_of_stock') {
    return (
      <Badge variant="danger" className={`font-semibold ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
        {t('products.outOfStock')}
      </Badge>
    );
  }

  if (status === 'low_stock') {
    return (
      <Badge variant="warning" className={`font-semibold ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
        {t('products.lowStock')}
      </Badge>
    );
  }

  return (
    <Badge variant="success" className={`font-semibold ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
      {t('products.inStock')}
    </Badge>
  );
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const { t } = useLanguage();

  if (status === 'paid') {
    return <Badge variant="success" className={className}>{t('purchases.statusPaid')}</Badge>;
  }
  if (status === 'partial') {
    return <Badge variant="warning" className={className}>{t('purchases.statusPartial')}</Badge>;
  }
  return <Badge variant="danger" className={className}>{t('purchases.statusPending')}</Badge>;
};
