import { secureStorage, xssProtection, securityHeaders } from './security.js';

// Secure API client with built-in security measures
class SecureApiClient {
  constructor(baseURL = '/api/v1') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  // Add request interceptor
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Get authentication token
  getAuthToken() {
    const tokenData = secureStorage.getItem('authToken');
    return tokenData?.accessToken || null;
  }

  // Set authentication token
  setAuthToken(tokenData) {
    secureStorage.setItem('authToken', tokenData);
  }

  // Remove authentication token
  removeAuthToken() {
    secureStorage.removeItem('authToken');
  }

  // Generate correlation ID for request tracking
  generateCorrelationId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Prepare request headers
  prepareHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    // Add authentication token
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Add correlation ID for tracking
    headers['X-Correlation-ID'] = this.generateCorrelationId();
    
    // Add CSRF protection
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    return headers;
  }

  // Sanitize request data
  sanitizeRequestData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = xssProtection.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  // Validate response data
  validateResponse(response, data) {
    // Check security headers
    const headerValidation = securityHeaders.validateHeaders(response);
    
    if (headerValidation.percentage < 50) {
      console.warn('⚠️ Response missing important security headers:', headerValidation.missing);
    }
    
    // Validate response structure
    if (data && typeof data === 'object') {
      // Check for expected response format
      if (!data.hasOwnProperty('success') && !data.hasOwnProperty('data') && !data.hasOwnProperty('error')) {
        console.warn('⚠️ Unexpected response format');
      }
    }
    
    return data;
  }

  // Handle token refresh
  async refreshToken() {
    try {
      const tokenData = secureStorage.getItem('authToken');
      if (!tokenData?.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: this.prepareHeaders(),
        body: JSON.stringify({ refreshToken: tokenData.refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const newTokenData = await response.json();
      this.setAuthToken(newTokenData.data);
      
      return newTokenData.data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.removeAuthToken();
      // Redirect to login or emit event
      window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
      throw error;
    }
  }

  // Make secure HTTP request
  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    // Prepare request options
    const requestOptions = {
      ...options,
      headers: this.prepareHeaders(options.headers)
    };
    
    // Sanitize request body
    if (requestOptions.body && typeof requestOptions.body === 'string') {
      try {
        const data = JSON.parse(requestOptions.body);
        const sanitizedData = this.sanitizeRequestData(data);
        requestOptions.body = JSON.stringify(sanitizedData);
      } catch (error) {
        // Body is not JSON, leave as is
      }
    }
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      await interceptor(requestOptions);
    }
    
    let attempt = 0;
    let lastError;
    
    while (attempt < this.retryAttempts) {
      try {
        const response = await fetch(fullUrl, requestOptions);
        
        // Handle token expiration
        if (response.status === 401 && attempt === 0) {
          try {
            await this.refreshToken();
            // Update authorization header and retry
            requestOptions.headers.Authorization = `Bearer ${this.getAuthToken()}`;
            attempt++;
            continue;
          } catch (refreshError) {
            throw new Error('Authentication failed');
          }
        }
        
        // Parse response
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        // Validate response
        const validatedData = this.validateResponse(response, data);
        
        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          await interceptor(response, validatedData);
        }
        
        // Handle HTTP errors
        if (!response.ok) {
          const error = new Error(validatedData?.error?.message || `HTTP ${response.status}`);
          error.status = response.status;
          error.response = validatedData;
          throw error;
        }
        
        return validatedData;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Don't retry on authentication errors or client errors
        if (error.status && (error.status === 401 || error.status < 500)) {
          break;
        }
        
        // Wait before retrying
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    throw lastError;
  }

  // HTTP method helpers
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // File upload with security measures
  async uploadFile(url, file, options = {}) {
    // Validate file type and size
    const allowedTypes = options.allowedTypes || ['text/csv', 'application/json'];
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
    
    if (file.size > maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum ${maxSize}`);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional fields
    if (options.fields) {
      for (const [key, value] of Object.entries(options.fields)) {
        formData.append(key, value);
      }
    }
    
    return this.request(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
        ...this.prepareHeaders(options.headers),
        'Content-Type': undefined
      }
    });
  }

  // Secure logout
  async logout() {
    try {
      const tokenData = secureStorage.getItem('authToken');
      
      if (tokenData) {
        await this.post('/auth/logout', {
          refreshToken: tokenData.refreshToken
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Always clear local tokens
      this.removeAuthToken();
      secureStorage.removeItem('user');
    }
  }
}

// Create singleton instance
const apiClient = new SecureApiClient();

// Add default interceptors
apiClient.addRequestInterceptor(async (options) => {
  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🌐 API Request:', options.method || 'GET', options.url);
  }
});

apiClient.addResponseInterceptor(async (response, data) => {
  // Log responses in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📡 API Response:', response.status, data);
  }
  
  // Handle token rotation
  const newToken = response.headers.get('X-New-Token');
  if (newToken) {
    const tokenData = secureStorage.getItem('authToken');
    if (tokenData) {
      tokenData.accessToken = newToken;
      apiClient.setAuthToken(tokenData);
    }
  }
});

export { SecureApiClient };
export default apiClient;
