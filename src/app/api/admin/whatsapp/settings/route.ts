import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.appSettings.findFirst();
    return NextResponse.json({
      success: true,
      settings: settings || { whatsappNotificationsEnabled: true }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { whatsappNotificationsEnabled } = await request.json();
    if (typeof whatsappNotificationsEnabled !== 'boolean') {
      return NextResponse.json({ success: false, message: 'whatsappNotificationsEnabled parameter must be boolean' }, { status: 400 });
    }

    let settings = await prisma.appSettings.findFirst();
    if (settings) {
      settings = await prisma.appSettings.update({
        where: { id: settings.id },
        data: { whatsappNotificationsEnabled }
      });
    } else {
      settings = await prisma.appSettings.create({
        data: { whatsappNotificationsEnabled }
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
