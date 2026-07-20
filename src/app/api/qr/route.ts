import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data');
  const size = searchParams.get('size') || '250x250';

  if (!data) {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 });
  }

  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(data)}`;
    const response = await fetch(qrUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400'
      }
    });
  } catch (error) {
    console.error('Error in QR code proxy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
