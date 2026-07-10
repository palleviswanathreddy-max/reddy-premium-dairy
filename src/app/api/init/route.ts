/**
 * Application Initialization Endpoint
 * Call this once when the server starts
 */

import { NextResponse } from 'next/server';
import { initializeApplication } from '@/utils/init';
import { logger } from '@/utils/logger';

let isInitialized = false;

export async function GET(_request: Request) {
  try {
    // Prevent multiple initializations
    if (isInitialized) {
      return NextResponse.json(
        { message: 'Application already initialized', status: 'ready' },
        { status: 200 }
      );
    }

    logger.info('🚀 Initialization endpoint called');
    const result = await initializeApplication();
    isInitialized = true;

    return NextResponse.json(
      {
        ...result,
        success: true,
        message: 'Application initialized successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Initialization failed', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize application',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Force re-initialization (admin only)
 */
export async function POST(_request: Request) {
  try {
    // In production, verify admin token here
    logger.info('🔄 Re-initialization requested');
    
    isInitialized = false;
    const result = await initializeApplication();

    return NextResponse.json(
      {
        ...result,
        success: true,
        message: 'Application re-initialized'
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Re-initialization failed', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Re-initialization failed'
      },
      { status: 500 }
    );
  }
}
