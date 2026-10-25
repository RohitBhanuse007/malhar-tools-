import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  initPhoneRecaptcha,
  sendOwnerPhoneOtp,
  verifyOtpAndResetPassword,
  SendOtpResult
} from '../../services/firebase/authService';
import {
  ArrowLeft,
  Lock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  RotateCw,
  KeyRound,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onPasswordResetSuccess: (newPassword: string) => void;
}

type Step = 'enter_phone' | 'enter_otp' | 'set_new_password' | 'success';

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onBackToLogin,
  onPasswordResetSuccess,
}) => {
  const { t, language } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();

  const [step, setStep] = useState<Step>('enter_phone');
  const [phone, setPhone] = useState('9270693111');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  // Expiry & Cooldown timers
  const [resendCountdown, setResendCountdown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(300); // 5 minutes = 300 seconds

  // New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [redirectTimer, setRedirectTimer] = useState(3);

  const recaptchaVerifierRef = useRef<any>(null);

  // Initialize invisible reCAPTCHA on mount
  useEffect(() => {
    try {
      const verifier = initPhoneRecaptcha('recaptcha-container');
      recaptchaVerifierRef.current = verifier;
    } catch (e) {
      console.warn('reCAPTCHA init notice:', e);
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    let interval: any;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // 5-minute OTP expiry countdown timer
  useEffect(() => {
    let interval: any;
    if (step === 'enter_otp' && expiryCountdown > 0) {
      interval = setInterval(() => {
        setExpiryCountdown((prev) => {
          if (prev <= 1) {
            setErrorMessage(
              language === 'mr'
                ? 'OTP ची मुदत संपली आहे (५ मिनिटे). कृपया पुन्हा OTP पाठवा.'
                : 'OTP has expired (5-minute validity). Please request a new OTP.'
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, expiryCountdown, language]);

  // Success auto-redirect timer
  useEffect(() => {
    let timer: any;
    if (step === 'success') {
      timer = setInterval(() => {
        setRedirectTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onPasswordResetSuccess(newPassword);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, newPassword, onPasswordResetSuccess]);

  // Format expiry seconds into mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      setErrorMessage(
        language === 'mr'
          ? 'कृपया वैध १० अंकी मोबाईल नंबर प्रविष्ट करा.'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const result: SendOtpResult = await sendOwnerPhoneOtp(
        cleanDigits,
        recaptchaVerifierRef.current
      );

      setConfirmationResult(result.confirmationResult || null);
      setMaskedPhone(result.maskedPhone);
      setDemoOtp(result.testOtpForDemo || null);
      setOtpCode('');
      setResendCountdown(45);
      setExpiryCountdown(300); // 5 minutes
      setStep('enter_otp');

      toastSuccess(
        language === 'mr'
          ? 'सुरक्षा OTP तुमच्या मोबाईलवर पाठवला आहे!'
          : 'Security OTP has been sent to your mobile!'
      );
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setErrorMessage(err.message || 'Failed to send OTP.');
      toastError(err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const clean = otpCode.trim();
    if (clean.length !== 6 || !/^\d{6}$/.test(clean)) {
      setErrorMessage(
        language === 'mr'
          ? 'कृपया योग्य ६ अंकी OTP प्रविष्ट करा.'
          : 'Please enter a valid 6-digit OTP.'
      );
      return;
    }

    if (expiryCountdown <= 0) {
      setErrorMessage(
        language === 'mr'
          ? 'OTP ची मुदत संपली आहे. कृपया "पुन्हा OTP पाठवा" वर क्लिक करा.'
          : 'OTP has expired. Please request a new OTP.'
      );
      return;
    }

    // Move to step 3 (Password creation)
    toastSuccess(
      language === 'mr'
        ? 'मोबाईल नंबर यशस्वीरित्या पडताळला!'
        : 'Mobile number verified successfully!'
    );
    setStep('set_new_password');
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage(
        language === 'mr'
          ? 'पासवर्ड किमान ६ अक्षरांचा असावा.'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage(
        language === 'mr'
          ? 'दोन्ही पासवर्ड जुळत नाहीत.'
          : 'Passwords do not match.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtpAndResetPassword({
        confirmationResult,
        otpCode,
        newPassword: newPassword.trim(),
        enteredPhone: phone,
      });

      toastSuccess(
        language === 'mr'
          ? 'पासवर्ड यशस्वीरित्या बदलला आहे!'
          : 'Password reset successfully!'
      );
      setStep('success');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMessage(err.message || 'Failed to update password.');
      toastError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#20242B] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none auth-dark">
      {/* Ambient Turmeric Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F4C430]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#171A20] border-2 border-[#F4C430]/50 shadow-2xl mb-3 max-w-[120px] mx-auto">
            <img
              src="/logo.png"
              alt="Malhar Tools Logo"
              className="w-14 h-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#ffffff' }}>
            <span className="text-[#F4C430]">MALHAR </span>
            <span className="text-white">TOOLS</span>
          </h1>

          <p className="text-[11px] uppercase tracking-widest text-[#F4C430] font-bold mt-1">
            {language === 'mr' ? 'हार्डवेअर • टूल्स • स्पेअर्स' : 'HARDWARE • TOOLS • SPARES'}
          </p>
        </div>

        {/* Dedicated Forgot Password Card */}
        <div className="bg-[#171A20] backdrop-blur-md rounded-3xl border border-slate-700/80 shadow-2xl p-7 sm:p-8 text-white relative">
          {/* Multi-step progress indicator */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === 'enter_phone'
                    ? 'bg-[#F4C430] text-[#20242B] ring-4 ring-[#F4C430]/20'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {step !== 'enter_phone' ? <Check className="w-3.5 h-3.5" /> : '1'}
              </span>
              <span className="text-xs font-bold text-slate-300">
                {language === 'mr' ? 'मोबाईल' : 'Mobile'}
              </span>
            </div>

            <div className="h-0.5 w-8 bg-slate-700" />

            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === 'enter_otp'
                    ? 'bg-[#F4C430] text-[#20242B] ring-4 ring-[#F4C430]/20'
                    : step === 'set_new_password' || step === 'success'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step === 'set_new_password' || step === 'success' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  '2'
                )}
              </span>
              <span className="text-xs font-bold text-slate-300">OTP</span>
            </div>

            <div className="h-0.5 w-8 bg-slate-700" />

            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === 'set_new_password'
                    ? 'bg-[#F4C430] text-[#20242B] ring-4 ring-[#F4C430]/20'
                    : step === 'success'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step === 'success' ? <Check className="w-3.5 h-3.5" /> : '3'}
              </span>
              <span className="text-xs font-bold text-slate-300">
                {language === 'mr' ? 'पासवर्ड' : 'Password'}
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-slide-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Registered Mobile Number */}
          {step === 'enter_phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#F4C430]/15 border border-[#F4C430]/40 flex items-center justify-center text-[#F4C430] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight" style={{ color: '#ffffff' }}>
                    {language === 'mr' ? 'पासवर्ड रीसेट करा' : 'Reset Owner Password'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {language === 'mr'
                      ? 'सुरक्षित OTP मिळवण्यासाठी नोंदणीकृत मोबाईल नंबर टाका.'
                      : 'Enter your registered mobile number to receive OTP.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'नोंदणीकृत मोबाईल नंबर' : 'Registered Mobile Number'}
                </label>
                <div className="flex rounded-xl bg-[#20242B] border border-slate-700 overflow-hidden focus-within:border-[#F4C430] focus-within:ring-2 focus-within:ring-[#F4C430]/30 transition-all">
                  <span className="flex items-center gap-1.5 px-3.5 bg-slate-800/90 border-r border-slate-700 text-xs font-bold text-[#F4C430] select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="92706 93111"
                    className="w-full px-3.5 py-3 bg-transparent text-white text-sm font-semibold outline-none placeholder:text-slate-500 tracking-wider"
                    required
                    autoFocus
                  />
                </div>
                <div className="mt-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-2 text-[11px] text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F4C430] shrink-0 mt-0.5" />
                  <span>
                    {language === 'mr'
                      ? 'फक्त अधिकृत दुकानदाराचा नंबरच ग्राह्य धरला जाईल (सुरक्षितता धोरण).'
                      : 'Only the authorized shop owner mobile number is permitted to reset credentials.'}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || phone.replace(/\D/g, '').length !== 10}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#F4C430] hover:bg-[#E5B520] active:scale-[0.99] text-[#20242B] font-black text-sm tracking-wide shadow-lg shadow-[#F4C430]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#20242B]" />
                      <span>{language === 'mr' ? 'OTP पाठवत आहे...' : 'Sending OTP...'}</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 text-[#20242B]" />
                      <span>{language === 'mr' ? 'OTP पाठवा' : 'Send 6-Digit OTP'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'लॉगिनवर परत जा' : 'Back to Login'}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verify 6-digit OTP */}
          {step === 'enter_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-4 h-4 text-[#F4C430] shrink-0" />
                  <span className="text-slate-200 font-bold">{maskedPhone || `+91 ${phone}`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter_phone');
                    setErrorMessage('');
                  }}
                  className="text-xs font-bold text-[#F4C430] hover:underline"
                >
                  {language === 'mr' ? 'नंबर बदला' : 'Change Number'}
                </button>
              </div>

              {/* Demo OTP Box for Instant Local Evaluation */}
              {demoOtp && (
                <div className="p-3 rounded-xl bg-[#F4C430]/15 border border-[#F4C430]/40 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#F4C430] shrink-0" />
                    <span className="text-slate-200">
                      {language === 'mr' ? 'डेमो चाचणी OTP:' : 'Demo Test OTP:'}{' '}
                      <b className="text-[#F4C430] font-mono tracking-widest text-sm font-black">
                        {demoOtp}
                      </b>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtp)}
                    className="px-2.5 py-1 bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] rounded-lg text-[10px] font-black"
                  >
                    {language === 'mr' ? 'ऑटो भरा' : 'Auto Fill'}
                  </button>
                </div>
              )}

              {/* OTP Input Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {language === 'mr' ? '६ अंकी OTP प्रविष्ट करा' : 'Enter 6-Digit OTP'}
                  </label>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(expiryCountdown)}</span>
                  </span>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full py-3.5 px-4 bg-[#20242B] border-2 border-slate-700 rounded-xl text-center text-3xl font-mono font-black tracking-[0.4em] text-[#F4C430] focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none transition-all placeholder:text-slate-600"
                  required
                  autoFocus
                />
              </div>

              {/* Resend Cooldown */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">
                  {language === 'mr' ? 'OTP मिळाला नाही?' : "Didn't receive code?"}
                </span>
                {resendCountdown > 0 ? (
                  <span className="text-slate-400 font-mono text-[11px]">
                    {language === 'mr' ? 'पुन्हा पाठवा' : 'Resend in'} ({resendCountdown}s)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-[#F4C430] hover:text-[#E5B520] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>{language === 'mr' ? 'पुन्हा OTP पाठवा' : 'Resend OTP'}</span>
                  </button>
                )}
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={otpCode.length !== 6 || expiryCountdown <= 0}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#F4C430] hover:bg-[#E5B520] active:scale-[0.99] text-[#20242B] font-black text-sm tracking-wide shadow-lg shadow-[#F4C430]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#20242B]" />
                  <span>{language === 'mr' ? 'OTP पडताळा' : 'Verify OTP'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('enter_phone');
                    setErrorMessage('');
                  }}
                  className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'मागे जा' : 'Go Back'}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Create and Confirm New Password */}
          {step === 'set_new_password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {language === 'mr'
                    ? 'मोबाईल पडताळणी पूर्ण झाली! आता नवीन पासवर्ड तयार करा.'
                    : 'Mobile verified! Now create your new password.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'नवीन पासवर्ड' : 'New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-[#20242B] border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none transition-all placeholder:text-slate-500"
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
                  {language === 'mr' ? 'नवीन पासवर्डची पुष्टी करा' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-[#20242B] border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/30 outline-none transition-all placeholder:text-slate-500"
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

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || newPassword.length < 6}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#F4C430] hover:bg-[#E5B520] active:scale-[0.99] text-[#20242B] font-black text-sm tracking-wide shadow-lg shadow-[#F4C430]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#20242B]" />
                      <span>{language === 'mr' ? 'पासवर्ड सेव्ह होत आहे...' : 'Saving Password...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#20242B]" />
                      <span>{language === 'mr' ? 'पासवर्ड बदला आणि सेव्ह करा' : 'Update & Save Password'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('enter_otp')}
                  className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'मागे जा' : 'Go Back'}</span>
                </button>
              </div>
            </form>
          )}

          {/* SUCCESS SCREEN */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight" style={{ color: '#ffffff' }}>
                  {language === 'mr' ? 'पासवर्ड यशस्वीरित्या बदलला आहे!' : 'Password reset successfully.'}
                </h3>
                <p className="text-xs text-slate-300">
                  {language === 'mr'
                    ? 'आपला नवीन पासवर्ड सुरक्षितरीत्या अपडेट झाला आहे.'
                    : 'Your new password has been securely updated.'}
                </p>
              </div>

              <div className="pt-3">
                <p className="text-xs text-[#F4C430] font-bold">
                  {language === 'mr'
                    ? `${redirectTimer} सेकंदात लॉगिन पेजवर जात आहे...`
                    : `Redirecting to login in ${redirectTimer}s...`}
                </p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-[#F4C430] h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((3 - redirectTimer) / 3) * 100}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPasswordResetSuccess(newPassword)}
                className="w-full mt-4 py-3 px-6 rounded-xl bg-[#F4C430] hover:bg-[#E5B520] text-[#20242B] font-black text-sm tracking-wide shadow-lg transition-all"
              >
                {language === 'mr' ? 'आता लॉगिन करा' : 'Sign In Now'}
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-400 text-center font-medium">
          Malhar Tools • Secure Owner Verification System
        </p>
      </div>
    </div>
  );
};
