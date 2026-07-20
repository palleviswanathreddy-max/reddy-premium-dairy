'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';

type Step = 1 | 2 | 3;

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Form state
  const [step, setStep] = useState<Step>(1);
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone' | null>(null);
  
  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Timer Countdown Effect
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Helper to detect type
  const detectType = (val: string): 'email' | 'phone' | null => {
    const trimmed = val.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = trimmed.replace(/\D/g, '');
    if (emailRegex.test(trimmed)) return 'email';
    if (phoneDigits.length === 10) return 'phone';
    return null;
  };

  // STEP 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const type = detectType(identifier);
    if (!type) {
      setErrorMessage('Please enter a valid email address or 10-digit mobile number.');
      return;
    }

    setIdentifierType(type);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), purpose: 'reset' })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        setStep(2);
        setResendTimer(30);
        if (data.demoOtp) {
          setDemoOtp(data.demoOtp);
          setOtpDigits(data.demoOtp.split(''));
          setSuccessMessage(`Demo OTP: ${data.demoOtp} — auto-filled for testing!`);
        } else {
          setDemoOtp(null);
          setSuccessMessage(data.message || 'Verification code sent successfully!');
        }
      } else {
        setErrorMessage(data.message || 'Failed to send verification code.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'An error occurred while sending OTP.';
      setErrorMessage(msg);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otpCode })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        setStep(3);
        setSuccessMessage('Code verified! Please create your new password.');
      } else {
        setErrorMessage(data.message || 'Invalid or expired verification code.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'An error occurred while verifying OTP.';
      setErrorMessage(msg);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please recheck.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          newPassword
        })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        setSuccessMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setErrorMessage(data.message || 'Failed to reset password.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'An error occurred while resetting password.';
      setErrorMessage(msg);
    }
  };

  // OTP Input change handlers
  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = cleanValue;
    setOtpDigits(updated);

    // Auto-advance to next input
    if (cleanValue && index < 5) {
      const nextInput = document.getElementById(`forgot-page-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`forgot-page-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs & Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/login"
            className="flex items-center text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors gap-1.5"
            id="back-to-login-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Step {step} of 3
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            {step === 1 && <KeyRound className="w-6 h-6 text-emerald-400" />}
            {step === 2 && <ShieldCheck className="w-6 h-6 text-emerald-400" />}
            {step === 3 && <Lock className="w-6 h-6 text-emerald-400" />}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-1">
            {step === 1 && 'Reset Your Password'}
            {step === 2 && 'Verify Verification Code'}
            {step === 3 && 'Set New Password'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 1 && 'Enter your registered email or 10-digit mobile number'}
            {step === 2 && `Enter the 6-digit code sent to your ${identifierType === 'phone' ? 'mobile number' : 'email address'} (${identifier})`}
            {step === 3 && 'Choose a secure password for your account'}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* STEP 1: Enter Identifier */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4" id="forgot-step1-form">
            <div>
              <label htmlFor="forgot-identifier-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email or Mobile Number
              </label>
              <div className="relative">
                <input
                  id="forgot-identifier-input"
                  name="identifier"
                  type="text"
                  required
                  placeholder="name@example.com or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  {detectType(identifier) === 'phone' ? (
                    <Phone className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Mail className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              id="send-otp-btn"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-5" id="forgot-step2-form">
            {demoOtp && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center font-mono font-medium">
                Demo Code: {demoOtp} (auto-filled)
              </div>
            )}
            <div>
              <label htmlFor="forgot-page-otp-0" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-center gap-2">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    id={`forgot-page-otp-${i}`}
                    name="forgotPageOtpDigit"
                    aria-label={`Verification code digit ${i + 1} of 6`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 bg-slate-950/80 border border-slate-800 rounded-xl text-center text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Resend Timer */}
            <div className="text-center text-xs text-slate-400">
              {resendTimer > 0 ? (
                <span>Resend code in <strong className="text-emerald-400">{resendTimer}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-emerald-400 font-semibold hover:underline"
                  id="resend-otp-btn"
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              type="submit"
              id="verify-otp-btn"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4" id="forgot-step3-form">
            <div>
              <label htmlFor="new-password-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password-input"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password-input"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="reset-password-btn"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
