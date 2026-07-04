'use client';

import React, { use } from 'react';
import PageWrapper from '@/components/PageWrapper';

export default function Policy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const getPolicyContent = () => {
    switch (slug) {
      case 'privacy':
        return {
          title: "Privacy Policy",
          desc: "How we collect, store, and secure your personal credentials at Reddy Premium Dairy.",
          content: `
            At REDDY PREMIUM DAIRY, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by REDDY PREMIUM DAIRY and how we use it.

            1. Information We Collect
            When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.

            2. How We Use Your Information
            We use the information we collect in various ways, including to:
            - Provide, operate, and maintain our website and delivery service
            - Improve, personalize, and expand our store collections
            - Understand and analyze how you use our web portal
            - Develop new products, services, features, and functionality
            - Communicate with you regarding order confirmations, updates, OTP verifications, and marketing offers.
            - Send simulated email, SMS, and WhatsApp invoices.

            3. Security
            We store passwords in encrypted formats and protect payments with industry-standard secure gateway simulations (Stripe, Razorpay).
          `
        };
      case 'terms':
        return {
          title: "Terms of Service",
          desc: "Terms of using our e-commerce portal and ordering dairy products.",
          content: `
            Welcome to REDDY PREMIUM DAIRY. These terms and conditions outline the rules and regulations for the use of our Website, located in Chiyyedu, Anantapur District, AP, India.

            By accessing this website we assume you accept these terms and conditions. Do not continue to use REDDY PREMIUM DAIRY if you do not agree to take all of the terms and conditions stated on this page.

            1. Delivery Slots
            We deliver fresh milk daily between 6:00 AM and 9:00 AM. Orders placed after 6:00 PM will be processed for the next day's morning slot.

            2. Customer Conduct
            Customers are responsible for providing correct delivery addresses, villages, PIN codes, and mobile contacts. Any incorrect delivery due to incorrect coordinates is the customer's liability.

            3. Payment Gateways
            By placing an order via UPI or Card, you verify that you own the respective accounts.
          `
        };
      case 'refund':
        return {
          title: "Refund Policy",
          desc: "Terms regarding cancellations, exchanges, and refund requests.",
          content: `
            Our refund policy applies specifically to fresh perishable goods.

            1. Cancellations
            You can cancel or modify your fresh milk subscriptions or daily orders before 6:00 PM on the day preceding the delivery. Post-6:00 PM cancellations cannot be processed since products enter packaging lines.

            2. Perishables Exchanges
            Due to the organic, preservative-free nature of our products (Malai Paneer, Curd, Milk), return or exchange requests must be filed within 6 hours of delivery if you receive spoiled or leaking packages. 

            3. Refund Payouts
            Approved refunds are credited directly back to your user Wallet Balance or the original payment method (UPI / Card) within 3-5 working days.
          `
        };
      case 'shipping':
        return {
          title: "Shipping & Delivery Policy",
          desc: "Timelines, slots, and charges for delivery in Anantapur.",
          content: `
            We coordinate fresh logistics straight from our Chiyyedu factory plant.

            1. Delivery Locations
            We currently deliver specifically within Anantapur District municipal limits and surrounding villages (Chiyyedu, etc.).

            2. Shipping Fees
            - Delivery is FREE for all orders above Rs. 150.
            - A nominal shipping fee of Rs. 20 is applied to orders below Rs. 150.

            3. Cold Chain Management
            All products are shipped inside insulated chilled boxes (maintained under 4°C) using our dedicated fleet vehicles, preventing spoilage.
          `
        };
      default:
        return {
          title: "Legal Policy Desk",
          desc: "Company terms and policies.",
          content: "Please select a valid policy link in the footer."
        };
    }
  };

  const policy = getPolicyContent();

  return (
    <PageWrapper>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-900 pb-5">
          <h1 className="text-3xl font-bold font-display text-primary dark:text-white leading-tight">{policy.title}</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">{policy.desc}</p>
        </div>
        
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line space-y-4 font-medium font-sans">
          {policy.content}
        </div>
      </div>
    </PageWrapper>
  );
}
