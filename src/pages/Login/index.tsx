import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Wrench, Globe, Lock, Mail, AlertCircle, Info } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isFirebaseConnected } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      toastSuccess(t('auth.loginSuccess'));
    } catch (err: any) {
      console.error('Login failed:', err);
      let msg = t('auth.invalidCredentials');
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language switcher in header corner */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-brand-400" />
          <span>{language === 'en' ? 'मराठी' : 'English'}</span>
        </button>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo and Shop Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 shadow-xl mb-4 border border-emerald-400/30">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {language === 'mr' ? 'मल्हार टूल्स' : 'Malhar Tools'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-6">
            {t('auth.loginTitle')}
          </h2>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.email')}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@malhartools.com"
                leftAddon={<Mail className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftAddon={<Lock className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-semibold shadow-lg shadow-brand-600/30"
              isLoading={isLoading}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </Button>
          </form>

          {/* Quick notice regarding Firebase config */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <span>
              {isFirebaseConnected
                ? 'Connected to Firebase Authentication.'
                : 'Firebase credentials can be configured in .env file.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
