/**
 * Advanced Security Utilities
 * CORS, CSRF protection, input sanitization, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Configuration
 */
export const CORS_CONFIG = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://reddydairyapp.com',
    'https://www.reddydairyapp.com'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-New-Access-Token'],
  credentials: true,
  maxAge: 86400
};

/**
 * CORS Headers Generator
 */
export function getCORSHeaders(origin: string | null) {
  const isAllowed = CORS_CONFIG.allowedOrigins.includes(origin || '');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || '*' : '',
    'Access-Control-Allow-Methods': CORS_CONFIG.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': CORS_CONFIG.exposedHeaders.join(', '),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': CORS_CONFIG.maxAge.toString()
  };
}

/**
 * Security Headers
 */
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

/**
 * CSRF Token Management
 */
export class CSRFTokenManager {
  private tokens: Map<string, { token: string; createdAt: number; used: boolean }> = new Map();
  private tokenTimeout = 24 * 60 * 60 * 1000; // 24 hours

  generateToken(sessionId: string): string {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    this.tokens.set(sessionId, {
      token,
      createdAt: Date.now(),
      used: false
    });

    return token;
  }

  verifyToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    
    const isExpired = Date.now() - stored.createdAt > this.tokenTimeout;
    if (isExpired) {
      this.tokens.delete(sessionId);
      return false;
    }

    const isValid = stored.token === token;
    if (isValid) {
      stored.used = true;
    }

    return isValid;
  }

  invalidateToken(sessionId: string): void {
    this.tokens.delete(sessionId);
  }
}

export const csrfTokenManager = new CSRFTokenManager();

/**
 * IP Whitelist/Blacklist
 */
export class IPManager {
  private whitelist: Set<string> = new Set();
  private blacklist: Set<string> = new Set();

  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
  }

  addToBlacklist(ip: string, reason?: string): void {
    this.blacklist.add(ip);
    if (reason) {
      console.warn(`IP blocked: ${ip} - Reason: ${reason}`);
    }
  }

  isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }

  isBlacklisted(ip: string): boolean {
    return this.blacklist.has(ip);
  }

  removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
  }

  removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
  }
}

export const ipManager = new IPManager();

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

/**
 * Middleware: Apply security headers and CORS
 */
export function withSecurityHeaders(handler: Function) {
  return async (request: NextRequest) => {
    const origin = request.headers.get('origin');
    const ip = getClientIP(request);

    // Check if IP is blacklisted
    if (ipManager.isBlacklisted(ip)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const response = await handler(request);

    // Add CORS headers
    const corsHeaders = getCORSHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) response.headers.set(key, value);
    });

    // Add security headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Encode/Decode utilities for safe data transmission
 */
export function encodeData(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decodeData(encoded: string): any {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}
