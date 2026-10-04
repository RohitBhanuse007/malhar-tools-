import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}> = ({ size = 'md', label, className = '' }) => {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-brand-600 animate-spin`} />
      <span className="text-sm font-medium text-slate-500">
        {label || t('common.loading')}
      </span>
    </div>
  );
};
