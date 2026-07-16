/**
 * Validation Tests
 */

import { validateInput, sanitizeInput, authSchema, productSchema } from '../middleware/validation';

describe('Validation Middleware', () => {
  describe('validateInput', () => {
    it('should validate correct data against schema', () => {
      const data = {
        email: 'test@example.com',
        password: 'securePassword123'
      };
      const result = validateInput(data, authSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'securePassword123'
      };
      const result = validateInput(data, authSchema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('valid email');
    });

    it('should reject short password', () => {
      const data = {
        email: 'test@example.com',
        password: 'short'
      };
      const result = validateInput(data, authSchema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at least 8');
    });

    it('should require required fields', () => {
      const result = validateInput({}, authSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const data = { text: '<script>alert("xss")</script>Hello' };
      const sanitized = sanitizeInput(data);
      expect(sanitized.text).toBe('alert("xss")Hello');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: '<b>John</b>',
          email: 'john@example.com'
        }
      };
      const sanitized = sanitizeInput(data);
      expect(sanitized.user.name).toBe('John');
    });

    it('should trim whitespace', () => {
      const data = { text: '  Hello World  ' };
      const sanitized = sanitizeInput(data);
      expect(sanitized.text).toBe('Hello World');
    });
  });

  describe('productSchema validation', () => {
    it('should validate valid product data', () => {
      const data = {
        name: 'Organic Milk',
        price: 100,
        stock: 50,
        description: 'Pure organic milk from dairy farms'
      };
      const result = validateInput(data, productSchema);
      expect(result.valid).toBe(true);
    });

    it('should reject negative prices', () => {
      const data = {
        name: 'Product',
        price: -10,
        stock: 50
      };
      const result = validateInput(data, productSchema);
      expect(result.valid).toBe(false);
    });
  });
});
