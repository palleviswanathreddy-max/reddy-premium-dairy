'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  Lock, Mail, User, Phone, ShieldCheck, 
  ArrowLeft, Smartphone, LayoutDashboard, 
  ShoppingBag, KeyRound, Sparkles, CheckCircle2, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const { login, register, showToast, addNotification } = useApp();

  const [loginRole, setLoginRole] = useState<'select' | 'customer' | 'admin'>('select');
  const [authMethod, setAuthMethod] = useState<'email' | 'otp' | 'emailOtp'>('email'); // for customer
  const [isRegister, setIsRegister] = useState(false); // for customer

  // Email login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Mobile OTP login inputs
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Email OTP login inputs
  const [emailOtpAddress, setEmailOtpAddress] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Registration inputs
  const [name, setName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Start 30s resend countdown
  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Send Email OTP
  const handleSendEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailOtpAddress || !emailRegex.test(emailOtpAddress)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setIsLoading(true);
    showToast('Sending verification code to your email...', 'info');
    try {
      const res = await fetch('/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOtpAddress })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        setEmailOtpSent(true);
        startResendTimer();
        showToast('Verification code sent to your email!', 'success');
      } else {
        showToast(data.message || 'Failed to send email OTP', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtpCode || emailOtpCode.length !== 6) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOtpAddress, otpCode: emailOtpCode })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.success) {
        const syncCtx = await login(data.user.email, 'email-otp-account');
        showToast('Email verified! Welcome to Reddy Premium Dairy.', 'success');
        router.push('/profile');
      } else {
        showToast(data.message || 'Invalid verification code', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, 'error');
    }
  };

  // Send real backend OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length !== 10) {
      showToast("Please enter a valid 10-digit mobile number", "error");
      return;
    }

    setIsLoading(true);
    showToast("Sending secure verification code...", "info");

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      setIsLoading(false);
      
      if (data.success) {
        setOtpSent(true);
        if (data.debugMsg) {
          showToast(data.debugMsg, "info");
        } else {
          showToast("OTP code sent successfully!", "success");
        }
      } else {
        showToast(data.message || "Failed to send OTP", "error");
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, "error");
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      showToast("Please enter the 6-digit OTP code", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otpCode })
      });
      const data = await res.json();
      setIsLoading(false);
      
      if (data.success) {
        // Update global auth context state
        const resCtx = await login(data.user.email, 'otp-registered-account'); // login local cache
        if (resCtx.success) {
          showToast("OTP verified! Welcome back.", "success");
          router.push('/profile');
        }
      } else {
        showToast(data.message || "Invalid verification code", "error");
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, "error");
    }
  };

  // Handle traditional Login
  const handleTraditionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        // Sync local context cache state
        const syncCtx = await login(email, password);
        if (syncCtx.success) {
          showToast("Login successful!", "success");
          if (loginRole === 'admin') {
            router.push('/admin');
          } else {
            router.push('/profile');
          }
        }
      } else {
        showToast(data.message || "Invalid credentials", "error");
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, "error");
    }
  };

  // Handle registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: regEmail,
          phone: regPhone,
          password: regPassword
        })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        showToast("Registration successful! Logging you in...", "success");
        const syncCtx = await login(regEmail, regPassword);
        if (syncCtx.success) {
          router.push('/profile');
        }
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message, "error");
    }
  };

  // Google Sign-In Simulation
  const handleGoogleLogin = () => {
    showToast("Connecting to Google OAuth accounts...", "info");
    setTimeout(async () => {
      const syncCtx = await login('customer@gmail.com', 'user123');
      if (syncCtx.success) {
        showToast("Logged in via Google", "success");
        router.push('/profile');
      }
    }, 1500);
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
        
        {/* Core Brand Header */}
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

        {/* 1. TAB SELECTION ROLE SELECT CARDS */}
        {loginRole === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl animate-splash">
            
            {/* Customer card */}
            <div 
              onClick={() => setLoginRole('customer')}
              className="bg-white/5 backdrop-blur border border-white/10 hover:border-accent rounded-3xl p-8 shadow-xl text-center space-y-6 cursor-pointer hover:scale-[1.02] transition-all group glass-premium"
            >
              <div className="h-16 w-16 bg-accent/15 text-accent rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display text-white group-hover:text-accent">Customer Entrance</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-xs mx-auto">
                  Shop premium dairy products, track order pipelines, manage your addresses, and redeem loyalty points.
                </p>
              </div>
              <button className="w-full py-3 bg-accent text-slate-900 text-xs font-bold rounded-xl shadow-md group-hover:bg-accent-light">
                Login as Customer
              </button>
            </div>

            {/* Admin card */}
            <div 
              onClick={() => setLoginRole('admin')}
              className="bg-white/5 backdrop-blur border border-white/10 hover:border-accent rounded-3xl p-8 shadow-xl text-center space-y-6 cursor-pointer hover:scale-[1.02] transition-all group glass-premium"
            >
              <div className="h-16 w-16 bg-primary/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display text-white group-hover:text-blue-400">Admin Control</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-xs mx-auto">
                  Manage product stock levels, confirm orders, update customer wallets, and view revenue analytics graphs.
                </p>
              </div>
              <button className="w-full py-3 border border-slate-700 text-white text-xs font-bold rounded-xl hover:bg-white/5 group-hover:border-blue-400">
                Login as Admin
              </button>
            </div>

          </div>
        )}

        {/* 2. ADMIN LOGIN FORM */}
        {loginRole === 'admin' && (
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
                onClick={() => setLoginRole('select')}
                className="text-[10px] text-slate-400 font-bold uppercase hover:text-white"
              >
                Back
              </button>
            </div>

            <form onSubmit={handleTraditionalSubmit} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input 
                    type="email" required placeholder="admin@reddy.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input 
                    type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-blue-500 text-white font-bold rounded-xl shadow-md hover:bg-blue-400 flex items-center justify-center gap-1.5"
              >
                {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <KeyRound className="h-4.5 w-4.5" />}
                <span>Authorize & Enter</span>
              </button>
            </form>
          </div>
        )}

        {/* 3. CUSTOMER AUTHENTICATION FORMS */}
        {loginRole === 'customer' && (
          <div className="bg-white/5 backdrop-blur border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full glass-premium text-left space-y-6 animate-splash">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-accent" />
                  <span>{isRegister ? 'Create Customer Account' : 'Customer Account Login'}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  {isRegister ? 'Join our organic family' : 'Welcome back to purity'}
                </p>
              </div>
              <button 
                onClick={() => {
                  if (otpSent) {
                    setOtpSent(false);
                  } else {
                    setLoginRole('select');
                    setIsRegister(false);
                  }
                }}
                className="text-[10px] text-slate-400 font-bold uppercase hover:text-white"
              >
                Back
              </button>
            </div>

            {/* TAB SELECTION METHOD */}
            {!isRegister && !otpSent && !emailOtpSent && (
              <div className="flex bg-slate-900 border border-white/5 p-1 rounded-xl gap-1">
                <button 
                  onClick={() => setAuthMethod('email')}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors ${authMethod === 'email' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                >
                  Password
                </button>
                <button 
                  onClick={() => setAuthMethod('emailOtp')}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors ${authMethod === 'emailOtp' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                >
                  Email OTP
                </button>
                <button 
                  onClick={() => setAuthMethod('otp')}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors ${authMethod === 'otp' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                >
                  Mobile OTP
                </button>
              </div>
            )}

            {/* EMAIL OTP VERIFICATION VIEW */}
            {authMethod === 'emailOtp' && emailOtpSent ? (
              <form onSubmit={handleVerifyEmailOTP} className="space-y-4 text-xs font-semibold text-slate-400">
                <p className="text-[11px] leading-relaxed text-center text-slate-400">
                  We've sent a 6-digit verification code to <strong className="text-white">{emailOtpAddress}</strong>
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enter 6-Digit Code</label>
                  <input
                    type="text" required maxLength={6} placeholder="123456" value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-lg font-bold bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent"
                  />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5">
                  {isLoading && <span className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full" />}
                  <span>Verify Code & Login</span>
                </button>
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-[10px] text-slate-500">Resend code in {resendTimer}s</p>
                  ) : (
                    <button type="button" onClick={handleSendEmailOTP} className="text-[10px] text-accent font-bold hover:underline">
                      Resend Verification Code
                    </button>
                  )}
                </div>
              </form>
            ) : authMethod === 'emailOtp' && !isRegister ? (
              /* EMAIL OTP INPUT FORM */
              <form onSubmit={handleSendEmailOTP} className="space-y-4 text-xs font-semibold text-slate-400">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email" required placeholder="yourname@gmail.com" value={emailOtpAddress}
                      onChange={(e) => setEmailOtpAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500">A verification code will be sent to this email address</p>
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5">
                  {isLoading && <span className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full" />}
                  <Mail className="h-4 w-4" />
                  <span>Send Email Verification Code</span>
                </button>
              </form>
            ) : null}

            {/* OTP VERIFICATION VIEW */}
            {authMethod === 'otp' && otpSent ? (
              <form onSubmit={handleVerifyOTP} className="space-y-4 text-xs font-semibold text-slate-400">
                <p className="text-[11px] leading-relaxed text-slate-350 text-center">
                  We've sent a 6-digit verification code to <strong>{phone}</strong>. Verify using SMS.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enter 6-Digit OTP</label>
                  <input
                    type="text" required maxLength={6} placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-lg font-bold bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent"
                  />
                </div>

                <button 
                  type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  {isLoading && <span className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full" />}
                  <span>Verify OTP Code</span>
                </button>
              </form>
            ) : authMethod === 'otp' && !isRegister ? (
              /* OTP MOBILE INPUT FORM */
              <form onSubmit={handleSendOTP} className="space-y-4 text-xs font-semibold text-slate-400">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">+91</span>
                    <input
                      type="tel" required maxLength={10} placeholder="6300928511" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>

                <button 
                  type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  {isLoading && <span className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full" />}
                  <span>Send Verification OTP</span>
                </button>
              </form>
            ) : isRegister ? (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs font-semibold text-slate-400">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input 
                      type="text" required placeholder="Viswanath Reddy" value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Number</label>
                    <input 
                      type="tel" required placeholder="6300928511" value={regPhone} onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                    <input 
                      type="email" required placeholder="name@domain.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                    <input 
                      type="password" required placeholder="••••••••" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirm</label>
                    <input 
                      type="password" required placeholder="••••••••" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <button 
                  type="submit" disabled={isLoading}
                  className="w-full py-3 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md mt-4"
                >
                  Create Account
                </button>
              </form>
            ) : (
              /* TRADITIONAL CUSTOMER EMAIL/PASSWORD FORM */
              <form onSubmit={handleTraditionalSubmit} className="space-y-4 text-xs font-semibold text-slate-400">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input 
                      type="email" required placeholder="customer@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input 
                      type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <button 
                  type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  {isLoading && <span className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full" />}
                  <span>Sign In</span>
                </button>
              </form>
            )}

            {/* Social logins & toggles */}
            {!otpSent && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                {!isRegister && !isRegister && (
                  <div className="grid grid-cols-1 gap-2.5">
                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full py-2.5 border border-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-white"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                )}

                <div className="text-center">
                  <button 
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-[10.5px] text-accent hover:underline font-bold"
                  >
                    {isRegister ? 'Already have an account? Sign In' : 'New to Reddy Dairy? Register account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer details */}
      <footer className="border-t border-white/10 pt-6 max-w-5xl mx-auto w-full text-center space-y-2 text-[10px] font-semibold text-slate-400">
        <p className="font-bold text-white font-display uppercase tracking-widest text-xs">REDDY PREMIUM DAIRY</p>
        <p className="text-[10px] text-slate-400">Owner: Palle Viswanath Reddy • 📞 +91 6300928511 • 📧 palleviswanathreddy11@gmail.com</p>
        <p className="text-[9px] text-slate-500">📍 Chiyyedu Village, Anantapur District, Andhra Pradesh – 515721, India</p>
        <p className="text-[9px] text-slate-500/80">© 2026 REDDY PREMIUM DAIRY. All Rights Reserved.</p>
      </footer>

    </div>
  );
}
