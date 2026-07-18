'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { 
  CheckCircle2, CreditCard, Ticket, 
  MapPin, ShieldCheck, ArrowRight, ArrowLeft, Download,
  Search, Loader2, Check, X 
} from 'lucide-react';
import Script from 'next/script';
import confetti from 'canvas-confetti';

export default function Checkout() {
  const router = useRouter();
  const { 
    cart, 
    user, 
    appliedCoupon, 
    applyCouponCode, 
    removeCoupon, 
    createOrder,
    clearCart,
    showToast,
    t
  } = useApp();

  const [isMounted, setIsMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(1); // 1: Address, 2: Payment, 3: Success

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0 && activeStep < 3) {
      router.push('/products');
    }
  }, [cart, router, activeStep]);

  // Address form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [village, setVillage] = useState('');
  const [mandal, setMandal] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Morning 6:00 AM - 9:00 AM');

  // UPI QR States
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(5);
  const [qrVerifying, setQrVerifying] = useState(false);
  const [generatedQRUrl, setGeneratedQRUrl] = useState('');

  // PIN Code Auto-fill State
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeSuccess, setPincodeSuccess] = useState(false);
  const [availableVillages, setAvailableVillages] = useState<string[]>([]);

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState('Razorpay');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Wallet State
  const [useWallet, setUseWallet] = useState(false);

  // Success Order details
  const [completedOrderId, setCompletedOrderId] = useState('');

  // Load default address if logged in
  useEffect(() => {
    if (user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(user.name || '');
      setPhone(user.phone || '');
      const defAddr = user.addresses.find(a => a.isDefault);
      if (defAddr) {
        setStreet(defAddr.street || '');
        setVillage(defAddr.village || '');
        setDistrict(defAddr.district || '');
        setState(defAddr.state || 'Andhra Pradesh');
        setPincode(defAddr.pincode || '');
        if (defAddr.mandal) setMandal(defAddr.mandal || '');
        if (defAddr.village) setAvailableVillages([defAddr.village]);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [user]);

  // Handle PIN Code Auto Fill
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      if (pincode.length === 6 && /^\d+$/.test(pincode)) {
        setPincodeLoading(true);
        setPincodeError('');
        setPincodeSuccess(false);
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await res.json();
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffices = data[0].PostOffice;
            const firstPO = postOffices[0];
            
            setState(firstPO.State);
            setDistrict(firstPO.District);
            if (firstPO.Block && firstPO.Block !== 'NA') {
              setMandal(firstPO.Block);
            }
            
            const villages = postOffices.map((po: { Name: string }) => po.Name);
            setAvailableVillages(villages);
            if (villages.length > 0 && !villages.includes(village)) {
              setVillage(villages[0]);
            }
            setPincodeSuccess(true);
          } else {
            setPincodeError('Invalid PIN Code');
          }
        } catch {
          setPincodeError('Unable to fetch address. Please enter manually.');
        } finally {
          setPincodeLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchPincodeDetails, 500);
    return () => clearTimeout(timeoutId);
  }, [pincode, village]);

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const gstTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity * (item.product.gst / 100)), 0);
  let deliveryCharges = subtotal > 0 && subtotal < 150 ? 20 : 0;

  // Coupon Discount
  let discountAmount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.minPurchase) {
    if (appliedCoupon.type === 'flat') {
      discountAmount = appliedCoupon.value;
    } else if (appliedCoupon.type === 'percentage') {
      discountAmount = subtotal * (appliedCoupon.value / 100);
      if (appliedCoupon.maxDiscount && discountAmount > appliedCoupon.maxDiscount) {
        discountAmount = appliedCoupon.maxDiscount;
      }
    } else if (appliedCoupon.type === 'free_shipping') {
      deliveryCharges = 0;
      discountAmount = 0;
    }
  }

  const totalBeforeWallet = Math.max(0, subtotal + gstTotal + deliveryCharges - discountAmount);
  
  // Wallet Discount
  let walletDiscount = 0;
  if (useWallet && user?.walletBalance) {
    walletDiscount = Math.min(user.walletBalance, totalBeforeWallet - 1); // Keep at least Rs 1 for gateway
  }
  
  const grandTotal = Math.max(0, totalBeforeWallet - walletDiscount);

  // Address step next
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !street || !pincode) {
      showToast("Please fill all required shipping fields", "error");
      return;
    }
    setActiveStep(2);
  };

  // Coupon apply
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    const res = await applyCouponCode(couponCode.trim());
    setCouponLoading(false);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCode('');
    }
  };

  // Submit Order final
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    showToast("Processing transaction...", "info");
    
    const items = cart.map(item => ({
      productId: item.product.id,
      sku: item.product.sku,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      gst: item.product.gst
    }));

    const deliveryAddress = {
      name,
      phone,
      street,
      village,
      mandal,
      district,
      state,
      pincode
    };

    const finalOrderData = {
      items,
      subtotal,
      gstTotal,
      deliveryCharges,
      discount: discountAmount + walletDiscount, // Total discount includes wallet
      grandTotal,
      paymentMethod,
      deliveryAddress,
      giftMessage,
      deliveryInstructions,
      deliverySlot // NOTE: Normally this should be added to the createOrder signature in AppContext
    };

    if (paymentMethod === 'Razorpay') {
      try {
        // Deduct wallet if used
        if (useWallet && walletDiscount > 0 && user) {
          await fetch('/api/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              amount: walletDiscount,
              type: 'debit',
              description: 'Redeemed on checkout'
            })
          });
        }

        const res = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Math.round(grandTotal * 100) })
        });
        const data = await res.json();

        if (!data.success) {
          showToast('Failed to initialize payment', 'error');
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'mock_key',
          amount: data.order.amount,
          currency: data.order.currency,
          name: "Reddy Premium Dairy",
          description: "Organic Milk Delivery",
          order_id: data.order.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handler: async function (response: any) {
            // Success handler
            showToast("Verifying secure payment...", "info");
            
            try {
              const verifyRes = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response?.razorpay_order_id || data.order.id,
                  razorpay_payment_id: response?.razorpay_payment_id || 'mock_payment_id',
                  razorpay_signature: response?.razorpay_signature || 'mock_signature',
                  orderData: finalOrderData,
                  isMock: !!data.mock
                })
              });
              
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                clearCart();
                setCompletedOrderId(verifyData.order.id || 'ORD-ERROR');
                setActiveStep(3);
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
              } else {
                showToast(verifyData.message || 'Payment verification failed.', 'error');
              }
            } catch {
              showToast('Error verifying payment.', 'error');
            }
          },
          prefill: { name, contact: phone, email: user?.email || '' },
          theme: { color: "#10b981" }
        };

        if (data.mock) {
          showToast('Using Mock Razorpay. Completing test payment...', 'success');
          setTimeout(() => options.handler({ 
            razorpay_payment_id: 'mock_pay_123', 
            razorpay_order_id: data.order.id, 
            razorpay_signature: 'mock_sig_123' 
          }), 1000);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            showToast(response.error.description || 'Payment failed. Please try again.', 'error');
          });
          rzp.open();
        }
      } catch {
        showToast('Payment initialization failed', 'error');
      }
    } else if (paymentMethod === 'UPI') {
      const tempId = `ORD-${Date.now()}`;
      const upiUrl = `upi://pay?pa=6300928511@ybl&pn=Palle Viswanatha Reddy&am=${grandTotal.toFixed(2)}&cu=INR&tn=${tempId}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
      
      setGeneratedQRUrl(qrApiUrl);
      setShowQRModal(true);
      setQrCountdown(5);
      setQrVerifying(false);

      let count = 5;
      const interval = setInterval(() => {
        count--;
        setQrCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          setQrVerifying(true);
          
          setTimeout(async () => {
            try {
              if (useWallet && walletDiscount > 0 && user) {
                await fetch('/api/wallet', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.id,
                    amount: walletDiscount,
                    type: 'debit',
                    description: 'Redeemed on UPI QR order'
                  })
                });
              }

              const orderPayload = {
                ...finalOrderData,
                paymentStatus: 'Paid' as const
              };

              const res = await createOrder(orderPayload);
              if (res.success && res.orderId) {
                clearCart();
                setCompletedOrderId(res.orderId || 'ORD-ERROR');
                setActiveStep(3);
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
              } else {
                showToast('Failed to create order', 'error');
              }
            } catch (err) {
              console.error(err);
              showToast('Error finalizing transaction', 'error');
            } finally {
              setShowQRModal(false);
              setQrVerifying(false);
            }
          }, 1500);
        }
      }, 1000);
    } else {
      setTimeout(async () => {
        // For COD, process wallet deduction immediately
        if (useWallet && walletDiscount > 0 && user) {
          await fetch('/api/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              amount: walletDiscount,
              type: 'debit',
              description: 'Redeemed on COD order'
            })
          });
        }
        const res = await createOrder(finalOrderData);
        if (res.success && res.orderId) {
          setCompletedOrderId(res.orderId || 'ORD-ERROR');
          setActiveStep(3);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }
      }, 1500);
    }
  };

  if (!isMounted) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-left">
        
        {/* Progress Timeline Header */}
        <div className="flex items-center justify-center gap-4 max-w-xl mx-auto mb-10 text-xs font-bold uppercase tracking-wider text-slate-400">
          <div className={`flex items-center gap-1.5 ${activeStep >= 1 ? 'text-primary dark:text-accent font-extrabold' : ''}`}>
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-900 border flex items-center justify-center">1</span>
            <span>Address</span>
          </div>
          <div className="h-0.5 w-16 bg-slate-200 dark:bg-slate-800" />
          <div className={`flex items-center gap-1.5 ${activeStep >= 2 ? 'text-primary dark:text-accent font-extrabold' : ''}`}>
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-900 border flex items-center justify-center">2</span>
            <span>Payment</span>
          </div>
          <div className="h-0.5 w-16 bg-slate-200 dark:bg-slate-800" />
          <div className={`flex items-center gap-1.5 ${activeStep >= 3 ? 'text-primary dark:text-accent font-extrabold' : ''}`}>
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-900 border flex items-center justify-center">3</span>
            <span>Receipt</span>
          </div>
        </div>

        {/* STEP 3: SUCCESS BLOCK */}
        {activeStep === 3 ? (
          <div className="max-w-2xl mx-auto p-8 border border-slate-150 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-xl text-center space-y-6 animate-splash">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display text-primary dark:text-white">Order Milked Successfully!</h2>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Order ID: #{completedOrderId.slice(4)}</p>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
              Thank you for choosing <strong>Reddy Premium Dairy</strong>. We have logged your purchase details. Your organic products are being packed in chilled containment ready for morning delivery!
            </p>

            <div className="p-4 border bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">Recipient:</span>
                <span className="text-slate-850 dark:text-slate-200">{name}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">Total Paid:</span>
                <span className="text-slate-850 dark:text-accent font-bold">Rs. {grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">Delivery Slot:</span>
                <span className="text-slate-850 dark:text-slate-200">{deliverySlot}</span>
              </div>
            </div>

            <div className="flex gap-4 max-w-sm mx-auto pt-4">
              <button 
                onClick={() => router.push(`/orders/${completedOrderId}`)}
                className="flex-1 py-3 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Track Order
              </button>
              <button 
                onClick={() => window.open(`/invoice/${completedOrderId}`, '_blank')}
                className="flex-1 py-3 bg-primary text-white hover:bg-primary-light dark:bg-accent dark:text-slate-900 dark:hover:bg-accent-light font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Invoice</span>
              </button>
              <button 
                onClick={() => router.push('/products')}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
              >
                Buy More
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1 & 2 WIZARDS AND SUMMARY SIDEBAR */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Form Left Wizards */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* STEP 1: DELIVERY ADDRESS DETAILS */}
              {activeStep === 1 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6 animate-splash">
                  <div className="flex items-center gap-2 border-b pb-3.5">
                    <MapPin className="h-5 w-5 text-accent" />
                    <h3 className="text-base font-bold font-display text-primary dark:text-white">Delivery Address</h3>
                  </div>
                  
                  <form onSubmit={handleAddressSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                        <input
                          id="checkout-name"
                          name="checkoutName"
                          autoComplete="name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-phone" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                        <input
                          id="checkout-phone"
                          name="checkoutPhone"
                          autoComplete="tel"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="checkout-street" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Street Address / House No *</label>
                      <input
                        id="checkout-street"
                        name="checkoutStreet"
                        autoComplete="street-address"
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5 relative">
                      <label htmlFor="checkout-pincode" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PIN Code *</label>
                      <div className="relative">
                        <input
                          id="checkout-pincode"
                          name="checkoutPincode"
                          autoComplete="postal-code"
                          type="text"
                          required
                          maxLength={6}
                          placeholder="6-digit PIN"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                          className={`w-full bg-slate-50 dark:bg-slate-955 border rounded-xl pl-10 pr-10 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200 transition-colors ${
                            pincodeError ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 
                            pincodeSuccess ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : ''
                          }`}
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        {pincodeLoading && (
                          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-accent animate-spin" />
                        )}
                        {pincodeSuccess && (
                          <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                        )}
                        {pincodeError && (
                          <X className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {pincodeError && <p className="text-[10px] text-red-500 font-bold mt-1">{pincodeError}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-state" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State</label>
                        <input
                          id="checkout-state"
                          name="checkoutState"
                          autoComplete="address-level1"
                          type="text"
                          readOnly
                          value={state}
                          className="w-full bg-slate-100 dark:bg-slate-900 border rounded-xl px-4 py-3 outline-none text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-district" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">District</label>
                        <input
                          id="checkout-district"
                          name="checkoutDistrict"
                          autoComplete="address-level2"
                          type="text"
                          readOnly
                          value={district}
                          className="w-full bg-slate-100 dark:bg-slate-900 border rounded-xl px-4 py-3 outline-none text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-mandal" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mandal / Taluk</label>
                        <input
                          id="checkout-mandal"
                          name="checkoutMandal"
                          type="text"
                          readOnly={mandal !== '' && pincodeSuccess}
                          value={mandal}
                          onChange={(e) => setMandal(e.target.value)}
                          className={`w-full border rounded-xl px-4 py-3 outline-none focus:border-accent ${
                            mandal !== '' && pincodeSuccess ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-200'
                          }`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-village" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Village / Post Office *</label>
                        {availableVillages.length > 0 ? (
                          <select
                            id="checkout-village"
                            name="checkoutVillage"
                            value={village}
                            onChange={(e) => setVillage(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200 appearance-none"
                          >
                            {availableVillages.map((v, i) => (
                              <option key={i} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id="checkout-village"
                            name="checkoutVillage"
                            type="text"
                            required
                            value={village}
                            onChange={(e) => setVillage(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="checkout-landmark" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Landmark (Optional)</label>
                      <input
                        id="checkout-landmark"
                        name="checkoutLandmark"
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="checkout-delivery-instructions" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Special Delivery Instructions</label>
                      <input
                        id="checkout-delivery-instructions"
                        name="checkoutDeliveryInstructions"
                        type="text"
                        placeholder="e.g. Leave milk pouch in box near door"
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="checkout-gift-message" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gift Message (Optional)</label>
                      <input
                        id="checkout-gift-message"
                        name="checkoutGiftMessage"
                        type="text"
                        placeholder="Happy morning greetings from..."
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="checkout-delivery-slot" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preferred Delivery Slot *</label>
                      <select 
                        id="checkout-delivery-slot"
                        name="checkoutDeliverySlot"
                        value={deliverySlot}
                        onChange={(e) => setDeliverySlot(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      >
                        <option value="Morning (6:00 AM - 9:00 AM)">Morning (6:00 AM - 9:00 AM)</option>
                        <option value="Evening (5:00 PM - 8:00 PM)">Evening (5:00 PM - 8:00 PM)</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full h-12 bg-primary text-white hover:bg-primary-light dark:bg-slate-800 font-bold rounded-xl mt-4 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2: PAYMENT OPTIONS SELECTION */}
              {activeStep === 2 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6 animate-splash text-xs font-semibold">
                  <div className="flex items-center gap-2 border-b pb-3.5">
                    <CreditCard className="h-5 w-5 text-accent" />
                    <h3 className="text-base font-bold font-display text-primary dark:text-white">Choose Payment Method</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'Razorpay', title: 'Razorpay (Cards, UPI, NetBanking)', desc: 'Secure payment via Razorpay' },
                      { id: 'UPI', title: 'UPI QR Codes', desc: 'Google Pay / PhonePe / Paytm' },
                      { id: 'COD', title: 'Cash on Delivery (COD)', desc: 'Pay cash when milk arrives' }
                    ].map(pay => (
                      <button
                        key={pay.id}
                        type="button"
                        onClick={() => setPaymentMethod(pay.id)}
                        className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          paymentMethod === pay.id 
                            ? 'border-accent bg-accent/5' 
                            : 'border-slate-150 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-950'
                        }`}
                      >
                        <p className="font-bold text-slate-800 dark:text-white">{pay.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">{pay.desc}</p>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handlePlaceOrder} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    
                    {/* Razorpay Information */}
                    {paymentMethod === 'Razorpay' && (
                      <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl flex items-start gap-2.5 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed font-semibold">
                          You will be redirected to Razorpay&apos;s secure checkout modal. You can pay using any Credit/Debit Card, UPI app, or NetBanking.
                        </p>
                      </div>
                    )}

                    {/* UPI QR Code simulation */}
                    {paymentMethod === 'UPI' && (
                      <div className="p-5 border border-dashed rounded-2xl bg-slate-50 dark:bg-slate-950/20 text-center space-y-3 flex flex-col items-center">
                        <div className="h-40 w-40 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white flex items-center justify-center shadow-md">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=6300928511@ybl&pn=Palle Viswanatha Reddy&am=${grandTotal.toFixed(2)}&cu=INR`)}`} 
                            alt="UPI QR Code" 
                            className="h-36 w-36 object-contain"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">UPI ID: 6300928511@ybl</p>
                        <p className="text-[11px] text-slate-500 font-semibold max-w-xs leading-relaxed">
                          Scan this QR code using any UPI App (PhonePe, GPay, Paytm). The order will verify and process automatically after you click place order.
                        </p>
                      </div>
                    )}

                    {/* COD Banner */}
                    {paymentMethod === 'COD' && (
                      <div className="p-4 border border-secondary/20 bg-secondary/5 rounded-2xl flex items-start gap-2.5 text-secondary dark:text-emerald-400">
                        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed font-semibold">
                          You have opted to pay in Cash upon delivery. Please ensure exact change is ready for our delivery executive to prevent slot delays.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setActiveStep(1)}
                        className="py-3.5 border border-slate-200 dark:border-slate-800 rounded-xl font-bold flex items-center justify-center gap-1.5 w-32"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                      </button>
                      <button 
                        type="submit"
                        className="flex-grow py-3.5 bg-accent text-slate-900 hover:bg-accent-light font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-transform"
                      >
                        <span>Place Order (Rs. {grandTotal.toFixed(2)})</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                  </form>
                </div>
              )}

            </div>

            {/* Calculations Breakdown Sidebar Right */}
            <div className="lg:col-span-4">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
                
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white font-display border-b pb-3 flex justify-between">
                  <span>{t('cartSummary')}</span>
                  <span>({cart.length} items)</span>
                </h3>

                {/* Items preview list */}
                <div className="max-h-56 overflow-y-auto space-y-3.5 pr-2">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-start gap-3 text-xs">
                      <div className="min-w-0 text-left">
                        <p className="font-bold text-slate-850 dark:text-slate-200 truncate">{item.product.name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Qty: {item.quantity} • {item.product.weight}</p>
                      </div>
                      <span className="font-extrabold text-slate-850 dark:text-slate-200">Rs. {(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Coupon application form */}
                {activeStep < 3 && (
                  appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-secondary/25 bg-secondary/5 text-secondary dark:text-emerald-400 text-xs">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 shrink-0" />
                        <div className="text-left font-semibold">
                          <p className="font-bold uppercase tracking-wider">{appliedCoupon.code}</p>
                          <p className="text-[9px] text-slate-450">{appliedCoupon.description}</p>
                        </div>
                      </div>
                      <button 
                        onClick={removeCoupon}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="space-y-1.5 text-xs font-semibold">
                      <div className="flex gap-2">
                        <input
                          id="checkout-coupon-code"
                          name="checkoutCouponCode"
                          autoComplete="off"
                          type="text"
                          placeholder={t('enterCoupon')}
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-grow bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-accent"
                        />
                        <button 
                          type="submit"
                          disabled={couponLoading}
                          className="px-3.5 py-2.5 bg-primary text-white dark:bg-slate-850 text-xs font-bold rounded-xl"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[9px] font-bold text-red-500 text-left px-1">{couponError}</p>
                      )}
                    </form>
                  )
                )}

                {/* Calculations values block */}
                <div className="space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-450 border-t border-b border-slate-100 dark:border-slate-800 py-4 text-left">
                  <div className="flex justify-between">
                    <span>{t('subtotal')}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-250">Rs. {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('gst')}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-250">Rs. {gstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('shipping')}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-250">
                      {deliveryCharges === 0 ? 'FREE' : `Rs. ${deliveryCharges.toFixed(2)}`}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-secondary dark:text-emerald-400">
                      <span>{t('discount')}</span>
                      <span className="font-bold">- Rs. {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Wallet Option UI */}
                  {user && user.walletBalance > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer group text-slate-700 dark:text-slate-300" htmlFor="checkout-use-wallet">
                        <input
                          id="checkout-use-wallet"
                          name="checkoutUseWallet"
                          type="checkbox"
                          checked={useWallet}
                          onChange={(e) => setUseWallet(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/20 cursor-pointer"
                        />
                        <span className="flex-1">Use Reddy Coins</span>
                        <span className="text-accent font-bold text-[10px] bg-accent/10 px-2 py-0.5 rounded-full group-hover:bg-accent/20 transition-colors">
                          Bal: {user.walletBalance}
                        </span>
                      </label>
                      {useWallet && walletDiscount > 0 && (
                        <div className="flex justify-between text-accent mt-2">
                          <span>Coins Redeemed</span>
                          <span className="font-bold">- Rs. {walletDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center text-left">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Grand Total</span>
                  <span className="text-lg font-extrabold text-primary dark:text-accent font-display">
                    Rs. {grandTotal.toFixed(2)}
                  </span>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

      {/* UPI QR Code Verification Overlay Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-left">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 w-full max-w-sm space-y-6 text-center animate-splash text-slate-800 dark:text-slate-200 relative overflow-hidden">
            
            {/* Background glowing sphere */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <h3 className="text-base font-extrabold font-display text-primary dark:text-white">UPI QR Code Payment</h3>
            
            {/* Dynamic QR Code display */}
            <div className="h-48 w-48 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-white flex items-center justify-center mx-auto shadow-md relative group">
              {qrVerifying ? (
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <Loader2 className="w-10 h-10 animate-spin text-primary animate-pulse" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verifying...</p>
                </div>
              ) : (
                <img 
                  src={generatedQRUrl} 
                  alt="Scan UPI QR" 
                  className="h-44 w-44 object-contain"
                />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Amount: <span className="text-primary dark:text-accent font-black">Rs. {grandTotal.toFixed(2)}</span></p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">Payee: Palle Viswanatha Reddy<br/>UPI VPA: 6300928511@ybl</p>
            </div>

            {/* Countdown / Verification status banner */}
            <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/40 text-center font-sans">
              {qrVerifying ? (
                <p className="text-xs font-bold text-primary dark:text-accent flex items-center justify-center gap-1.5 animate-pulse">
                  <ShieldCheck className="h-4 w-4 animate-bounce" /> Securing Settlement with Bank...
                </p>
              ) : (
                <p className="text-xs font-semibold text-slate-500 leading-normal">
                  Please scan the QR code with your UPI App. Checking payment status automatically in <span className="font-extrabold text-primary dark:text-accent text-sm font-mono">{qrCountdown}s</span>...
                </p>
              )}
            </div>

            <div className="text-[10px] font-semibold text-slate-400 leading-relaxed">
              Do not close this modal or go back. The order will progress automatically as soon as the bank settles your payment.
            </div>

          </div>
        </div>
      )}

    </PageWrapper>
  );
}
