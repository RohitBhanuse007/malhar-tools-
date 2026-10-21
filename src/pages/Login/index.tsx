import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import {
  Globe,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isFirebaseConnected } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { error: toastError, success: toastSuccess } = useToast();

  // Page view: 'login' or 'forgot-password'
  const [view, setView] = useState<'login' | 'forgot-password'>('login');

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

  // If user clicked "Forgot Password?", render the dedicated secure Forgot Password flow
  if (view === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onBackToLogin={() => setView('login')}
        onPasswordResetSuccess={(newPass) => {
          setPassword(newPass);
          setView('login');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#20242B] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none auth-dark">
      {/* Ambient Turmeric Lighting Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F4C430]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in Header Corner */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20">
        <button
          onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171A20] hover:bg-[#2A303A] text-slate-200 hover:text-white border border-slate-700 hover:border-[#F4C430]/60 text-xs font-bold transition-all shadow-lg shadow-black/20"
          title="Switch Language / भाषा बदला"
        >
          <Globe className="w-3.5 h-3.5 text-[#F4C430]" />
          <span>{language === 'en' ? 'मराठी' : 'English'}</span>
        </button>
      </div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Centered Logo & Shop Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#171A20] border-2 border-[#F4C430]/50 shadow-2xl mb-4 max-w-[130px] mx-auto">
            <img
              src="/logo.png"
              alt="Malhar Tools Logo"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#ffffff' }}>
            <span className="text-[#F4C430]">MALHAR </span>
            <span className="text-white">TOOLS</span>
          </h1>

          <p className="text-xs uppercase tracking-widest text-[#F4C430] font-bold mt-1">
            {language === 'mr' ? 'हार्डवेअर • टूल्स • स्पेअर्स' : 'HARDWARE • TOOLS • SPARES'}
          </p>

          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Centered Login Card */}
        <div className="bg-[#171A20] backdrop-blur-md rounded-3xl border border-slate-700/80 shadow-2xl p-7 sm:p-9 text-white relative">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white tracking-tight" style={{ color: '#ffffff' }}>
              {t('auth.loginTitle')}
            </h2>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-[#F4C430]/15 text-[#F4C430] border border-[#F4C430]/40">
              Owner
            </span>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-slide-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@malhartools.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#20242B] border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none transition-all placeholder:text-slate-500"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input with Show/Hide toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-[#20242B] border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none transition-all placeholder:text-slate-500"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F4C430] p-1 transition-colors"
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 text-[#F4C430] focus:ring-[#F4C430] bg-[#20242B] cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-300">
                  {t('auth.rememberMe')}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setView('forgot-password')}
                className="text-xs font-bold text-[#F4C430] hover:text-[#E5B520] hover:underline transition-colors cursor-pointer"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            {/* Turmeric Yellow Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#F4C430] hover:bg-[#E5B520] active:scale-[0.99] text-[#20242B] font-black text-sm tracking-wide shadow-lg shadow-[#F4C430]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-75"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#20242B]" />
                  <span>{t('auth.loggingIn')}</span>
                </span>
              ) : (
                <span>{t('auth.loginButton')}</span>
              )}
            </button>
          </form>

          {/* Database / Security Status Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isFirebaseConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span>{isFirebaseConnected ? 'Firebase Connected' : 'Local Storage Mode'}</span>
            </span>

            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>SSL Secured</span>
            </span>
          </div>
        </div>

        {/* Bottom Subtext */}
        <p className="text-[11px] text-slate-400 text-center font-medium">
          Malhar Tools • Hardware • Tools • Spares
        </p>
      </div>
    </div>
  );
};
