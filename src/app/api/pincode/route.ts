import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      [{ Status: 'Error', Message: 'Invalid pincode format' }],
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
      headers: {
        'User-Agent': 'ReddyPremiumDairy/1.0',
        'Accept': 'application/json'
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      return NextResponse.json(
        [{ Status: 'Error', Message: 'Failed to fetch pincode details' }],
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in pincode API proxy:', error);
    return NextResponse.json(
      [{ Status: 'Error', Message: 'Internal server error' }],
      { status: 500 }
    );
  }
}
