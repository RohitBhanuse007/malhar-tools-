import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Truck,
  ShoppingCart,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Product, ShopSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StockBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProductForm } from '../../components/forms/ProductForm';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, determineStockStatus } from '../../utils/formatters';

interface ProductsPageProps {
  products: Product[];
  onAddProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onEditProduct: (id: string, data: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onQuickPurchase: (productId: string) => void;
  onQuickSale: (productId: string) => void;
  shopSettings?: ShopSettings | null;
  isOpenAddModalExternal?: boolean;
  onCloseAddModalExternal?: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onQuickPurchase,
  onQuickSale,
  shopSettings,
  isOpenAddModalExternal = false,
  onCloseAddModalExternal,
}) => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync external add modal trigger if opened from Header/Dashboard
  const showAddModal = isAddModalOpen || isOpenAddModalExternal;
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    if (onCloseAddModalExternal) onCloseAddModalExternal();
  };

  // Unique categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory ? p.category === selectedCategory : true;

      const status = determineStockStatus(p.currentStock, p.lowStockThreshold);
      const matchesStatus = selectedStatus ? status === selectedStatus : true;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const handleCreate = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      await onAddProduct(data);
      success(t('products.createSuccess'));
      handleCloseAddModal();
    } catch (err: any) {
      toastError(err.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingProduct) return;
    setIsSubmitting(true);
    try {
      await onEditProduct(editingProduct.id, data);
      success(t('products.updateSuccess'));
      setEditingProduct(null);
    } catch (err: any) {
      toastError(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProductId) return;
    setIsSubmitting(true);
    try {
      await onDeleteProduct(deletingProductId);
      success(t('products.deleteSuccess'));
      setDeletingProductId(null);
    } catch (err: any) {
      toastError(err.message || 'Failed to delete product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('products.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('products.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
          className="shadow-sm shadow-brand-600/30"
        >
          {t('products.addProduct')}
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder={t('products.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftAddon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-44 text-xs font-medium py-2.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">{t('products.allCategories')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-40 text-xs font-medium py-2.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">{t('products.allStatuses')}</option>
            <option value="in_stock">{t('products.inStock')}</option>
            <option value="low_stock">{t('products.lowStock')}</option>
            <option value="out_of_stock">{t('products.outOfStock')}</option>
          </select>

          {(searchTerm || selectedCategory || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                setSelectedStatus('');
              }}
              className="text-xs shrink-0"
            >
              {t('common.reset')}
            </Button>
          )}
        </div>
      </div>

      {/* Products Content: Table on Desktop, Cards on Mobile */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Boxes className="w-8 h-8" />}
          title={t('products.emptyTitle')}
          description={
            searchTerm || selectedCategory || selectedStatus
              ? 'No products matched your search or filters.'
              : t('products.emptySub')
          }
          actionLabel={t('products.addProduct')}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">{t('products.name')}</th>
                    <th className="py-3.5 px-4">{t('products.category')}</th>
                    <th className="py-3.5 px-4">{t('products.unit')}</th>
                    <th className="py-3.5 px-4 text-right">{t('products.purchasePrice')}</th>
                    <th className="py-3.5 px-4 text-right">{t('products.sellingPrice')}</th>
                    <th className="py-3.5 px-4 text-center">{t('products.currentStock')}</th>
                    <th className="py-3.5 px-4">{t('products.stockStatus')}</th>
                    <th className="py-3.5 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredProducts.map((p) => {
                    const status = determineStockStatus(p.currentStock, p.lowStockThreshold);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div>
                            <span>{p.name}</span>
                            {p.description && (
                              <p className="text-xs text-slate-400 font-normal truncate max-w-xs">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">{p.unit}</td>
                        <td className="py-3.5 px-4 text-right text-slate-600 font-mono text-xs">
                          {formatCurrency(p.purchasePrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-xs">
                          {formatCurrency(p.sellingPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold font-mono ${
                              p.currentStock <= 0
                                ? 'text-rose-600'
                                : p.currentStock <= p.lowStockThreshold
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {p.currentStock}
                          </span>
                          <span className="text-slate-400 text-xs ml-1 font-normal">
                            (min: {p.lowStockThreshold})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StockBadge status={status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onQuickPurchase(p.id)}
                              title={t('dashboard.addPurchase')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onQuickSale(p.id)}
                              title={t('dashboard.addSale')}
                              disabled={p.currentStock <= 0}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingProduct(p)}
                              title={t('common.edit')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingProductId(p.id)}
                              title={t('common.delete')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map((p) => {
              const status = determineStockStatus(p.currentStock, p.lowStockThreshold);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                      <span className="text-[11px] text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-100 inline-block mt-1">
                        {p.category} • {p.unit}
                      </span>
                    </div>
                    <StockBadge status={status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        {t('products.sellingPrice')}
                      </span>
                      <span className="font-bold text-slate-900">{formatCurrency(p.sellingPrice)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        {t('products.purchasePrice')}
                      </span>
                      <span className="font-medium text-slate-600">{formatCurrency(p.purchasePrice)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        {t('products.currentStock')}
                      </span>
                      <span className="font-bold text-slate-900">{p.currentStock} {p.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Truck className="w-3.5 h-3.5 text-blue-600" />}
                        onClick={() => onQuickPurchase(p.id)}
                      >
                        +Stock
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                        onClick={() => onQuickSale(p.id)}
                        disabled={p.currentStock <= 0}
                      >
                        Sell
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingProductId(p.id)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title={t('products.addProduct')}
        subtitle="Add a new hardware item or tool to inventory"
      >
        <ProductForm
          onSubmit={handleCreate}
          onCancel={handleCloseAddModal}
          shopSettings={shopSettings}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        title={t('products.editProduct')}
        subtitle={editingProduct?.name}
      >
        {editingProduct && (
          <ProductForm
            initialData={editingProduct}
            onSubmit={handleUpdate}
            onCancel={() => setEditingProduct(null)}
            shopSettings={shopSettings}
            isLoading={isSubmitting}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingProductId)}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common.confirmDelete')}
        message={t('common.confirmDeleteSubtext')}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
};
