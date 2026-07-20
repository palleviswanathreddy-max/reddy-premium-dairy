import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', receipt = 'receipt#1' } = await req.json();

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // MOCK FALLBACK for missing keys
    if (!key_id || !key_secret) {
      console.warn("RAZORPAY KEYS MISSING: Returning mock order ID for testing.");
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        entity: "order",
        amount: amount,
        amount_paid: 0,
        amount_due: amount,
        currency: currency,
        receipt: receipt,
        status: "created",
        attempts: 0,
        created_at: Math.floor(Date.now() / 1000)
      };
      return NextResponse.json({
        success: true,
        message: 'Mock Razorpay order created successfully',
        order: mockOrder,
        mock: true,
        data: { order: mockOrder }
      });
    }

    const instance = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: amount, // amount in smallest currency unit (paise)
      currency,
      receipt
    };

    const order = await instance.orders.create(options);

    return NextResponse.json({
      success: true,
      message: 'Razorpay order created successfully',
      order,
      data: { order }
    });
  } catch (error: any) {
    console.error("Razorpay API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
