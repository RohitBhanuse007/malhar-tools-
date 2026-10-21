import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { resetOwnerPassword } from '../../services/firebase/authService';
import {
  Wrench,
  Globe,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Boxes,
  Receipt,
  Users,
  Database,
  ArrowRight,
  Loader2,
  Sparkles,
  KeyRound,
  X
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isFirebaseConnected } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { error: toastError, success: toastSuccess } = useToast();

  // Remember me from localStorage
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('malhar_tools_remember_me') === 'true';
  });

  const [email, setEmail] = useState(() => {
    return localStorage.getItem('malhar_tools_saved_email') || '';
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage(t('auth.invalidCredentials'));
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);

      // Save or remove remembered email
      if (rememberMe) {
        localStorage.setItem('malhar_tools_saved_email', email.trim());
        localStorage.setItem('malhar_tools_remember_me', 'true');
      } else {
        localStorage.removeItem('malhar_tools_saved_email');
        localStorage.setItem('malhar_tools_remember_me', 'false');
      }

      toastSuccess(t('auth.loginSuccess'));
    } catch (err: any) {
      console.error('Login failed:', err);
      let msg = t('auth.invalidCredentials');
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        msg = t('auth.invalidCredentials');
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toastError('Please enter your email address.');
      return;
    }

    setIsSendingReset(true);
    try {
      await resetOwnerPassword(forgotEmail.trim());
      toastSuccess(t('auth.resetEmailSent'));
      setIsForgotModalOpen(false);
      setForgotEmail('');
    } catch (err: any) {
      toastError(err.message || 'Failed to send password reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#20242B] flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      {/* Ambient Turmeric Lighting Gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#F4C430]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#F4C430]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher Pill (Float at Top Right) */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-30">
        <button
          onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#262B34]/90 backdrop-blur-md text-slate-200 hover:text-white border border-slate-700/80 hover:border-[#F4C430]/60 text-xs font-bold transition-all shadow-lg shadow-black/20"
          title="Switch Language / भाषा बदला"
        >
          <Globe className="w-3.5 h-3.5 text-[#F4C430]" />
          <span>{language === 'en' ? 'मराठी' : 'English'}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* LEFT SIDE: INDUSTRIAL BRANDING & SHOWCASE (Desktop)       */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-gradient-to-br from-[#262B34] via-[#20242B] to-[#171A20] border-r border-slate-800/80">
        {/* Subtle Industrial Geometric Mesh Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#F4C430_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top: Logo & Estd Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#171A20] border-2 border-[#F4C430]/60 p-1.5 flex items-center justify-center shrink-0 shadow-xl shadow-black/40">
              <img
                src="/logo.png"
                alt="Malhar Tools Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#F4C430] tracking-tight uppercase">
                  MALHAR
                </span>
                <span className="text-xl font-black text-white tracking-tight uppercase">
                  TOOLS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                HARDWARE • TOOLS • SPARES
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#171A20] text-[#F4C430] border border-[#F4C430]/30 shadow-xs">
            Commercial Edition
          </span>
        </div>

        {/* Middle: Brand Pitch & Core Industrial Highlights */}
        <div className="relative z-10 my-auto py-8 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4C430]/10 border border-[#F4C430]/30 text-[#F4C430] text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Industrial Shop Management Platform</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              {t('auth.welcomeTitle')}
            </h1>
            <p className="text-base text-amber-200/90 font-semibold tracking-wide">
              {t('auth.welcomeSubtitle')}
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-normal">
            {language === 'mr'
              ? 'हार्डवेअर टूल्स, मशिनरी स्पेअर्स, इन्व्हेंटरी ट्रॅकिंग, जीएसटी बिलिंग आणि ग्राहक खात्यांसाठी संपूर्ण व्यावसायिक प्रणाली.'
              : 'Enterprise-grade inventory tracking, high-speed counter sales, automated GST invoice generation, and customer dues ledger designed specifically for hardware and spare parts businesses.'}
          </p>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-[#171A20]/80 border border-slate-700/60 flex items-start gap-3 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-[#F4C430]/15 text-[#F4C430] shrink-0 mt-0.5">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {t('auth.feature1')}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Auto deduction on sales
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#171A20]/80 border border-slate-700/60 flex items-start gap-3 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-[#F4C430]/15 text-[#F4C430] shrink-0 mt-0.5">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {t('auth.feature2')}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  A4 print with HSN & rates
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#171A20]/80 border border-slate-700/60 flex items-start gap-3 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-[#F4C430]/15 text-[#F4C430] shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {t('auth.feature3')}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Credit bills & payments
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#171A20]/80 border border-slate-700/60 flex items-start gap-3 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-[#F4C430]/15 text-[#F4C430] shrink-0 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {t('auth.feature4')}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Real-time Firebase Firestore
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#F4C430]" />
            <span>256-Bit SSL Secured Cloud</span>
          </div>
          <span>Sangli, Maharashtra • v1.0</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT SIDE: CLEAN WHITE LOGIN CARD                       */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center p-5 sm:p-10 lg:p-12 relative z-10 bg-[#1A1E24]/60 min-h-screen">
        {/* Mobile Header (Shows only on small screens) */}
        <div className="lg:hidden text-center mb-6 pt-10 sm:pt-4">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#171A20] border-2 border-[#F4C430]/60 shadow-xl mb-3 max-w-[130px]">
            <img src="/logo.png" alt="Malhar Tools Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-[#F4C430]">MALHAR </span>
            <span className="text-white">TOOLS</span>
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-[#F4C430] font-bold mt-0.5">
            HARDWARE • TOOLS • SPARES
          </p>
        </div>

        {/* The Elevated Pure White Login Card */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 sm:p-10 border border-slate-100 text-slate-900 animate-slide-in relative">
          {/* Card Header */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FDF6D8] text-[#854d0e] border border-[#F4C430]/50 mb-3">
              <Lock className="w-3 h-3 text-[#ca8a04]" />
              <span>Owner Access</span>
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-[#20242B] tracking-tight">
              {t('auth.ownerLogin')}
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {t('auth.signInSubtitle')}
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-slide-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@malhartools.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:bg-white focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20 outline-none transition-all placeholder:text-slate-400"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:bg-white focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20 outline-none transition-all placeholder:text-slate-400"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-none p-1 transition-colors"
                  title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#F4C430] focus:ring-[#F4C430] cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-600">
                  {t('auth.rememberMe')}
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setIsForgotModalOpen(true);
                }}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            {/* Prominent Turmeric Yellow Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#F4C430] hover:bg-[#E5B520] active:scale-[0.99] text-[#20242B] font-black text-sm tracking-wide shadow-lg shadow-[#F4C430]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#20242B]" />
                  <span>{t('auth.loggingIn')}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>{t('auth.loginButton')}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </span>
              )}
            </button>
          </form>

          {/* Database / Security Status Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span>{isFirebaseConnected ? 'Firebase Cloud Connected' : 'Local Storage Mode'}</span>
            </span>

            <span className="text-slate-400">Sangli, MH</span>
          </div>
        </div>

        {/* Security & Copyright Subtext */}
        <p className="text-[11px] text-slate-400 text-center mt-6 font-medium">
          Authorized shop personnel only • Malhar Tools Management System
        </p>
      </div>

      {/* ======================================================== */}
      {/* FORGOT PASSWORD MODAL                                    */}
      {/* ======================================================== */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-900 animate-slide-in relative">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#FDF6D8] border border-[#F4C430]/60 flex items-center justify-center text-[#ca8a04] mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-[#20242B] tracking-tight">
              {t('auth.resetPasswordTitle')}
            </h3>

            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
              {t('auth.resetPasswordDesc')}
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="owner@malhartools.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:bg-white focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="px-5 py-2.5 bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-75"
                >
                  {isSendingReset && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('auth.sendResetLink')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
