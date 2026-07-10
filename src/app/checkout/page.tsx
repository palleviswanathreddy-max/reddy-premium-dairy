'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { 
  CheckCircle2, CreditCard, Ticket, 
  MapPin, ShieldCheck, ArrowRight, ArrowLeft 
} from 'lucide-react';
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
    showToast
  } = useApp();

  const [activeStep, setActiveStep] = useState(1); // 1: Address, 2: Payment, 3: Success

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
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [giftMessage, setGiftMessage] = useState('');

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Success Order details
  const [completedOrderId, setCompletedOrderId] = useState('');

  // Load default address if logged in
  useEffect(() => {
    if (user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(user.name);
      setPhone(user.phone);
      const defAddr = user.addresses.find(a => a.isDefault);
      if (defAddr) {
        setStreet(defAddr.street);
        setVillage(defAddr.village);
        setDistrict(defAddr.district);
        setState(defAddr.state);
        setPincode(defAddr.pincode);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [user]);

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
    } else if (appliedCoupon.type === 'free_shipping') {
      deliveryCharges = 0;
      discountAmount = 0;
    }
  }

  const grandTotal = Math.max(0, subtotal + gstTotal + deliveryCharges - discountAmount);

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
    
    // Card Validation if selected
    if (paymentMethod === 'CARD') {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        showToast("Please fill card details", "error");
        return;
      }
    }

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
      village: village || 'Chiyyedu',
      district: district || 'Anantapur',
      state,
      pincode
    };

    setTimeout(async () => {
      const res = await createOrder({
        items,
        subtotal,
        gstTotal,
        deliveryCharges,
        discount: discountAmount,
        grandTotal,
        paymentMethod,
        deliveryAddress,
        giftMessage,
        deliveryInstructions
      });

      if (res.success) {
        setCompletedOrderId(res.orderId || 'ORD-ERROR');
        setActiveStep(3);
        
        // Trigger Confetti explosion
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }, 1500);
  };

  return (
    <PageWrapper>
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
                <span className="text-slate-850 dark:text-slate-200">Morning 6:00 AM</span>
              </div>
            </div>

            <div className="flex gap-4 max-w-sm mx-auto pt-4">
              <button 
                onClick={() => router.push('/profile?tab=orders')}
                className="flex-1 py-3 bg-primary text-white dark:bg-slate-800 font-bold text-xs rounded-xl shadow-md"
              >
                Track Order
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Street Address / House No *</label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Village / Town</label>
                        <input
                          type="text"
                          value={village}
                          onChange={(e) => setVillage(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">District</label>
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PIN Code *</label>
                        <input
                          type="text"
                          required
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Landmark (Optional)</label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Special Delivery Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Leave milk pouch in box near door"
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gift Message (Optional)</label>
                      <input
                        type="text"
                        placeholder="Happy morning greetings from..."
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                      />
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
                      { id: 'UPI', title: 'UPI QR Codes', desc: 'Google Pay / PhonePe / Paytm' },
                      { id: 'CARD', title: 'Credit & Debit Cards', desc: 'Secure payment via Stripe/Visa' },
                      { id: 'COD', title: 'Cash on Delivery (COD)', desc: 'Pay cash when milk arrives' }
                    ].map(pay => (
                      <button
                        key={pay.id}
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
                    
                    {/* UPI QR Code simulation */}
                    {paymentMethod === 'UPI' && (
                      <div className="p-5 border border-dashed rounded-2xl bg-slate-50 dark:bg-slate-950/20 text-center space-y-3 flex flex-col items-center">
                        <div className="h-32 w-32 border-2 border-accent rounded-xl p-2 bg-white flex items-center justify-center shadow-md">
                          <span className="text-4xl">📱</span> {/* Simulated QR code */}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">UPI: reddypremium@upi</p>
                        <p className="text-[11px] text-slate-500 font-semibold max-w-xs leading-relaxed">
                          Scan the QR code with your mobile app to make an instant secure transfer. Order will process automatically upon payment verification.
                        </p>
                      </div>
                    )}

                    {/* CARD FIELDS */}
                    {paymentMethod === 'CARD' && (
                      <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-slate-950/20 space-y-4 text-left">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cardholder Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Kiran Kumar"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card Number</label>
                          <input
                            type="text"
                            required
                            maxLength={16}
                            placeholder="4111 2222 3333 4444"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</label>
                            <input
                              type="text"
                              required
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full bg-white dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CVV</label>
                            <input
                              type="password"
                              required
                              maxLength={3}
                              placeholder="•••"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-white dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                            />
                          </div>
                        </div>
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
    </PageWrapper>
  );
}
