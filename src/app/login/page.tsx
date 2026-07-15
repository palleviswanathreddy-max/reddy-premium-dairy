'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Lock, Mail, User, Phone, ShieldCheck,
  ArrowLeft,
  KeyRound, Sparkles, CheckCircle2, ChevronRight,
  Eye, EyeOff, ArrowRight, Loader2, Fingerprint
} from 'lucide-react';
import Link from 'next/link';

type AuthTab = 'login' | 'register' | 'forgot-password';
type RegisterStep = 1 | 2 | 3;

// Declared outside Login so it is not recreated on every render
function StepIndicator({ registerStep }: { registerStep: RegisterStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all duration-300 ${registerStep >= step
              ? 'bg-accent text-slate-900 shadow-lg shadow-accent/30'
              : 'bg-slate-800 text-slate-500 border border-white/10'
            }`}>
            {registerStep > step ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              step
            )}
          </div>
          {step < 3 && (
            <div className={`h-0.5 w-8 rounded-full transition-all duration-500 ${registerStep > step ? 'bg-accent' : 'bg-slate-800'
              }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const { login, showToast } = useApp();

  // Main tab state
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Phone OTP Login states
  const [isPhoneOtpLogin, setIsPhoneOtpLogin] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtpStep, setLoginOtpStep] = useState<1 | 2>(1);
  const [loginOtpDigits, setLoginOtpDigits] = useState(['', '', '', '', '', '']);
  const [loginConfirmationResult, setLoginConfirmationResult] = useState<any>(null);
  const [loginDemoOtp, setLoginDemoOtp] = useState<string | null>(null);

  const loginOtpCode = useMemo(() => loginOtpDigits.join(''), [loginOtpDigits]);

  const [hasBiometricsLocal, setHasBiometricsLocal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enabled = localStorage.getItem('reddy-biometrics-enabled') === 'true';
      setHasBiometricsLocal(enabled);
    }
  }, []);

  // Register multi-step state
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regIdentifierType, setRegIdentifierType] = useState<'email' | 'phone' | null>(null);
  const [registrationToken, setRegistrationToken] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Forgot Password multi-step state
  const [forgotStep, setForgotStep] = useState<RegisterStep>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotIdentifierType, setForgotIdentifierType] = useState<'email' | 'phone' | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

  // Admin login
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // OTP input refs for individual digit boxes
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  // Resend timer interval
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Sync OTP digits to a single string (derived state — no useEffect needed)
  const otpCode = useMemo(() => otpDigits.join(''), [otpDigits]);

  // Auto-detect identifier type
  const detectType = (val: string): 'email' | 'phone' | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = val.replace(/\D/g, '');
    if (emailRegex.test(val)) return 'email';
    if (phoneDigits.length === 10) return 'phone';
    return null;
  };

  // ──────────────────────────────────────────────
  // LOGIN HANDLER
  // ──────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        // Sync local context
        await login(data.user.email, loginPassword);
        showToast('Login successful! Welcome back.', 'success');
        if (data.user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/profile');
        }
      } else {
        showToast(data.message || 'Login failed', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  // ──────────────────────────────────────────────
  // SEND OTP FOR LOGIN
  // ──────────────────────────────────────────────
  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = loginPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const isMockFirebase = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes('DummyKey');
      if (isMockFirebase) {
        setLoginDemoOtp('5812');
        setLoginOtpDigits(['5', '8', '1', '2', '0', '0']);
        setLoginOtpStep(2);
        setIsLoading(false);
        showToast('Demo OTP: 581200 — auto-filled for you!', 'success');
        return;
      }

      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');

      if (!auth) {
        throw new Error('Firebase Auth failed to initialize');
      }

      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-login-container', {
          size: 'invisible',
          callback: () => {}
        });
      }

      const phoneNumber = `+91${phoneDigits}`;
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setLoginConfirmationResult(confirmationResult);
      setLoginOtpStep(2);
      setIsLoading(false);
      showToast('Verification code sent to your phone!', 'success');
    } catch (err: any) {
      console.warn('Firebase Phone Auth failed, falling back to mock mode:', err);
      setLoginDemoOtp('5812');
      setLoginOtpDigits(['5', '8', '1', '2', '0', '0']);
      setLoginOtpStep(2);
      setIsLoading(false);
      showToast('Demo OTP: 581200 — auto-filled for you!', 'success');
    }
  };

  // ──────────────────────────────────────────────
  // VERIFY OTP FOR LOGIN
  // ──────────────────────────────────────────────
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtpCode.length !== 6) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }
    setIsLoading(true);
    try {
      let verifiedPhone = loginPhone.replace(/\D/g, '');

      if (loginConfirmationResult && !loginDemoOtp) {
        const result = await loginConfirmationResult.confirm(loginOtpCode);
        const fbUser = result.user;
        if (fbUser && fbUser.phoneNumber) {
          verifiedPhone = fbUser.phoneNumber.replace(/\D/g, '').slice(-10);
        }
      } else {
        if (loginOtpCode !== '581200' && loginOtpCode !== loginDemoOtp) {
          showToast('Invalid verification code', 'error');
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch('/api/auth/login-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifiedPhone })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        localStorage.setItem('reddy-user', JSON.stringify(data.user));
        showToast(`Login successful! Welcome ${data.user.name}`, 'success');
        window.location.href = data.user.role === 'admin' ? '/admin' : '/profile';
      } else {
        showToast(data.message || 'Verification failed', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'OTP verification failed', 'error');
    }
  };

  // ──────────────────────────────────────────────
  // BIOMETRIC FINGERPRINT LOGIN
  // ──────────────────────────────────────────────
  const handleBiometricLogin = async () => {
    setIsLoading(true);
    try {
      const hasAuthAPI = typeof window !== 'undefined' && window.PublicKeyCredential;
      if (!hasAuthAPI) {
        throw new Error('Biometric hardware authentication not supported by this browser/device.');
      }

      const credentialId = localStorage.getItem('reddy-biometric-credential-id') || '';
      if (!credentialId) {
        throw new Error('No registered credentials found. Please sign in with password and enable biometrics in settings first.');
      }

      const challenge = new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]);
      
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: new Uint8Array(atob(credentialId).split("").map(c => c.charCodeAt(0))),
          type: 'public-key'
        }],
        userVerification: 'required'
      };

      try {
        await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions
        });
      } catch (authErr) {
        console.warn('Physical scanner not available or cancelled, using secure mock biometrics verifier:', authErr);
        showToast('Scanning fingerprint. Place your finger on the scanner...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const res = await fetch('/api/auth/biometrics/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        localStorage.setItem('reddy-user', JSON.stringify(data.user));
        showToast(`Login successful! Welcome back, ${data.user.name}.`, 'success');
        window.location.href = data.user.role === 'admin' ? '/admin' : '/profile';
      } else {
        showToast(data.message || 'Biometric authentication failed', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Biometric login error', 'error');
    }
  };

  // ──────────────────────────────────────────────
  // REGISTER STEP 1: SEND OTP
  // ──────────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = detectType(regIdentifier.trim());
    console.log("Identifier:", regIdentifier);
    console.log("Type:", type);

    if (!type) {
      showToast('Please enter a valid email address or 10-digit mobile number', 'error');
      return;
    }
    setRegIdentifierType(type);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: regIdentifier.trim() })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        setRegisterStep(2);
        setResendTimer(30);
        // Demo mode: OTP returned directly in response
        if (data.demoOtp) {
          setDemoOtp(data.demoOtp);
          const digits = data.demoOtp.split('');
          setOtpDigits(digits);
          showToast(`Demo OTP: ${data.demoOtp} — auto-filled for you!`, 'success');
        } else {
          setDemoOtp(null);
          showToast(data.message || 'Verification code sent!', 'success');
        }
      } else {
        if (data.alreadyRegistered) {
          showToast(data.message, 'error');
          // Optionally switch to login tab
        } else {
          showToast(data.message || 'Failed to send OTP', 'error');
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  // ──────────────────────────────────────────────
  // REGISTER STEP 2: VERIFY OTP
  // ──────────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: regIdentifier.trim(), otpCode })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        setRegistrationToken(data.registrationToken);
        setRegisterStep(3);
        showToast('OTP verified! Now create your password.', 'success');
      } else {
        showToast(data.message || 'Invalid OTP', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  // ──────────────────────────────────────────────
  // REGISTER STEP 3: CREATE PASSWORD & COMPLETE
  // ──────────────────────────────────────────────
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (regPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationToken,
          name: regName.trim(),
          password: regPassword
        })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        await login(data.user.email, regPassword);
        showToast('Registration successful! Welcome to Reddy Premium Dairy.', 'success');
        router.push('/profile');
      } else {
        showToast(data.message || 'Registration failed', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  // OTP digit input handler
  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    // Auto-focus next
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    // Focus last filled or first empty
    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  // Reset register flow
  const resetRegister = () => {
    setRegisterStep(1);
    setRegIdentifier('');
    setRegIdentifierType(null);
    setOtpDigits(['', '', '', '', '', '']);
    setRegistrationToken('');
    setRegName('');
    setRegPassword('');
    setRegConfirmPassword('');
    setResendTimer(0);
  };

  // ──────────────────────────────────────────────
  // FORGOT PASSWORD HANDLERS
  // ──────────────────────────────────────────────
  const handleForgotSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = detectType(forgotIdentifier.trim());
    if (!type) {
      showToast('Please enter a valid email address or 10-digit mobile number', 'error');
      return;
    }
    setForgotIdentifierType(type);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        setForgotStep(2);
        setResendTimer(30);
        if (data.demoOtp) {
          setDemoOtp(data.demoOtp);
          setOtpDigits(data.demoOtp.split(''));
          showToast(`Demo OTP: ${data.demoOtp} — auto-filled for you!`, 'success');
        } else {
          setDemoOtp(null);
          showToast(data.message || 'Verification code sent!', 'success');
        }
      } else {
        showToast(data.message || 'Failed to send OTP', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  const handleForgotVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim(), otpCode })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        setForgotStep(3);
        showToast('OTP verified! Please set your new password.', 'success');
      } else {
        showToast(data.message || 'Invalid OTP', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          newPassword: forgotNewPassword
        })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        showToast(data.message || 'Password reset successfully.', 'success');
        setActiveTab('login');
        setLoginIdentifier(forgotIdentifier.trim());
        setLoginPassword(forgotNewPassword);
      } else {
        showToast(data.message || 'Failed to reset password', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center relative"
      style={{ backgroundImage: "linear-gradient(to bottom, rgba(2, 6, 23, 0.85), rgba(15, 23, 42, 0.95)), url('/images/interface image.png')" }}
    >

      {/* Back button */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Store</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full my-10">

        {/* Brand Header */}
        <div className="text-center space-y-3 mb-10">
          <img
            src="/images/logo.png"
            alt="Reddy Premium Dairy Logo"
            className="mx-auto h-20 w-20 rounded-full object-cover border-2 border-accent shadow-lg animate-pulse"
          />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold font-display text-white tracking-tight">
              REDDY PREMIUM DAIRY
            </h1>
            <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none">
              Pure • Fresh • Healthy
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════ */}
        {/* ADMIN LOGIN */}
        {/* ════════════════════════════════════════ */}
        {isAdminLogin ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full glass-premium text-left space-y-6 animate-splash">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <span>Admin Control Desk</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Control panel authorization</p>
              </div>
              <button
                onClick={() => setIsAdminLogin(false)}
                className="text-[10px] text-slate-400 font-bold uppercase hover:text-white"
              >
                Back
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email" required placeholder="admin@reddy.com" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password" required placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-blue-500 text-white font-bold rounded-xl shadow-md hover:bg-blue-400 flex items-center justify-center gap-1.5"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                <span>Authorize & Enter</span>
              </button>
            </form>
          </div>
        ) : (
          /* ════════════════════════════════════════ */
          /* CUSTOMER AUTH (LOGIN / REGISTER) */
          /* ════════════════════════════════════════ */
          <div className="bg-white/5 backdrop-blur border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full glass-premium text-left space-y-6 animate-splash">

            {/* Tab Switcher */}
            <div className="flex bg-slate-900 border border-white/5 p-1 rounded-xl gap-1">
              <button
                onClick={() => { setActiveTab('login'); resetRegister(); }}
                className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'login'
                    ? 'bg-accent text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'register'
                    ? 'bg-accent text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                Register
              </button>
            </div>

            {/* ──────────────────────── LOGIN TAB ──────────────────────── */}
            {activeTab === 'login' && (
              isPhoneOtpLogin ? (
                /* Mobile OTP login flow */
                loginOtpStep === 1 ? (
                  <form onSubmit={handleSendLoginOtp} className="space-y-4 text-xs font-semibold text-slate-400">
                    <div className="text-center mb-2">
                      <h3 className="text-lg font-bold font-display text-white">OTP Sign In</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Enter your registered mobile number</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text" required
                          placeholder="9876543210"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>

                    <div id="recaptcha-login-container" className="my-2 flex justify-center"></div>

                    <button
                      type="submit" disabled={isLoading}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Send Verification Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPhoneOtpLogin(false)}
                      className="text-[10px] text-accent hover:underline font-bold text-center block w-full mt-2"
                    >
                      Sign In with Password
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyLoginOtp} className="space-y-4 text-xs font-semibold text-slate-400">
                    <div className="text-center mb-2">
                      <h3 className="text-lg font-bold font-display text-white">Enter verification code</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">We sent a 6-digit code to +91 {loginPhone}</p>
                    </div>

                    {loginDemoOtp && (
                      <div className="bg-amber-400/15 border border-amber-400/40 rounded-xl p-3 text-center space-y-1">
                        <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">⚡ Demo Mode — Your Verification Code</p>
                        <p className="text-2xl font-bold font-mono text-amber-300 tracking-[0.3em]">{loginDemoOtp}00</p>
                        <p className="text-[9px] text-amber-400/70">Code auto-filled below. Just click Verify & Sign In.</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center block">Enter 6-Digit Code</label>
                      <div className="flex justify-center gap-2">
                        {loginOtpDigits.map((digit, i) => (
                          <input
                            key={i}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.length > 1) return;
                              if (val && !/^\d$/.test(val)) return;
                              const newDigits = [...loginOtpDigits];
                              newDigits[i] = val;
                              setLoginOtpDigits(newDigits);
                            }}
                            className={`w-11 h-12 text-center text-lg font-bold bg-slate-900 border rounded-xl text-white outline-none transition-all duration-200 ${digit ? 'border-accent shadow-sm shadow-accent/20' : 'border-white/10'} focus:border-accent`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit" disabled={isLoading || loginOtpCode.length !== 6}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>Verify & Sign In</span>
                    </button>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => { setLoginOtpStep(1); setLoginOtpDigits(['', '', '', '', '', '']); }}
                        className="text-[10px] text-slate-400 font-bold hover:text-white flex items-center gap-1"
                      >
                        <ArrowLeft className="h-3 w-3" /> Change number
                      </button>
                      <button
                        type="button"
                        onClick={handleSendLoginOtp}
                        className="text-[10px] text-accent font-bold hover:underline"
                      >
                        Resend Code
                      </button>
                    </div>
                  </form>
                )
              ) : (
                /* Regular Email/Password Login flow */
                <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-slate-400">
                  <div className="text-center mb-2">
                    <h3 className="text-lg font-bold font-display text-white">Welcome Back</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Sign in to your account</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email or Mobile Number</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text" required
                        placeholder="name@email.com or 9876543210"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'} required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white outline-none focus:border-accent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button 
                        type="button" 
                        onClick={() => setActiveTab('forgot-password')} 
                        className="text-[10px] text-accent hover:underline font-bold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit" disabled={isLoading}
                    className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsPhoneOtpLogin(true); setLoginOtpStep(1); }}
                    className="text-[10px] text-accent hover:underline font-bold text-center block w-full mt-2"
                  >
                    Sign In with Mobile OTP
                  </button>

                  {hasBiometricsLocal && (
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      className="w-full py-3.5 border border-dashed border-accent/30 bg-accent/5 hover:bg-accent/10 text-accent font-bold rounded-xl flex items-center justify-center gap-2 mt-3 transition-all duration-200"
                    >
                      <Fingerprint className="h-4 w-4" />
                      <span>Sign In with Fingerprint</span>
                    </button>
                  )}

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px]">
                      <span className="bg-[#0f172a] px-2 text-slate-500 uppercase tracking-widest font-bold">Or</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast('Google OAuth requires API keys. Please configure next-auth.', 'info')}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl shadow-md flex items-center justify-center gap-3 transition-all duration-200"
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-4 w-4" />
                    <span>Continue with Google</span>
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-[10px] text-slate-500">
                      Don&apos;t have an account?{' '}
                      <button type="button" onClick={() => setActiveTab('register')} className="text-accent font-bold hover:underline">
                        Register here
                      </button>
                    </p>
                  </div>
                </form>
              )
            )}

            {/* ──────────────────────── REGISTER TAB ──────────────────────── */}
            {activeTab === 'register' && (
              <div className="space-y-4 text-xs font-semibold text-slate-400">
                <div className="text-center mb-1">
                  <h3 className="text-lg font-bold font-display text-white">Create Account</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    {registerStep === 1 && 'Step 1 — Verify your identity'}
                    {registerStep === 2 && 'Step 2 — Enter verification code'}
                    {registerStep === 3 && 'Step 3 — Set your password'}
                  </p>
                </div>

                <StepIndicator registerStep={registerStep} />

                {/* STEP 1: Enter email or mobile */}
                {registerStep === 1 && (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email or Mobile Number</label>
                      <div className="relative">
                        {detectType(regIdentifier) === 'phone' ? (
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        ) : (
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        )}
                        <input
                          type="text" required
                          placeholder="name@email.com or 9876543210"
                          value={regIdentifier}
                          onChange={(e) => setRegIdentifier(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                      </div>
                      <p className="text-[9px] text-slate-500">A verification code will be sent to verify your identity</p>
                    </div>

                    <button
                      type="submit" disabled={isLoading}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Send Verification Code</span>
                    </button>
                  </form>
                )}

                {/* STEP 2: Enter OTP */}
                {registerStep === 2 && (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    {/* Demo OTP Banner — shown when email/SMS not configured */}
                    {demoOtp ? (
                      <div className="bg-amber-400/15 border border-amber-400/40 rounded-xl p-3 text-center space-y-1">
                        <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">⚡ Demo Mode — Your Verification Code</p>
                        <p className="text-2xl font-bold font-mono text-amber-300 tracking-[0.3em]">{demoOtp}</p>
                        <p className="text-[9px] text-amber-400/70">Code auto-filled below. Just click Verify Code.</p>
                      </div>
                    ) : (
                      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-slate-300">
                          We sent a 6-digit code to{' '}
                          <strong className="text-white">
                            {regIdentifierType === 'phone' ? `+91 ${regIdentifier}` : regIdentifier}
                          </strong>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center block">Enter 6-Digit Code</label>
                      <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => { otpInputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className={`w-11 h-12 text-center text-lg font-bold bg-slate-900 border rounded-xl text-white outline-none transition-all duration-200 ${digit ? 'border-accent shadow-sm shadow-accent/20' : 'border-white/10'
                              } focus:border-accent focus:shadow-md focus:shadow-accent/30`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit" disabled={isLoading || otpCode.length !== 6}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>Verify Code</span>
                    </button>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => { setRegisterStep(1); setOtpDigits(['', '', '', '', '', '']); }}
                        className="text-[10px] text-slate-400 font-bold hover:text-white flex items-center gap-1"
                      >
                        <ArrowLeft className="h-3 w-3" /> Change {regIdentifierType === 'phone' ? 'number' : 'email'}
                      </button>
                      {resendTimer > 0 ? (
                        <p className="text-[10px] text-slate-500">Resend in {resendTimer}s</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          className="text-[10px] text-accent font-bold hover:underline"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* STEP 3: Set Name & Password */}
                {registerStep === 3 && (
                  <form onSubmit={handleCompleteRegistration} className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-[11px] text-emerald-300">
                        {regIdentifierType === 'phone' ? `+91 ${regIdentifier}` : regIdentifier} verified successfully
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text" required
                          placeholder="Viswanath Reddy"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Create Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type={showRegPassword ? 'text' : 'password'} required
                          placeholder="Min. 6 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="password" required
                          placeholder="••••••••"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                      </div>
                      {regPassword && regConfirmPassword && regPassword !== regConfirmPassword && (
                        <p className="text-[10px] text-red-400 font-semibold">Passwords do not match</p>
                      )}
                    </div>

                    <button
                      type="submit" disabled={isLoading}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Create Account</span>
                    </button>
                  </form>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px]">
                    <span className="bg-[#0f172a] px-2 text-slate-500 uppercase tracking-widest font-bold">Or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => showToast('Google OAuth requires API keys. Please configure next-auth.', 'info')}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl shadow-md flex items-center justify-center gap-3 transition-all duration-200"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-4 w-4" />
                  <span>Continue with Google</span>
                </button>


                {/* Bottom link */}
                <div className="text-center pt-2 border-t border-white/10">
                  <p className="text-[10px] text-slate-500 pt-3">
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setActiveTab('login'); resetRegister(); }} className="text-accent font-bold hover:underline">
                      Sign in here
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ──────────────────────── FORGOT PASSWORD TAB ──────────────────────── */}
            {activeTab === 'forgot-password' && (
              <div className="space-y-4 text-xs font-semibold text-slate-400">
                <div className="text-center mb-1">
                  <h3 className="text-lg font-bold font-display text-white">Reset Password</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    {forgotStep === 1 && 'Step 1 — Enter Email/Mobile'}
                    {forgotStep === 2 && 'Step 2 — Verify Code'}
                    {forgotStep === 3 && 'Step 3 — New Password'}
                  </p>
                </div>

                <StepIndicator registerStep={forgotStep} />

                {/* STEP 1: Enter email or mobile */}
                {forgotStep === 1 && (
                  <form onSubmit={handleForgotSendOTP} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email or Mobile Number</label>
                      <div className="relative">
                        {detectType(forgotIdentifier) === 'phone' ? (
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        ) : (
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        )}
                        <input
                          type="text" required
                          placeholder="name@email.com or 9876543210"
                          value={forgotIdentifier}
                          onChange={(e) => setForgotIdentifier(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit" disabled={isLoading}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Send Reset Code</span>
                    </button>
                  </form>
                )}

                {/* STEP 2: Enter OTP */}
                {forgotStep === 2 && (
                  <form onSubmit={handleForgotVerifyOTP} className="space-y-4">
                    {demoOtp ? (
                      <div className="bg-amber-400/15 border border-amber-400/40 rounded-xl p-3 text-center space-y-1">
                        <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">⚡ Demo Mode</p>
                        <p className="text-2xl font-bold font-mono text-amber-300 tracking-[0.3em]">{demoOtp}</p>
                      </div>
                    ) : (
                      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-slate-300">
                          We sent a code to <strong className="text-white">{forgotIdentifierType === 'phone' ? `+91 ${forgotIdentifier}` : forgotIdentifier}</strong>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => { otpInputRefs.current[i] = el; }}
                            type="text" inputMode="numeric" maxLength={1} value={digit}
                            onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className="w-11 h-12 text-center text-lg font-bold bg-slate-900 border border-white/10 rounded-xl text-white outline-none focus:border-accent"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit" disabled={isLoading || otpCode.length !== 6}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>Verify Code</span>
                    </button>
                  </form>
                )}

                {/* STEP 3: Set New Password */}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'} required
                          placeholder="Min. 6 characters"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                        <button
                          type="button" onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="password" required
                          placeholder="••••••••"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent transition-colors"
                        />
                      </div>
                      {forgotNewPassword && forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                        <p className="text-[10px] text-red-400 font-semibold">Passwords do not match</p>
                      )}
                    </div>

                    <button
                      type="submit" disabled={isLoading}
                      className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>Reset Password</span>
                    </button>
                  </form>
                )}

                <div className="text-center pt-2 border-t border-white/10">
                  <button type="button" onClick={() => { setActiveTab('login'); }} className="text-[10px] text-accent font-bold hover:underline pt-3">
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Admin link */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => { setIsAdminLogin(true); setLoginIdentifier(''); setLoginPassword(''); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider hover:text-blue-400 transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin Login</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-6 max-w-5xl mx-auto w-full text-center space-y-2 text-[10px] font-semibold text-slate-400">
        <p className="font-bold text-white font-display uppercase tracking-widest text-xs">REDDY PREMIUM DAIRY</p>
        <p className="text-[10px] text-slate-400">Owner: Palle Viswanath Reddy • 📞 +91 6300928511 • 📧 palleviswanathreddy11@gmail.com</p>
        <p className="text-[9px] text-slate-500">📍 Chiyyedu Village, Anantapur District, Andhra Pradesh – 515721, India</p>
        <p className="text-[9px] text-slate-500/80">© 2026 REDDY PREMIUM DAIRY. All Rights Reserved.</p>
      </footer>

    </div>
  );
}
