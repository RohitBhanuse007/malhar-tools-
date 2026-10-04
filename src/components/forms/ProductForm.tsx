import React, { useState, useEffect } from 'react';
import { Product, ShopSettings } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { validateProduct } from '../../utils/validators';

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  shopSettings?: ShopSettings | null;
  isLoading?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  shopSettings,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  const defaultUnits = shopSettings?.customUnits || [
    'Piece', 'Box', 'Kg', 'Meter', 'Set', 'Pair', 'Roll', 'Packet'
  ];

  const defaultCategories = shopSettings?.customCategories || [
    'Hand Tools', 'Power Tools', 'Fasteners & Screws', 'Plumbing & Pipes',
    'Electricals', 'Paints & Adhesives', 'Safety Equipment', 'Hardware Fittings'
  ];

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || defaultCategories[0] || 'Hand Tools',
    unit: initialData?.unit || defaultUnits[0] || 'Piece',
    sellingPrice: initialData?.sellingPrice !== undefined ? String(initialData.sellingPrice) : '',
    purchasePrice: initialData?.purchasePrice !== undefined ? String(initialData.purchasePrice) : '',
    currentStock: initialData?.currentStock !== undefined ? String(initialData.currentStock) : '0',
    lowStockThreshold:
      initialData?.lowStockThreshold !== undefined
        ? String(initialData.lowStockThreshold)
        : String(shopSettings?.defaultLowStockThreshold || 5),
    description: initialData?.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        category: initialData.category,
        unit: initialData.unit,
        sellingPrice: String(initialData.sellingPrice),
        purchasePrice: String(initialData.purchasePrice),
        currentStock: String(initialData.currentStock),
        lowStockThreshold: String(initialData.lowStockThreshold),
        description: initialData.description || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateProduct({
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      sellingPrice: formData.sellingPrice,
      purchasePrice: formData.purchasePrice,
      currentStock: formData.currentStock,
      lowStockThreshold: formData.lowStockThreshold,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    await onSubmit({
      name: formData.name.trim(),
      category: formData.category.trim(),
      unit: formData.unit.trim(),
      sellingPrice: Number(formData.sellingPrice),
      purchasePrice: Number(formData.purchasePrice),
      currentStock: Number(formData.currentStock),
      lowStockThreshold: Number(formData.lowStockThreshold),
      description: formData.description.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Name */}
      <Input
        label={t('products.name')}
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g. Hammer 500g / हातोडी ५०० ग्रॅम"
        error={errors.name}
        required
      />

      {/* Category and Unit Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t('products.category')}
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={defaultCategories}
          error={errors.category}
          required
        />

        <Select
          label={t('products.unit')}
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          options={defaultUnits}
          error={errors.unit}
          required
        />
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('products.sellingPrice')}
          name="sellingPrice"
          type="number"
          step="any"
          min="0"
          value={formData.sellingPrice}
          onChange={handleChange}
          placeholder="0.00"
          leftAddon="₹"
          error={errors.sellingPrice}
          required
        />

        <Input
          label={t('products.purchasePrice')}
          name="purchasePrice"
          type="number"
          step="any"
          min="0"
          value={formData.purchasePrice}
          onChange={handleChange}
          placeholder="0.00"
          leftAddon="₹"
          error={errors.purchasePrice}
          required
        />
      </div>

      {/* Stock and Threshold Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('products.currentStock')}
          name="currentStock"
          type="number"
          step="1"
          min="0"
          value={formData.currentStock}
          onChange={handleChange}
          placeholder="0"
          error={errors.currentStock}
          disabled={Boolean(initialData)} // In edit mode, stock updates are performed via Purchases or Sales for consistency
          helperText={initialData ? 'Stock changes are recorded via Purchases and Sales' : undefined}
          required
        />

        <Input
          label={t('products.lowStockThreshold')}
          name="lowStockThreshold"
          type="number"
          step="1"
          min="0"
          value={formData.lowStockThreshold}
          onChange={handleChange}
          placeholder="5"
          error={errors.lowStockThreshold}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {t('products.description')} ({t('common.optional')})
        </label>
        <textarea
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Brand, size, specification or storage rack location..."
          className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 placeholder:text-slate-400"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};
