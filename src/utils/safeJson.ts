/**
 * Safe JSON utilities to prevent recursion and handle large objects
 */

export class SafeJson {
  private static readonly MAX_DEPTH = 10;
  private static readonly MAX_STRING_LENGTH = 100000; // 100KB

  /**
   * Safely stringify an object, preventing circular references and deep recursion
   */
  static stringify(obj: any, maxDepth = SafeJson.MAX_DEPTH): string {
    const seen = new WeakSet();
    
    const replacer = (key: string, value: any, depth = 0): any => {
      // Prevent infinite recursion
      if (depth > maxDepth) {
        return '[Max depth reached]';
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return value;
      }
      
      // Handle primitive types
      if (typeof value !== 'object') {
        return value;
      }
      
      // Prevent circular references
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      
      seen.add(value);
      
      // Handle arrays
      if (Array.isArray(value)) {
        return value.map((item, index) => 
          replacer(index.toString(), item, depth + 1)
        );
      }
      
      // Handle objects
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        // Skip functions and symbols
        if (typeof v === 'function' || typeof v === 'symbol') {
          continue;
        }
        
        // Skip React internals
        if (k.startsWith('_') || k === 'constructor') {
          continue;
        }
        
        result[k] = replacer(k, v, depth + 1);
      }
      
      return result;
    };
    
    try {
      const result = JSON.stringify(obj, (key, value) => replacer(key, value));
      
      // Check string length limit
      if (result.length > SafeJson.MAX_STRING_LENGTH) {
        return JSON.stringify({
          error: 'Object too large for serialization',
          size: result.length,
          maxSize: SafeJson.MAX_STRING_LENGTH
        });
      }
      
      return result;
    } catch (error) {
      return JSON.stringify({
        error: 'Serialization failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Safely parse JSON with error handling
   */
  static parse<T = any>(jsonString: string): T | null {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('SafeJson.parse failed:', error);
      return null;
    }
  }

  /**
   * Compare two objects for equality, handling potential recursion issues
   */
  static areEqual(obj1: any, obj2: any): boolean {
    try {
      // Quick reference check
      if (obj1 === obj2) return true;
      
      // Type check
      if (typeof obj1 !== typeof obj2) return false;
      
      // Null/undefined check
      if (obj1 === null || obj2 === null) return obj1 === obj2;
      
      // For primitives
      if (typeof obj1 !== 'object') return obj1 === obj2;
      
      // For arrays
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        return obj1.every((item, index) => SafeJson.areEqual(item, obj2[index]));
      }
      
      // For objects - use safe stringify comparison for deep objects
      const str1 = SafeJson.stringify(obj1);
      const str2 = SafeJson.stringify(obj2);
      return str1 === str2;
    } catch (error) {
      // Fallback to reference comparison if anything fails
      console.warn('SafeJson.areEqual failed, falling back to reference comparison:', error);
      return obj1 === obj2;
    }
  }

  /**
   * Create a shallow comparison function for specific properties
   */
  static createShallowComparer<T extends Record<string, any>>(keys: (keyof T)[]): (obj1: T, obj2: T) => boolean {
    return (obj1: T, obj2: T): boolean => {
      if (obj1 === obj2) return true;
      if (!obj1 || !obj2) return obj1 === obj2;
      
      return keys.every(key => obj1[key] === obj2[key]);
    };
  }
}