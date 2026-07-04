/**
 * Input Validation Middleware
 * Validates and sanitizes API inputs
 */

export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'email' | 'phone' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: unknown[];
    items?: ValidationSchema; // for arrays
  };
}

export function validateInput(data: any, schema: ValidationSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, rule] of Object.entries(schema)) {
    const value = data[key];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    // Type validation
    if (rule.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        errors.push(`${key} must be a valid email`);
      }
    } else if (rule.type === 'phone') {
      const phoneRegex = /^[0-9+\-() ]{10,}$/;
      if (!phoneRegex.test(String(value))) {
        errors.push(`${key} must be a valid phone number`);
      }
    } else if (rule.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
      } else {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`${key} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`${key} must not exceed ${rule.maxLength} characters`);
        }
      }
    } else if (rule.type === 'number') {
      if (typeof value !== 'number') {
        errors.push(`${key} must be a number`);
      } else {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${key} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${key} must not exceed ${rule.max}`);
        }
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(`${key} format is invalid`);
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeInput(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    // Remove HTML tags from strings
    if (typeof value === 'string') {
      sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Common validation schemas
export const authSchema: ValidationSchema = {
  email: {
    type: 'email',
    required: true,
    maxLength: 255
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128
  }
};

export const productSchema: ValidationSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 255
  },
  price: {
    type: 'number',
    required: true,
    min: 0
  },
  stock: {
    type: 'number',
    required: true,
    min: 0
  },
  description: {
    type: 'string',
    maxLength: 2000
  }
};

export const orderSchema: ValidationSchema = {
  items: {
    type: 'array',
    required: true
  },
  totalPrice: {
    type: 'number',
    required: true,
    min: 0
  },
  deliveryAddress: {
    type: 'string',
    required: true,
    minLength: 10
  }
};
