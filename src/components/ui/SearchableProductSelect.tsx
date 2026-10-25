import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Package, AlertCircle, AlertTriangle } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

export interface SearchableProductSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  mode?: 'purchase' | 'sale' | 'general';
  className?: string;
  id?: string;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  products,
  value,
  onChange,
  placeholder,
  mode = 'general',
  className = '',
  id,
}) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'product-search-select');

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === value);
  }, [products, value]);

  // Search and filter products
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const terms = searchTerm.toLowerCase().trim().split(/\s+/);
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const category = (p.category || '').toLowerCase();
      const hsn = (p.hsnCode || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();

      // Every term typed must be found in at least one field
      return terms.every(
        (term) =>
          name.includes(term) ||
          category.includes(term) ||
          hsn.includes(term) ||
          desc.includes(term)
      );
    });
  }, [products, searchTerm]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const idx = filteredProducts.findIndex((p) => p.id === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Keep highlighted item visible in scroll view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (product: Product) => {
    onChange(product.id);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 < filteredProducts.length ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredProducts.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const defaultPlaceholder =
    placeholder || (language === 'mr' ? 'उत्पादन निवडा...' : 'Select a product...');

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full text-left rounded-xl border transition-all py-2.5 px-3.5 bg-white shadow-xs flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : error
            ? 'border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-rose-200'
            : isOpen
            ? 'border-brand-500 ring-2 ring-brand-200 shadow-md'
            : 'border-slate-300 text-slate-900 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              selectedProduct
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Package className="w-4 h-4" />
          </div>

          {selectedProduct ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-950 text-sm truncate">
                  {selectedProduct.name}
                </span>
                {selectedProduct.category && (
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {selectedProduct.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span
                  className={`font-semibold ${
                    selectedProduct.currentStock <= 0
                      ? 'text-rose-600'
                      : selectedProduct.currentStock <= (selectedProduct.lowStockThreshold || 5)
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {language === 'mr' ? 'स्टॉक' : 'Stock'}: {selectedProduct.currentStock}{' '}
                  {selectedProduct.unit}
                </span>

                <span className="text-slate-300">•</span>

                <span className="font-mono font-bold text-slate-800">
                  {mode === 'purchase'
                    ? `${language === 'mr' ? 'खरेदी दर' : 'Buy'}: ${formatCurrency(
                        selectedProduct.purchasePrice || 0
                      )}`
                    : `${language === 'mr' ? 'विक्री दर' : 'Price'}: ${formatCurrency(
                        selectedProduct.sellingPrice || 0
                      )}`}
                </span>

                {selectedProduct.hsnCode && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      HSN: {selectedProduct.hsnCode}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-400 truncate">
              {defaultPlaceholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 hidden sm:inline-block">
            {language === 'mr' ? 'शोधा' : 'Search'}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 text-slate-500 ${
              isOpen ? 'rotate-180 text-brand-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Helper text or Error */}
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500 font-medium">{helperText}</p>
      ) : null}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-300/80 overflow-hidden backdrop-blur-xs flex flex-col animate-in fade-in zoom-in-95 duration-100"
          style={{ maxHeight: '340px' }}
        >
          {/* Search Header */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === 'mr'
                    ? 'उत्पादन नाव, श्रेणी, HSN द्वारे शोधा...'
                    : 'Type product name, category, or HSN code...'
                }
                className="w-full bg-white pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results count & Quick indicator */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1">
              <span>
                {language === 'mr'
                  ? `दाखवत आहे: ${filteredProducts.length} पैकी ${products.length} उत्पादने`
                  : `Showing ${filteredProducts.length} of ${products.length} products`}
              </span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-brand-600 hover:underline text-[10px] font-bold"
                >
                  {language === 'mr' ? 'सर्व दाखवा' : 'Show All'}
                </button>
              )}
            </div>
          </div>

          {/* Product Items List */}
          <ul
            ref={listRef}
            className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-60"
            role="listbox"
          >
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, index) => {
                const isSelected = p.id === value;
                const isHighlighted = index === highlightedIndex;
                const isOutOfStock = p.currentStock <= 0;
                const isLowStock = p.currentStock <= (p.lowStockThreshold || 5);

                return (
                  <li
                    key={p.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 text-left ${
                      isSelected
                        ? 'bg-amber-50/90 text-amber-950 font-bold border-l-4 border-amber-500'
                        : isHighlighted
                        ? 'bg-slate-100/90 text-slate-900 border-l-4 border-slate-400'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {p.name}
                        </span>
                        {p.category && (
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                            {p.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                        {/* Stock status badge */}
                        <span
                          className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isOutOfStock ? (
                            <>
                              <AlertCircle className="w-2.5 h-2.5" />
                              {language === 'mr' ? 'स्टॉक संपला' : 'Out of Stock'} (0 {p.unit})
                            </>
                          ) : isLowStock ? (
                            <>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {language === 'mr' ? 'कमी स्टॉक' : 'Low Stock'}: {p.currentStock}{' '}
                              {p.unit}
                            </>
                          ) : (
                            <>
                              {language === 'mr' ? 'स्टॉक' : 'Stock'}: {p.currentStock} {p.unit}
                            </>
                          )}
                        </span>

                        <span className="text-slate-300">•</span>

                        {/* Price */}
                        <span className="font-mono font-bold text-slate-700">
                          {mode === 'purchase'
                            ? `Buy: ${formatCurrency(p.purchasePrice || 0)}`
                            : `Price: ${formatCurrency(p.sellingPrice || 0)}`}
                        </span>

                        {p.hsnCode && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-500 text-[10px]">
                              HSN: {p.hsnCode}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Checkmark indicator */}
                    <div className="shrink-0 flex items-center">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="p-6 text-center text-slate-500 space-y-2">
                <Package className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">
                  {language === 'mr'
                    ? `"${searchTerm}" शी जुळणारे कोणतेही उत्पादन आढळले नाही.`
                    : `No products found matching "${searchTerm}".`}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  {language === 'mr' ? 'सर्व उत्पादने पहा' : 'View all products'}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
