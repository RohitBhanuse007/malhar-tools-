import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Sliders,
  Save,
  Database,
  Info,
  CheckCircle2,
  Type,
  Palette,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  ZoomIn,
  CloudUpload,
  Upload,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { uploadAllCurrentDataToFirebase } from '../../services/firebase/syncService';
import {
  ShopSettings,
  FontSettings,
  FontFamilyOption,
  FontSizeOption,
  FontWeightOption,
} from '../../types';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  useTheme,
  PRESET_COLORS,
  FONT_FAMILY_STACKS,
  FONT_SIZES,
} from '../../context/ThemeContext';
import { DEFAULT_FONT_SETTINGS } from '../../services/firebase/settingsService';
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
  const { fontSettings, setFontSettings, updateFontSettings, resetFontSettings } = useTheme();

  const [activeTab, setActiveTab] = useState<'shop' | 'app' | 'appearance' | 'firebase'>('shop');
  const [formData, setFormData] = useState<ShopSettings>(settings);
  const [pendingFont, setPendingFont] = useState<FontSettings>(settings.fontSettings || fontSettings);
  const [unitsInput, setUnitsInput] = useState((settings.customUnits || []).join(', '));
  const [categoriesInput, setCategoriesInput] = useState((settings.customCategories || []).join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncToFirebase = async () => {
    setIsSyncingData(true);
    setSyncStatus('Connecting to Firebase and initiating data upload...');
    try {
      const result = await uploadAllCurrentDataToFirebase((p) => {
        setSyncStatus(p.step);
      });
      success(`Successfully uploaded ${result.productsCount} products, ${result.purchasesCount} purchases, and shop settings to Firebase!`);
      setSyncStatus(`Completed! ${result.productsCount} products, ${result.purchasesCount} purchases, and shop configuration uploaded.`);
    } catch (err: any) {
      console.error('Firebase sync error:', err);
      let errorMsg = err.message || 'Failed to upload data to Firebase.';
      if (err.message && err.message.includes('Cloud Firestore API has not been used')) {
        errorMsg = 'Cloud Firestore is not yet enabled in your Firebase Console. Please click "Create database" in Firebase Console first.';
      }
      toastError(errorMsg);
      setSyncStatus(`Error: ${errorMsg}`);
    } finally {
      setIsSyncingData(false);
    }
  };

  useEffect(() => {
    setFormData(settings);
    setUnitsInput((settings.customUnits || []).join(', '));
    setCategoriesInput((settings.customCategories || []).join(', '));
    if (settings.fontSettings) {
      setPendingFont(settings.fontSettings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFontChange = (partial: Partial<FontSettings>) => {
    const updated = { ...pendingFont, ...partial };
    setPendingFont(updated);
    // Apply live to DOM immediately for live interactive preview
    updateFontSettings(updated);
  };

  const handleResetFont = async () => {
    setPendingFont(DEFAULT_FONT_SETTINGS);
    resetFontSettings();
    try {
      await onSaveSettings({
        ...formData,
        fontSettings: DEFAULT_FONT_SETTINGS,
      });
      success(t('settings.appearanceReset'));
    } catch (err: any) {
      toastError(err.message || 'Failed to reset font settings.');
    }
  };

  const handleSaveFontSettings = async () => {
    setIsSaving(true);
    try {
      setFontSettings(pendingFont);
      await onSaveSettings({
        ...formData,
        fontSettings: pendingFont,
      });
      success(t('settings.appearanceSaved'));
    } catch (err: any) {
      toastError(err.message || t('settings.saveError'));
    } finally {
      setIsSaving(false);
    }
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
        fontSettings: pendingFont,
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

  const fontFamilies: { id: FontFamilyOption; label: string; desc: string; sample: string }[] = [
    {
      id: 'Inter',
      label: 'Inter',
      desc: 'Modern, highly balanced & readable',
      sample: 'Aa मल्हार 123',
    },
    {
      id: 'Poppins',
      label: 'Poppins',
      desc: 'Geometric, friendly & stylish',
      sample: 'Aa मल्हार 123',
    },
    {
      id: 'Roboto',
      label: 'Roboto',
      desc: 'Google classic, clean industrial font',
      sample: 'Aa मल्हार 123',
    },
    {
      id: 'Arial',
      label: 'Arial',
      desc: 'Universal standard system typography',
      sample: 'Aa मल्हार 123',
    },
  ];

  const fontSizes: { id: FontSizeOption; label: string; desc: string; px: string }[] = [
    { id: 'sm', label: 'Small', desc: 'Compact layout & dense tables', px: '14.5px' },
    { id: 'md', label: 'Medium', desc: 'Recommended standard size', px: '16px' },
    { id: 'lg', label: 'Large', desc: 'Large, comfortable easy-reading', px: '18px' },
  ];

  const fontWeights: { id: FontWeightOption; label: string; desc: string; weightClass: string }[] = [
    { id: 'normal', label: 'Normal', desc: 'Regular standard thickness (400-500)', weightClass: 'font-normal' },
    { id: 'medium', label: 'Semi-Bold', desc: 'Crisp balanced contrast (500-600)', weightClass: 'font-medium' },
    { id: 'bold', label: 'Bold', desc: 'Heavy bold text throughout app (700-800)', weightClass: 'font-bold' },
  ];

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
      <div className="flex items-center gap-2 border-b border-amber-200/60 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
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
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'app'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{t('settings.appPrefsTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'appearance'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-600" />
          <span>{t('settings.appearanceTab')}</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full border border-amber-300">
            Custom
          </span>
        </button>

        <button
          onClick={() => setActiveTab('firebase')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all shrink-0 ${
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
                  placeholder="+91 9270693111"
                  required
                />

                <Input
                  label={language === 'mr' ? 'दुसरा संपर्क नंबर (पर्यायी)' : 'Secondary Contact Number (Optional)'}
                  name="secondaryContactNumber"
                  value={formData.secondaryContactNumber || ''}
                  onChange={handleChange}
                  placeholder="+91 9172978555"
                />
              </div>

              <div>
                <Input
                  label={t('settings.email')}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="bhanusedarshan@gmail.com"
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

              {/* Quick shortcut to Font & Appearance tab */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-amber-700" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Font & Appearance Customization
                    </h4>
                    <p className="text-xs text-amber-800">
                      Customize font family, font size, text boldness, and global colors in the dedicated tab.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('appearance')}
                >
                  Configure Font
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Tab 3: Font & Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* 1. Font Family */}
            <Card>
              <CardHeader
                title={t('settings.fontFamily')}
                subtitle="Select the primary typography style for the entire application (English & Marathi)"
              />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {fontFamilies.map((font) => {
                    const isSelected = pendingFont.fontFamily === font.id;
                    const fontStyleMap: Record<FontFamilyOption, string> = {
                      Inter: "'Inter', sans-serif",
                      Poppins: "'Poppins', sans-serif",
                      Roboto: "'Roboto', sans-serif",
                      Arial: "Arial, sans-serif",
                    };
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => handleFontChange({ fontFamily: font.id })}
                        style={{ fontFamily: fontStyleMap[font.id] }}
                        className={`p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                            : 'border-slate-200 hover:border-amber-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-base text-slate-900 block">
                              {font.label}
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5 font-normal">
                              {font.desc}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>{font.sample}</span>
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-100/60 px-1.5 py-0.5 rounded">
                            Preview
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {/* 2. Font Size & Boldness */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Size */}
              <Card>
                <CardHeader
                  title={t('settings.fontSize')}
                  subtitle="Scale the overall base font size across all modules and tables"
                />
                <CardBody>
                  <div className="grid grid-cols-3 gap-2.5">
                    {fontSizes.map((size) => {
                      const isSelected = pendingFont.fontSize === size.id;
                      return (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => handleFontChange({ fontSize: size.id })}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-sm'
                              : 'border-slate-200 hover:border-amber-300 bg-white text-slate-700'
                          }`}
                        >
                          <span className="text-xs font-bold block mb-1">
                            {size.label}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {size.px}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Proportionally scales headings, buttons, inputs, and table data while preserving layout proportions.
                  </p>
                </CardBody>
              </Card>

              {/* Boldness / Weight */}
              <Card>
                <CardHeader
                  title={t('settings.fontWeight')}
                  subtitle="Adjust font thickness and weight for strong visual presence"
                />
                <CardBody>
                  <div className="grid grid-cols-3 gap-2.5">
                    {fontWeights.map((weight) => {
                      const isSelected = pendingFont.fontWeight === weight.id;
                      return (
                        <button
                          key={weight.id}
                          type="button"
                          onClick={() => handleFontChange({ fontWeight: weight.id })}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-sm'
                              : 'border-slate-200 hover:border-amber-300 bg-white text-slate-700'
                          }`}
                        >
                          <span className={`text-xs block mb-1 ${weight.weightClass}`}>
                            {weight.label}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {weight.id === 'bold' ? 'High Impact' : weight.id === 'medium' ? 'Balanced' : 'Light'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Choose <strong>Bold</strong> to make all text prominently bold and readable across all screens.
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* 3. Font Color */}
            <Card>
              <CardHeader
                title={t('settings.fontColor')}
                subtitle="Choose a preset text color or specify a custom hex color code"
              />
              <CardBody className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {t('settings.presetColors')}
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {PRESET_COLORS.map((preset) => {
                      const isSelected = pendingFont.fontColor.toLowerCase() === preset.color.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleFontChange({ fontColor: preset.color })}
                          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.color }}
                          />
                          <span className="text-xs font-bold text-slate-800">
                            {preset.label}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-amber-700 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Picker */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {t('settings.customColor')} (Color Picker & Hex)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={pendingFont.fontColor || '#0f172a'}
                        onChange={(e) => handleFontChange({ fontColor: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border-2 border-slate-300 p-0.5 bg-white shadow-2xs"
                      />
                    </div>
                    <div className="w-48">
                      <Input
                        value={pendingFont.fontColor}
                        onChange={(e) => handleFontChange({ fontColor: e.target.value })}
                        placeholder="#0f172a"
                      />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Optimized for Contrast</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 4. Interactive Live Preview */}
            <Card>
              <CardHeader
                title={t('settings.livePreview')}
                subtitle="Real-time preview of your selected typography, font weight, and color scheme"
              />
              <CardBody>
                <div
                  className="p-6 rounded-2xl border-2 border-amber-300/80 bg-faint-50 space-y-5 transition-all shadow-sm"
                  style={{
                    fontFamily: FONT_FAMILY_STACKS[pendingFont.fontFamily],
                    color: pendingFont.fontColor,
                  }}
                >
                  {/* Store Header Preview */}
                  <div className="flex items-center justify-between pb-4 border-b border-amber-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-black border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h2
                          className="text-lg sm:text-xl font-black tracking-tight"
                          style={{ color: pendingFont.fontColor }}
                        >
                          {language === 'mr' ? 'मल्हार टूल्स हार्डवेअर आणि स्पेअर्स' : 'MALHAR TOOLS HARDWARE & SPARES'}
                        </h2>
                        <p className="text-xs opacity-75 mt-0.5 font-medium">
                          GST Billing, Stock Inward/Outward & Daily Sales Management
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-400 text-slate-950">
                      Live Sample
                    </span>
                  </div>

                  {/* Sample KPI metric cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                      <span className="text-xs opacity-70 uppercase tracking-wider font-semibold block">
                        Today's Total Sales
                      </span>
                      <div
                        className="text-2xl font-black mt-1"
                        style={{ color: pendingFont.fontColor }}
                      >
                        ₹45,850.00
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold mt-1 inline-block">
                        ↑ 14 Counter Transactions
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                      <span className="text-xs opacity-70 uppercase tracking-wider font-semibold block">
                        Hardware Stock Items
                      </span>
                      <div
                        className="text-2xl font-black mt-1"
                        style={{ color: pendingFont.fontColor }}
                      >
                        265 Units
                      </div>
                      <span className="text-[11px] text-amber-800 font-bold mt-1 inline-block">
                        • 2 Items on Low Stock Alert
                      </span>
                    </div>
                  </div>

                  {/* Sample Table Row */}
                  <div className="bg-white rounded-xl border border-amber-200/80 overflow-hidden text-xs">
                    <div className="bg-amber-100/60 px-4 py-2 font-bold border-b border-amber-200/60 flex justify-between">
                      <span>Product & HSN Code</span>
                      <span>Stock & Selling Price</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold block text-sm">
                          4-Inch Heavy Cutting Wheel
                        </span>
                        <span className="opacity-70 text-[11px]">
                          HSN: 68042210 • Power Tool Spares
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm block">
                          ₹1,250.00
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          In Stock (150 Boxes)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sample Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      className="px-4 py-2 bg-brand-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                    >
                      + Record New Sale
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-white border border-amber-300 text-slate-800 font-bold text-xs rounded-xl shadow-2xs"
                    >
                      Print GST Tax Invoice
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Appearance Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border border-amber-200/80 rounded-2xl shadow-sm">
              <Button
                type="button"
                variant="outline"
                leftIcon={<RotateCcw className="w-4 h-4 text-slate-600" />}
                onClick={handleResetFont}
              >
                {t('settings.resetDefaults')}
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSaving}
                  onClick={handleSaveFontSettings}
                  className="shadow-sm shadow-amber-500/20"
                >
                  {t('settings.saveAppearance')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Firebase Connection Status & Setup */}
        {activeTab === 'firebase' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Firebase Configuration & Live Database"
                subtitle="Connected to your Google Firebase cloud project"
              />
              <CardBody className="space-y-5">
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
                        ? 'Connected to Project: malhar-tools'
                        : 'Running in Local Storage Mode (Ready for Firebase)'}
                    </h4>
                    <p className="text-xs leading-relaxed">
                      {isFirebaseConnected
                        ? `Firebase Client SDK is active for project ID "${firebaseConfig.projectId}". Storage Bucket: "${firebaseConfig.storageBucket}".`
                        : 'Please configure your Firebase credentials in .env.'}
                    </p>
                  </div>
                </div>

                {/* Upload Current Data to Firebase Card */}
                <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                        <CloudUpload className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Upload Current Data to Firebase
                        </h4>
                        <p className="text-xs text-slate-600">
                          Uploads all shop settings, products, purchases, and customers into Firestore.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleSyncToFirebase}
                      isLoading={isSyncingData}
                      leftIcon={<Upload className="w-4 h-4" />}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                    >
                      {isSyncingData ? 'Uploading Data...' : 'Upload Data to Firebase'}
                    </Button>
                  </div>

                  {syncStatus && (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-700 animate-fade-in flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{syncStatus}</span>
                    </div>
                  )}
                </div>

                {/* Setup Guidance for Firestore & Auth */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <span>Next Steps in Firebase Console (One-Time Setup):</span>
                  </h5>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                    <li>
                      Go to <b className="text-slate-800">Firebase Console → Firestore Database</b> and click <b className="text-emerald-700">"Create database"</b> (choose your closest region and Start in test mode or production mode).
                    </li>
                    <li>
                      Go to <b className="text-slate-800">Firebase Console → Authentication</b> and click <b className="text-emerald-700">"Get Started"</b>, then enable <b className="text-slate-800">Email/Password</b> and <b className="text-slate-800">Phone</b> providers.
                    </li>
                    <li>
                      Click the <b className="text-amber-700">"Upload Data to Firebase"</b> button above, or run <code className="bg-slate-200 px-1 rounded">node scripts/seedFirebase.mjs</code> in terminal to populate Firestore!
                    </li>
                  </ol>
                </div>

                {/* Environment Variables Reference */}
                <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-200 space-y-2">
                  <p className="text-slate-400 font-sans font-semibold">
                    Current Loaded Environment Configuration:
                  </p>
                  <div className="text-emerald-400 select-all space-y-1">
                    <div>VITE_FIREBASE_PROJECT_ID={firebaseConfig.projectId}</div>
                    <div>VITE_FIREBASE_AUTH_DOMAIN={firebaseConfig.authDomain}</div>
                    <div>VITE_FIREBASE_STORAGE_BUCKET={firebaseConfig.storageBucket}</div>
                    <div>VITE_FIREBASE_APP_ID={firebaseConfig.appId}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Global Save button for shop and app tabs */}
        {activeTab !== 'appearance' && (
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={isSaving}
              className="bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] font-black shadow-md shadow-[#F4C430]/20"
            >
              {t('common.save')} {t('nav.settings')}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
