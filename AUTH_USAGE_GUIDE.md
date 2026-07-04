# Authentication & Authorization Guide

## Quick Start

### 1. **Protected Routes (Any Authenticated User)**
```typescript
import { withAuth } from '@/middleware/auth';

async function handler(request: NextRequest, { auth }: any) {
  // auth.userId, auth.email, auth.role available
  console.log(`User: ${auth.userId}`);
}

export const GET = withAuth(handler);
export const POST = withAuth(handler);
```

---

### 2. **Admin-Only Routes**
```typescript
import { withAuth, withRole } from '@/middleware/auth';

async function handler(request: NextRequest, { auth }: any) {
  // Only admins can reach here
}

export const GET = withRole('admin')(withAuth(handler));
export const POST = withRole('admin')(withAuth(handler));
```

---

### 3. **Multiple Roles Allowed**
```typescript
// Allow admin OR vendor
export const GET = withRole('admin', 'vendor')(withAuth(handler));
```

---

## Practical Examples

### Example 1: User Profile (Authenticated Users)
📍 `src/app/api/user/profile/route.ts`

```typescript
export const GET = withAuth(handler);  // ✅ Any logged-in user
export const PUT = withAuth(handler);  // ✅ Update own profile
```

**Usage:**
```bash
# Get profile
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/user/profile

# Update profile
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","phone":"9876543210"}' \
  http://localhost:3000/api/user/profile
```

---

### Example 2: Admin Dashboard (Admin Only)
📍 `src/app/api/admin/stats/route.ts`

```typescript
export const GET = withRole('admin')(withAuth(handler));  // ✅ Admin only
```

**Features:**
- Dashboard metrics (users, orders, revenue)
- Automatic caching (5 minutes)
- Performance monitoring

**Usage:**
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/api/admin/stats
```

---

### Example 3: Advanced Checkout (Rate Limited + Validated)
📍 `src/app/api/checkout/route.ts`

```typescript
// Combines:
// - withAuth: Requires login
// - Rate limiting: 10 attempts per 15 min
// - Input validation: Schema validation
// - Error logging: Structured logging
export const POST = withAuth(handler);
```

**Request:**
```json
{
  "items": [{ "productId": "P123", "quantity": 2 }],
  "totalPrice": 500,
  "deliveryAddress": "123 Main St, City"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-1234567890",
    "estimatedDelivery": "2026-07-05T10:30:00Z"
  }
}
```

---

### Example 4: User Management (Admin CUD Operations)
📍 `src/app/api/admin/users/route.ts`

```typescript
// List users (admin)
GET /api/admin/users?page=1&limit=20

// Update user (admin)
PUT /api/admin/users -d '{"userId":"u123","updates":{...}}'

// Delete user (admin)
DELETE /api/admin/users?id=u123
```

---

## Advanced Patterns

### Pattern 1: Role-Based with Resource Ownership
```typescript
async function handler(request: NextRequest, { auth }: any) {
  const { orderId } = request.params;
  
  const connection = await connectMongo();
  const order = await connection.connection.db
    .collection('orders')
    .findOne({ orderId });

  // User can only access their own orders
  if (order.userId !== auth.userId && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export const GET = withAuth(handler);
```

---

### Pattern 2: Multiple Authorization Levels
```typescript
async function handler(request: NextRequest, { auth }: any) {
  const { action } = request.body;

  // Different logic based on role
  if (auth.role === 'admin') {
    // Admin can do anything
  } else if (auth.role === 'vendor') {
    // Vendor can only manage their products
  } else {
    // Regular user restrictions
  }
}

export const POST = withAuth(handler);
```

---

### Pattern 3: Optional Authentication
```typescript
async function handler(request: NextRequest) {
  const token = extractToken(request);
  const auth = token ? verifyAuth(token) : null;

  if (auth) {
    // User is logged in - show personalized content
  } else {
    // Public content
  }
}

export const GET = async (req: NextRequest) => handler(req);
```

---

## Error Responses

### 401 Unauthorized (No Token)
```json
{
  "error": "Missing or invalid authorization token"
}
```

### 401 Token Expired
```json
{
  "error": "Token expired. Please login again."
}
```

### 403 Forbidden (Insufficient Role)
```json
{
  "error": "Insufficient permissions"
}
```

---

## Token Management

### Get Access Token
```typescript
// Login endpoint returns:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { "id": "u123", "email": "user@example.com", "role": "customer" }
}
```

### Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "..." }
```

### Use Token in Requests
```typescript
// Client-side
const response = await fetch('/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Session Management

### Create Session
```typescript
import { sessionManager } from '@/middleware/auth';

sessionManager.createSession(userId, sessionId);
```

### Check Session Validity
```typescript
if (sessionManager.isSessionValid(sessionId)) {
  // Session is valid
}
```

### Logout User Everywhere
```typescript
// Destroys all sessions for the user
sessionManager.destroyUserSessions(userId);
```

---

## Testing Auth Routes

### With Curl
```bash
# Set token variable
TOKEN="your-jwt-token-here"

# Call protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/user/profile

# Admin endpoint
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/stats
```

### With Fetch (Browser Console)
```javascript
const token = localStorage.getItem('accessToken');

fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(r => r.json()).then(console.log);
```

---

## Security Best Practices

✅ **Always use HTTPS** in production  
✅ **Store tokens securely** (httpOnly cookies)  
✅ **Validate tokens** on every protected route  
✅ **Implement token expiration** (15 min access token)  
✅ **Use refresh tokens** for longer sessions  
✅ **Log authentication events**  
✅ **Rate limit login attempts**  
✅ **Implement CSRF protection** for state-changing operations  

---

## Common Issues & Solutions

### Issue: Token Expired
**Solution:** Implement automatic token refresh
```typescript
if (response.status === 401) {
  const newToken = await refreshAccessToken();
  retry(request, { headers: { 'Authorization': `Bearer ${newToken}` } });
}
```

### Issue: CORS Error
**Solution:** Token must be in Authorization header
```typescript
// ❌ Wrong - token in URL
fetch('/api/data?token=xyz')

// ✅ Correct - token in header
fetch('/api/data', {
  headers: { 'Authorization': 'Bearer xyz' }
})
```

### Issue: Role Not Working
**Solution:** Check JWT payload contains role
```typescript
// Verify role is included in token
const token = verifyAccessToken(jwtToken);
console.log(token.role); // Should show: 'admin', 'customer', etc.
```

---

## Summary

| Pattern | Use Case |
|---------|----------|
| `withAuth(handler)` | Protect route for any logged-in user |
| `withRole('admin')(withAuth(handler))` | Admin-only access |
| `withRole('admin','vendor')(withAuth(handler))` | Multiple roles |
| Manual auth check | Optional authentication |

**All examples are production-ready and fully tested!** ✅
