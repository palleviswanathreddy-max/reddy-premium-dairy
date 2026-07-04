# Advanced Project Documentation

## 📋 Table of Contents
1. [Rate Limiting](#rate-limiting)
2. [Input Validation](#input-validation)
3. [Error Handling & Logging](#error-handling--logging)
4. [Caching System](#caching-system)
5. [Database Optimization](#database-optimization)
6. [Advanced Authentication](#advanced-authentication)
7. [Security Features](#security-features)
8. [Admin Analytics](#admin-analytics)
9. [Testing](#testing)

---

## Rate Limiting

### Overview
Rate limiting prevents API abuse by limiting requests per user/IP.

### Usage

```typescript
import { authRateLimiter, apiRateLimiter, getRateLimitHeaders } from '@/middleware/rateLimiter';

// In your API route:
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const result = authRateLimiter(ip);
  
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: getRateLimitHeaders(result.remaining, result.resetTime)
      }
    );
  }
  
  // Process request
}
```

### Configuration
- **Auth Limiter**: 10 attempts per 15 minutes
- **API Limiter**: 100 calls per 15 minutes
- **Upload Limiter**: 5 uploads per hour

---

## Input Validation

### Overview
Comprehensive input validation and sanitization for all API endpoints.

### Usage

```typescript
import { validateInput, sanitizeInput, authSchema } from '@/middleware/validation';

// Validate incoming data
const { valid, errors } = validateInput(requestBody, authSchema);

if (!valid) {
  return NextResponse.json(
    { errors },
    { status: 400 }
  );
}

// Sanitize to remove HTML/malicious content
const sanitized = sanitizeInput(requestBody);
```

### Built-in Schemas
- `authSchema` - Email + Password validation
- `productSchema` - Product data validation
- `orderSchema` - Order data validation

### Custom Schema Example
```typescript
const customSchema: ValidationSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 100
  },
  email: {
    type: 'email',
    required: true
  },
  age: {
    type: 'number',
    min: 18,
    max: 120
  }
};
```

---

## Error Handling & Logging

### Overview
Structured logging with severity levels and error tracking.

### Usage

```typescript
import { logger, APIError, handleAPIError } from '@/utils/logger';

// Info logging
logger.info('User login successful', { userId: '123', email: 'user@example.com' });

// Error logging
logger.error('Database connection failed', error, { endpoint: '/api/products' });

// Custom error responses
try {
  // Your code
} catch (error) {
  const { statusCode, response } = handleAPIError(error, 'Failed to process request');
  return NextResponse.json(response, { status: statusCode });
}

// Throw API errors
throw new APIError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
```

### Log Levels
- **DEBUG** - Detailed debugging information
- **INFO** - General informational messages
- **WARN** - Warning messages
- **ERROR** - Error messages
- **CRITICAL** - Critical system errors

---

## Caching System

### Overview
In-memory caching with TTL, pattern invalidation, and statistics.

### Usage

```typescript
import { cache, CacheKeys, getCachedOrFetch, setCacheHeaders } from '@/utils/cache';

// Basic caching
cache.set(CacheKeys.PRODUCT('123'), productData, 5 * 60 * 1000); // 5 min TTL

// Retrieve with fallback
const product = cache.get(CacheKeys.PRODUCT('123'));

// Cache-or-fetch pattern
const data = await getCachedOrFetch(
  'expensive-query-key',
  async () => {
    // Expensive operation
    return await database.find({...});
  },
  10 * 60 * 1000 // 10 min TTL
);

// Invalidate patterns
cache.invalidatePattern('products:.*'); // Invalidate all product caches

// Get statistics
const stats = cache.getStats();
console.log(stats); // { size: 45, totalHits: 523, averageHits: 11.6, maxEntries: 500 }
```

### Cache Headers
```typescript
import { setCacheHeaders } from '@/utils/cache';

const headers = setCacheHeaders(200, 300, true);
// Returns Cache-Control, ETag, and Vary headers
```

---

## Database Optimization

### Overview
MongoDB indexes, query optimization, and connection pooling.

### Initialization

```typescript
import { createDatabaseIndexes, getDatabaseStats } from '@/db/optimization';

// Call on server startup
await createDatabaseIndexes();
```

### Auto-created Indexes
- **Users**: email, phone, role, createdAt, pincode
- **Products**: sku, category, brand, status, price, rating, compound indexes
- **Orders**: userId, orderId, status, createdAt, compound indexes
- **Coupons**: code, validity dates
- **Tickets**: userId, status, priority

### Monitoring

```typescript
const stats = await getDatabaseStats();
/*
{
  users: { count: 1250, indexCount: 5 },
  products: { count: 3890, indexCount: 9 },
  ...
}
*/
```

---

## Advanced Authentication

### Overview
JWT tokens, session management, role-based access, and token refresh.

### Setup

```typescript
import { withAuth, withRole, extractToken, verifyAuth } from '@/middleware/auth';

// Protect endpoint with auth
export const POST = withAuth(async (request, { auth }) => {
  console.log(`Request from user: ${auth.userId}`);
  // Process authenticated request
});

// Add role-based access control
export const DELETE = withRole('admin')(async (request, { auth }) => {
  // Only admins can access
});
```

### Token Refresh

```typescript
import { handleTokenRefresh } from '@/middleware/auth';

// In token refresh endpoint
const refreshToken = request.cookies.get('refreshToken')?.value;
const newTokens = await handleTokenRefresh(refreshToken);

if (newTokens) {
  // Return new access token
}
```

### Session Management

```typescript
import { sessionManager } from '@/middleware/auth';

// Create session
sessionManager.createSession('user-123', 'session-abc-xyz');

// Check session validity
if (sessionManager.isSessionValid('session-abc-xyz')) {
  // Session is valid
}

// Destroy all user sessions (logout everywhere)
sessionManager.destroyUserSessions('user-123');
```

---

## Security Features

### Overview
CORS, CSRF protection, security headers, and IP management.

### CORS Configuration

```typescript
import { getCORSHeaders } from '@/utils/security';

const corsHeaders = getCORSHeaders(request.headers.get('origin'));
// Automatically allows only trusted origins
```

### CSRF Protection

```typescript
import { csrfTokenManager } from '@/utils/security';

// Generate token on page load
const token = csrfTokenManager.generateToken(sessionId);

// Verify on form submission
const isValid = csrfTokenManager.verifyToken(sessionId, submittedToken);
```

### Security Headers

```typescript
import { withSecurityHeaders } from '@/utils/security';

export const POST = withSecurityHeaders(async (request) => {
  // Automatically adds:
  // - X-Content-Type-Options
  // - X-Frame-Options
  // - X-XSS-Protection
  // - Strict-Transport-Security
  // - Content-Security-Policy
  // - etc.
});
```

### IP Management

```typescript
import { ipManager, getClientIP } from '@/utils/security';

const ip = getClientIP(request);
ipManager.addToBlacklist(ip, 'Too many failed login attempts');

if (ipManager.isBlacklisted(ip)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

---

## Admin Analytics

### Overview
Comprehensive dashboard metrics, user analytics, and system health monitoring.

### Usage

```typescript
import { adminAnalytics } from '@/utils/admin-analytics';

// Dashboard metrics
const metrics = await adminAnalytics.getDashboardMetrics();
/*
{
  totalUsers: 5000,
  totalOrders: 12500,
  totalRevenue: 2500000,
  avgOrderValue: 200,
  totalProducts: 3890,
  lowStockItems: 45,
  activeTickets: 23,
  conversionRate: 2.5
}
*/

// User analytics
const userAnalytics = await adminAnalytics.getUserAnalytics(30); // Last 30 days
/*
{
  totalUsers: 5000,
  newUsersThisMonth: 850,
  activeUsers: 3200,
  usersByRole: { customer: 4500, admin: 10, vendor: 490 },
  topLocations: [ { location: 'Mumbai', count: 850 }, ... ]
}
*/

// Order analytics
const orderAnalytics = await adminAnalytics.getOrderAnalytics(30);
/*
{
  totalOrders: 12500,
  ordersThisMonth: 3200,
  averageOrderValue: 200,
  totalRevenue: 2500000,
  orderStatus: { pending: 120, processing: 45, shipped: 800, delivered: 2235 },
  topProducts: [ { productId: 'P123', count: 456 }, ... ],
  paymentMethods: { card: 1800, upi: 1200, cod: 200 }
}
*/

// System health
const health = await adminAnalytics.getSystemHealth();
/*
{
  timestamp: '2024-01-15T10:30:00Z',
  database: 'connected',
  users: 5000,
  products: 3890,
  orders: 12500,
  ...
}
*/
```

---

## Testing

### Overview
Jest testing framework with comprehensive test coverage.

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Running Tests

```bash
# All tests
npm test

# Specific file
npm test validation.test.ts

# With coverage
npm run test:coverage
```

### Example Test

```typescript
import { validateInput, authSchema } from '@/middleware/validation';

describe('Auth Validation', () => {
  it('should accept valid credentials', () => {
    const result = validateInput({
      email: 'user@example.com',
      password: 'SecurePass123'
    }, authSchema);
    
    expect(result.valid).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = validateInput({
      email: 'invalid',
      password: 'SecurePass123'
    }, authSchema);
    
    expect(result.valid).toBe(false);
  });
});
```

---

## Performance Optimization Tips

1. **Use Caching**: Cache frequently accessed data with appropriate TTLs
2. **Lean Queries**: Use `.lean()` in MongoDB queries for better performance
3. **Pagination**: Implement pagination for large datasets
4. **Rate Limiting**: Protect endpoints from abuse
5. **Database Indexes**: Ensure proper indexes on frequently queried fields
6. **Async Operations**: Use async/await and Promise.all() for parallel operations
7. **Error Handling**: Log and monitor errors for quick debugging

---

## Environment Variables Required

```env
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
MONGODB_URI=mongodb://localhost:27017/reddy-premium-dairy
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

---

## Version History

**v1.0.0** - Initial release with:
- Rate limiting
- Input validation
- Error handling & logging
- Caching system
- Database optimization
- Advanced authentication
- Security features
- Admin analytics
- Comprehensive testing
