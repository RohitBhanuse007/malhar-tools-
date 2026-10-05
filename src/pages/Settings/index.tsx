import React, { useState, useEffect } from 'react';
import { Settings, Store, Sliders, Save, Database, Info, CheckCircle2 } from 'lucide-react';
import { ShopSettings } from '../../types';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { firebaseConfig, isFirebaseConfigured } from '../../services/firebase/config';

interface SettingsPageProps {
  settings: ShopSettings;
  onSaveSettings: (settings: Partial<ShopSettings>) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const { success, error: toastError } = useToast();
  const { isFirebaseConnected } = useAuth();

  const [activeTab, setActiveTab] = useState<'shop' | 'app' | 'firebase'>('shop');
  const [formData, setFormData] = useState<ShopSettings>(settings);
  const [unitsInput, setUnitsInput] = useState((settings.customUnits || []).join(', '));
  const [categoriesInput, setCategoriesInput] = useState((settings.customCategories || []).join(', '));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(settings);
    setUnitsInput((settings.customUnits || []).join(', '));
    setCategoriesInput((settings.customCategories || []).join(', '));
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedUnits = unitsInput
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);

      const parsedCategories = categoriesInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await onSaveSettings({
        ...formData,
        defaultLowStockThreshold: Number(formData.defaultLowStockThreshold) || 5,
        customUnits: parsedUnits.length > 0 ? parsedUnits : formData.customUnits,
        customCategories: parsedCategories.length > 0 ? parsedCategories : formData.customCategories,
      });

      if (formData.defaultLanguage !== language) {
        setLanguage(formData.defaultLanguage);
      }

      success(t('settings.saveSuccess'));
    } catch (err: any) {
      toastError(err.message || t('settings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-amber-200/60">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'shop'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{t('settings.shopInfoTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('app')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'app'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{t('settings.appPrefsTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('firebase')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'firebase'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Firebase Connection</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Shop Information */}
        {activeTab === 'shop' && (
          <Card>
            <CardHeader
              title={t('settings.shopInfoTab')}
              subtitle="This information appears on printable receipts and invoices"
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t('settings.shopName')}
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  placeholder="Malhar Tools"
                  required
                />

                <Input
                  label={t('settings.shopNameMr')}
                  name="shopNameMr"
                  value={formData.shopNameMr || ''}
                  onChange={handleChange}
                  placeholder="मल्हार टूल्स"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t('settings.contactNumber')}
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="+91 98..."
                  required
                />

                <Input
                  label={t('settings.email')}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="owner@malhartools.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('settings.address')}
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                  placeholder="Full shop address..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('settings.logoUrl')}
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-black border border-amber-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    <img
                      src={formData.logoUrl || '/logo.png'}
                      alt="Brand Logo Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <Input
                      name="logoUrl"
                      value={formData.logoUrl || ''}
                      onChange={handleChange}
                      placeholder="/logo.png or https://..."
                      helperText="Official Malhar Tools logo is configured as default (/logo.png)"
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Tab 2: Application Preferences */}
        {activeTab === 'app' && (
          <Card>
            <CardHeader
              title={t('settings.appPrefsTab')}
              subtitle="Default configurations for inventory and UI"
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t('settings.defaultLanguage')}
                  </label>
                  <select
                    name="defaultLanguage"
                    value={formData.defaultLanguage}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3.5 text-sm bg-white"
                  >
                    <option value="en">English</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>

                <Input
                  label={t('settings.defaultLowStockThreshold')}
                  type="number"
                  name="defaultLowStockThreshold"
                  min="1"
                  value={formData.defaultLowStockThreshold}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('settings.customUnits')}
                </label>
                <textarea
                  rows={2}
                  value={unitsInput}
                  onChange={(e) => setUnitsInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                  placeholder="Piece, Box, Kg, Meter, Set, Pair, Roll..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Separate unit names by commas. These appear when adding or editing products.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('settings.customCategories')}
                </label>
                <textarea
                  rows={2}
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                  className="w-full rounded-lg border border-amber-200/80 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                  placeholder="Hand Tools, Power Tools, Fasteners, Plumbing..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Separate category names by commas.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Tab 3: Firebase Connection Status & Setup */}
        {activeTab === 'firebase' && (
          <Card>
            <CardHeader
              title="Firebase Configuration & Security"
              subtitle="Overview of database connection and security rules"
            />
            <CardBody className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isFirebaseConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {isFirebaseConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">
                    {isFirebaseConnected
                      ? 'Live Firebase Firestore & Auth Active'
                      : 'Running in Local Storage Mode (Ready for Firebase)'}
                  </h4>
                  <p className="text-xs leading-relaxed">
                    {isFirebaseConnected
                      ? `Connected to Project: ${firebaseConfig.projectId}. Authentication and atomic Firestore transactions are operational.`
                      : 'To connect your live Firebase project, paste your Firebase config in the .env file in the project root directory, or deploy to Vercel with Environment Variables set.'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-200 space-y-2">
                <p className="text-slate-400 font-sans font-semibold">
                  Required Environment Variables (.env / Vercel):
                </p>
                <div className="text-emerald-400 select-all">
                  VITE_FIREBASE_API_KEY=AIzaSy...<br />
                  VITE_FIREBASE_AUTH_DOMAIN=malhar-tools.firebaseapp.com<br />
                  VITE_FIREBASE_PROJECT_ID=malhar-tools<br />
                  VITE_FIREBASE_STORAGE_BUCKET=malhar-tools.appspot.com<br />
                  VITE_FIREBASE_MESSAGING_SENDER_ID=...<br />
                  VITE_FIREBASE_APP_ID=1:...<br />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Security Rules:</span>{' '}
                Production security rules have been written in <code className="bg-white px-1.5 py-0.5 rounded border">firestore.rules</code> protecting all shop data so only authenticated owners can read/write.
              </div>
            </CardBody>
          </Card>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            isLoading={isSaving}
            className="shadow-sm shadow-amber-500/20"
          >
            {t('common.save')} {t('nav.settings')}
          </Button>
        </div>
      </form>
    </div>
  );
};
