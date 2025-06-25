// Frontend security utilities

// XSS Protection
export const xssProtection = {
  // Sanitize HTML content
  sanitizeHtml: (html) => {
    if (typeof html !== 'string') return html;
    
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  },

  // Escape HTML entities
  escapeHtml: (text) => {
    if (typeof text !== 'string') return text;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, (s) => map[s]);
  },

  // Validate and sanitize user input
  sanitizeInput: (input, options = {}) => {
    if (typeof input !== 'string') return input;
    
    let sanitized = input;
    
    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove on* event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove data: URLs if not allowed
    if (!options.allowDataUrls) {
      sanitized = sanitized.replace(/data:/gi, '');
    }
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  },

  // Validate URLs
  validateUrl: (url) => {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // Block suspicious domains
      const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'goo.gl'];
      if (suspiciousDomains.some(domain => urlObj.hostname.includes(domain))) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Secure Storage
export const secureStorage = {
  // Encrypt data before storing
  encrypt: (data, key = 'library-tracker-key') => {
    try {
      const jsonString = JSON.stringify(data);
      // Simple encryption (in production, use a proper encryption library)
      const encrypted = btoa(jsonString);
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  },

  // Decrypt stored data
  decrypt: (encryptedData, key = 'library-tracker-key') => {
    try {
      const decrypted = atob(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  },

  // Secure localStorage wrapper
  setItem: (key, value, encrypt = true) => {
    try {
      const dataToStore = encrypt ? secureStorage.encrypt(value) : JSON.stringify(value);
      localStorage.setItem(key, dataToStore);
      
      // Set expiration metadata
      const expiration = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      localStorage.setItem(`${key}_expires`, expiration.toString());
      
      return true;
    } catch (error) {
      console.error('Failed to store data:', error);
      return false;
    }
  },

  // Secure localStorage getter
  getItem: (key, decrypt = true) => {
    try {
      // Check expiration
      const expiration = localStorage.getItem(`${key}_expires`);
      if (expiration && Date.now() > parseInt(expiration)) {
        secureStorage.removeItem(key);
        return null;
      }
      
      const storedData = localStorage.getItem(key);
      if (!storedData) return null;
      
      return decrypt ? secureStorage.decrypt(storedData) : JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return null;
    }
  },

  // Remove item and its metadata
  removeItem: (key) => {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_expires`);
  },

  // Clear expired items
  clearExpired: () => {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.endsWith('_expires')) {
        const expiration = parseInt(localStorage.getItem(key));
        if (expiration && now > expiration) {
          const dataKey = key.replace('_expires', '');
          secureStorage.removeItem(dataKey);
        }
      }
    });
  },

  // Secure sessionStorage wrapper
  setSessionItem: (key, value, encrypt = true) => {
    try {
      const dataToStore = encrypt ? secureStorage.encrypt(value) : JSON.stringify(value);
      sessionStorage.setItem(key, dataToStore);
      return true;
    } catch (error) {
      console.error('Failed to store session data:', error);
      return false;
    }
  },

  getSessionItem: (key, decrypt = true) => {
    try {
      const storedData = sessionStorage.getItem(key);
      if (!storedData) return null;
      
      return decrypt ? secureStorage.decrypt(storedData) : JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      return null;
    }
  }
};

// Content Security Policy helpers
export const cspHelpers = {
  // Check if CSP is properly configured
  checkCSP: () => {
    const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    const hasCSP = metaTags.length > 0 || 
                   document.querySelector('meta[name="csp-nonce"]') !== null;
    
    return {
      hasCSP,
      policies: Array.from(metaTags).map(tag => tag.content)
    };
  },

  // Get CSP nonce if available
  getNonce: () => {
    const nonceTag = document.querySelector('meta[name="csp-nonce"]');
    return nonceTag ? nonceTag.content : null;
  },

  // Safely execute inline scripts with nonce
  executeScript: (scriptContent, nonce = null) => {
    const script = document.createElement('script');
    
    if (nonce || cspHelpers.getNonce()) {
      script.nonce = nonce || cspHelpers.getNonce();
    }
    
    script.textContent = scriptContent;
    document.head.appendChild(script);
    document.head.removeChild(script);
  }
};

// Security headers validation
export const securityHeaders = {
  // Check for security headers in responses
  validateHeaders: (response) => {
    const headers = response.headers;
    const securityChecks = {
      'x-content-type-options': headers.get('x-content-type-options') === 'nosniff',
      'x-frame-options': ['DENY', 'SAMEORIGIN'].includes(headers.get('x-frame-options')),
      'x-xss-protection': headers.get('x-xss-protection') === '1; mode=block',
      'strict-transport-security': !!headers.get('strict-transport-security'),
      'content-security-policy': !!headers.get('content-security-policy'),
      'referrer-policy': !!headers.get('referrer-policy')
    };
    
    const score = Object.values(securityChecks).filter(Boolean).length;
    const total = Object.keys(securityChecks).length;
    
    return {
      score,
      total,
      percentage: (score / total) * 100,
      checks: securityChecks,
      missing: Object.keys(securityChecks).filter(key => !securityChecks[key])
    };
  }
};

// Input validation
export const inputValidation = {
  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate password strength
  validatePassword: (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    return {
      isValid: score >= 4,
      score,
      checks,
      strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
    };
  },

  // Sanitize form input
  sanitizeFormData: (formData) => {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        sanitized[key] = xssProtection.sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
};

// Security monitoring for frontend
export const frontendSecurity = {
  // Monitor for suspicious activity
  monitorActivity: () => {
    // Track failed login attempts
    let failedAttempts = 0;
    const maxAttempts = 5;
    
    return {
      recordFailedLogin: () => {
        failedAttempts++;
        if (failedAttempts >= maxAttempts) {
          console.warn('🚨 Multiple failed login attempts detected');
          // Could trigger additional security measures
        }
      },
      
      resetFailedAttempts: () => {
        failedAttempts = 0;
      },
      
      getFailedAttempts: () => failedAttempts
    };
  },

  // Check for browser security features
  checkBrowserSecurity: () => {
    return {
      https: location.protocol === 'https:',
      localStorage: typeof Storage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      crypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
      csp: cspHelpers.checkCSP().hasCSP,
      cookies: navigator.cookieEnabled
    };
  },

  // Initialize security measures
  initialize: () => {
    // Clear expired storage items
    secureStorage.clearExpired();
    
    // Set up periodic cleanup
    setInterval(() => {
      secureStorage.clearExpired();
    }, 60 * 60 * 1000); // Every hour
    
    // Check browser security
    const browserSecurity = frontendSecurity.checkBrowserSecurity();
    
    if (!browserSecurity.https && window.location.hostname !== 'localhost') {
      console.warn('⚠️ Application should be served over HTTPS');
    }
    
    if (!browserSecurity.csp) {
      console.warn('⚠️ Content Security Policy not detected');
    }
    
    console.log('🔒 Frontend security initialized');
    return browserSecurity;
  }
};

// Export all security utilities
export default {
  xssProtection,
  secureStorage,
  cspHelpers,
  securityHeaders,
  inputValidation,
  frontendSecurity
};
