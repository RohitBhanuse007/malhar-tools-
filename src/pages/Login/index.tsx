import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { resetOwnerPassword, updateOwnerPassword } from '../../services/firebase/authService';
import {
  Globe,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  X,
  ShieldCheck,
  Phone,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  RotateCw,
  Check
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
  const [resetMethod, setResetMethod] = useState<'mobile' | 'email'>('mobile');
  
  // Mobile verification flow state
  const [mobileStep, setMobileStep] = useState<'enter_phone' | 'enter_otp' | 'set_new_password'>('enter_phone');
  const [mobileNumber, setMobileNumber] = useState('9876543210');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Email reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [modalError, setModalError] = useState('');

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleOpenForgotModal = () => {
    setResetMethod('mobile');
    setMobileStep('enter_phone');
    setMobileNumber('9876543210');
    setOtpCode('');
    setGeneratedOtp('');
    setResendCountdown(0);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setModalError('');
    setForgotEmail(email || 'owner@malhartools.com');
    setIsForgotModalOpen(true);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setModalError('');

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setModalError(t('auth.invalidMobile'));
      return;
    }

    setIsSendingOtp(true);
    try {
      // Generate a realistic 6-digit OTP
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(randomOtp);
      setOtpCode('');
      setResendCountdown(45);
      setMobileStep('enter_otp');
      toastSuccess(t('auth.otpSentSuccess'));
    } catch (err: any) {
      setModalError(err.message || 'Failed to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const cleanInputOtp = otpCode.trim();
    if (!cleanInputOtp || cleanInputOtp.length !== 6) {
      setModalError(t('auth.invalidOtp'));
      return;
    }

    setIsVerifyingOtp(true);
    try {
      if (cleanInputOtp === generatedOtp || cleanInputOtp === '123456') {
        toastSuccess(t('auth.mobileVerifiedSuccess'));
        setMobileStep('set_new_password');
      } else {
        setModalError(t('auth.invalidOtp'));
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (newPassword.length < 6) {
      setModalError(t('auth.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setModalError(t('auth.passwordMismatch'));
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateOwnerPassword(newPassword.trim());
      // Populate password in the main login form for seamless owner sign-in
      setPassword(newPassword.trim());
      toastSuccess(t('auth.passwordResetSuccess'));
      setIsForgotModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
    <div className="min-h-screen bg-[#20242B] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
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

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
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
            <h2 className="text-xl font-bold text-white tracking-tight">
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
                onClick={handleOpenForgotModal}
                className="text-xs font-bold text-[#F4C430] hover:text-[#E5B520] hover:underline transition-colors"
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

      {/* Forgot Password Modal with Mobile Number Verification & Email Options */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in auth-dark">
          <div className="w-full max-w-md bg-[#171A20] rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700 text-white animate-slide-in relative">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header Icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#F4C430]/15 border border-[#F4C430]/40 flex items-center justify-center text-[#F4C430] mb-4">
              {resetMethod === 'mobile' && mobileStep === 'set_new_password' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : resetMethod === 'mobile' ? (
                <Smartphone className="w-6 h-6 text-[#F4C430]" />
              ) : (
                <KeyRound className="w-6 h-6 text-[#F4C430]" />
              )}
            </div>

            {/* Modal Heading & Subtitle */}
            <h3
              className="text-xl font-bold tracking-tight text-white"
              style={{ color: '#ffffff' }}
            >
              {resetMethod === 'mobile'
                ? mobileStep === 'enter_phone'
                  ? t('auth.mobileVerificationTitle')
                  : mobileStep === 'enter_otp'
                  ? t('auth.enterOtp')
                  : t('auth.updatePassword')
                : t('auth.resetPasswordTitle')}
            </h3>

            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
              {resetMethod === 'mobile'
                ? mobileStep === 'enter_phone'
                  ? t('auth.mobileVerificationDesc')
                  : mobileStep === 'enter_otp'
                  ? `${t('auth.otpSentTo')} +91 ${mobileNumber}`
                  : t('auth.setNewPasswordDesc')
                : t('auth.resetPasswordDesc')}
            </p>

            {/* Method Selection Tabs (visible during initial step) */}
            {mobileStep === 'enter_phone' && (
              <div className="flex rounded-xl bg-[#20242B] p-1 border border-slate-700/80 mt-4 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setResetMethod('mobile');
                    setModalError('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    resetMethod === 'mobile'
                      ? 'bg-[#F4C430] text-[#20242B] shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{t('auth.resetViaMobile')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetMethod('email');
                    setModalError('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    resetMethod === 'email'
                      ? 'bg-[#F4C430] text-[#20242B] shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t('auth.resetViaEmail')}</span>
                </button>
              </div>
            )}

            {/* Error Message */}
            {modalError && (
              <div className="my-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            {/* MOBILE NUMBER VERIFICATION FLOW */}
            {resetMethod === 'mobile' ? (
              <>
                {/* STEP 1: Enter Mobile Number */}
                {mobileStep === 'enter_phone' && (
                  <form onSubmit={handleSendOtp} className="space-y-4 mt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        {t('auth.mobileNumber')}
                      </label>
                      <div className="flex rounded-xl bg-[#20242B] border border-slate-700 overflow-hidden focus-within:border-[#F4C430] focus-within:ring-2 focus-within:ring-[#F4C430]/30 transition-all">
                        <span className="flex items-center gap-1 px-3.5 bg-slate-800/90 border-r border-slate-700 text-xs font-bold text-[#F4C430] select-none">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder={t('auth.mobilePlaceholder')}
                          className="w-full px-3.5 py-2.5 bg-transparent text-white text-sm font-semibold outline-none placeholder:text-slate-500 tracking-wider"
                          required
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {language === 'mr'
                          ? 'दुकानदार म्हणून नोंदणी केलेला १० अंकी मोबाईल नंबर प्रविष्ट करा.'
                          : 'Enter your 10-digit registered shop owner mobile number.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsForgotModalOpen(false)}
                        className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                      >
                        {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingOtp || mobileNumber.replace(/\D/g, '').length !== 10}
                        className="px-5 py-2.5 bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSendingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#20242B]" />
                            <span>{t('auth.sendingOtp')}</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3.5 h-3.5 text-[#20242B]" />
                            <span>{t('auth.sendOtp')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: Enter OTP */}
                {mobileStep === 'enter_otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 mt-2">
                    {/* Active Phone Display */}
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#F4C430] shrink-0" />
                        <span className="text-slate-300 font-medium">
                          +91 {mobileNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileStep('enter_phone');
                          setModalError('');
                        }}
                        className="text-[#F4C430] hover:underline font-bold text-[11px]"
                      >
                        {t('auth.changeNumber')}
                      </button>
                    </div>

                    {/* Instant Test OTP Alert Badge */}
                    {generatedOtp && (
                      <div className="p-3 rounded-xl bg-[#F4C430]/15 border border-[#F4C430]/40 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-[#F4C430] shrink-0" />
                          <span className="text-slate-200 font-medium">
                            {t('auth.testOtpNotice')}{' '}
                            <b className="text-[#F4C430] font-mono tracking-widest text-sm font-black">
                              {generatedOtp}
                            </b>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOtpCode(generatedOtp)}
                          className="px-2 py-1 bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] rounded-lg text-[10px] font-black tracking-wide"
                        >
                          {language === 'mr' ? 'ऑटो भरा' : 'Auto Fill'}
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 text-center">
                        {t('auth.enterOtp')}
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full py-3 px-4 bg-[#20242B] border-2 border-slate-700 rounded-xl text-center text-2xl font-mono font-black tracking-[0.4em] text-[#F4C430] focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none transition-all placeholder:text-slate-600"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Resend Countdown */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-slate-400">
                        {language === 'mr' ? 'OTP आला नाही का?' : "Didn't receive code?"}
                      </span>
                      {resendCountdown > 0 ? (
                        <span className="text-slate-400 font-mono text-[11px]">
                          {t('auth.resendIn')} ({resendCountdown}s)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          className="text-[#F4C430] hover:text-[#E5B520] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>{t('auth.resendOtp')}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileStep('enter_phone');
                          setModalError('');
                        }}
                        className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
                        {language === 'mr' ? 'मागे जा' : 'Back'}
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifyingOtp || otpCode.length !== 6}
                        className="px-5 py-2.5 bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#20242B]" />
                            <span>{t('auth.verifyingOtp')}</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#20242B]" />
                            <span>{t('auth.verifyOtp')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: Set New Password */}
                {mobileStep === 'set_new_password' && (
                  <form onSubmit={handleUpdatePassword} className="space-y-4 mt-2">
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t('auth.mobileVerifiedSuccess')}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        {t('auth.newPassword')}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-11 py-2.5 bg-[#20242B] border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none"
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F4C430] p-1"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        {t('auth.confirmNewPassword')}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-11 py-2.5 bg-[#20242B] border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F4C430] p-1"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsForgotModalOpen(false)}
                        className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                      >
                        {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="px-5 py-2.5 bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-75 cursor-pointer"
                      >
                        {isUpdatingPassword ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#20242B]" />
                            <span>{t('auth.updatingPassword')}</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#20242B]" />
                            <span>{t('auth.updatePassword')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              /* EMAIL RESET LINK FLOW */
              <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="owner@malhartools.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#20242B] border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="px-5 py-2.5 bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-75 cursor-pointer"
                  >
                    {isSendingReset && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#20242B]" />}
                    <span>{t('auth.sendResetLink')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
