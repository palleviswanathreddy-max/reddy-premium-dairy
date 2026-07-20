import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat or lon parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          'User-Agent': 'ReddyPremiumDairyApp/1.0 (palleviswanathreddy11@gmail.com)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Reverse geocode request failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in reverse geocode proxy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
