/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP/user
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const rateLimitStore: RateLimitStore = {};

const DEFAULT_LIMIT = 100; // requests per window
const DEFAULT_WINDOW = 15 * 60 * 1000; // 15 minutes

export function createRateLimiter(limit = DEFAULT_LIMIT, window = DEFAULT_WINDOW) {
  return function rateLimiter(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    
    if (!rateLimitStore[identifier]) {
      rateLimitStore[identifier] = { count: 1, resetTime: now + window };
      return { allowed: true, remaining: limit - 1, resetTime: rateLimitStore[identifier].resetTime };
    }

    const bucket = rateLimitStore[identifier];

    // Reset if window has passed
    if (now > bucket.resetTime) {
      bucket.count = 1;
      bucket.resetTime = now + window;
      return { allowed: true, remaining: limit - 1, resetTime: bucket.resetTime };
    }

    // Check if limit exceeded
    if (bucket.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: bucket.resetTime
      };
    }

    bucket.count++;
    return {
      allowed: true,
      remaining: limit - bucket.count,
      resetTime: bucket.resetTime
    };
  };
}

export const authRateLimiter = createRateLimiter(10, 15 * 60 * 1000); // 10 auth attempts per 15 min
export const apiRateLimiter = createRateLimiter(100, 15 * 60 * 1000); // 100 API calls per 15 min
export const uploadRateLimiter = createRateLimiter(5, 60 * 60 * 1000); // 5 uploads per hour

export function getRateLimitHeaders(remaining: number, resetTime: number) {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
  };
}
