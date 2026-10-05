import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  isAlert?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  iconBgColor = 'bg-amber-100/80',
  iconTextColor = 'text-amber-800',
  onClick,
  badge,
  isAlert = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white p-5 border transition-all duration-200 ${
        isAlert
          ? 'border-amber-400 ring-2 ring-amber-200/60 shadow-sm'
          : 'border-amber-200/60 shadow-xs hover:border-amber-300 hover:shadow-md'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
            {badge && <span>{badge}</span>}
          </div>
          {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
        </div>
        <div
          className={`p-3 rounded-xl shrink-0 ${iconBgColor} ${iconTextColor} shadow-xs`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
