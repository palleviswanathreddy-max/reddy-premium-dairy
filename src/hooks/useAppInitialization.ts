/**
 * Application Startup Hook
 * Runs initialization on client-side app load
 */

'use client';

import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export function useAppInitialization() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const response = await fetch('/api/init', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ Application initialized:', data);
        } else {
          console.warn('⚠️ Initialization warning:', data.error);
        }
      } catch (error) {
        console.error('❌ Initialization error:', error);
        // Don't block app if init fails
      }
    };

    initializeApp();
  }, []); // Run only once on mount
}
