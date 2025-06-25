import request from 'supertest';
import express from 'express';
import { 
  generalLimiter, 
  authLimiter, 
  uploadLimiter,
  searchLimiter,
  createLimiter,
  progressiveLimiter,
  createCustomLimiter
} from '../../middleware/rateLimitMiddleware.js';

describe('Rate Limiting Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('General Rate Limiter', () => {
    beforeEach(() => {
      app.use('/api', generalLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests within limit', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.message).toBe('success');
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should block requests when limit exceeded', async () => {
      // Make requests up to the limit
      const limit = 100; // Default limit
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(promises);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.success).toBe(false);
      expect(lastResponse.body.error.type).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Auth Rate Limiter', () => {
    beforeEach(() => {
      app.use('/auth', authLimiter);
      app.post('/auth/login', (req, res) => {
        res.json({ message: 'authenticated' });
      });
    });

    it('should have stricter limits for auth endpoints', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBe('10');
    });

    it('should block auth attempts when limit exceeded', async () => {
      const promises = [];
      for (let i = 0; i < 11; i++) {
        promises.push(
          request(app)
            .post('/auth/login')
            .send({ username: 'test', password: 'test' })
        );
      }

      const responses = await Promise.all(promises);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.error.type).toBe('AUTH_RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Upload Rate Limiter', () => {
    beforeEach(() => {
      app.use('/upload', uploadLimiter);
      app.post('/upload/file', (req, res) => {
        res.json({ message: 'uploaded' });
      });
    });

    it('should allow uploads within limit', async () => {
      const response = await request(app)
        .post('/upload/file')
        .expect(200);

      expect(response.body.message).toBe('uploaded');
      expect(response.headers['ratelimit-limit']).toBe('20');
    });
  });

  describe('Search Rate Limiter', () => {
    beforeEach(() => {
      app.use('/search', searchLimiter);
      app.get('/search/books', (req, res) => {
        res.json({ results: [] });
      });
    });

    it('should allow search requests within limit', async () => {
      const response = await request(app)
        .get('/search/books')
        .expect(200);

      expect(response.body.results).toEqual([]);
      expect(response.headers['ratelimit-limit']).toBe('50');
    });
  });

  describe('Progressive Rate Limiter', () => {
    beforeEach(() => {
      app.use(progressiveLimiter);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests for new IPs', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    // Note: Testing progressive blocking would require simulating failed attempts
    // which is complex in a unit test environment
  });

  describe('Custom Rate Limiter Factory', () => {
    it('should create custom limiter with specified options', () => {
      const customLimiter = createCustomLimiter({
        windowMs: 60000, // 1 minute
        max: 5,
        message: 'Custom rate limit exceeded',
        type: 'CUSTOM_LIMIT'
      });

      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });
  });

  describe('Rate Limit Response Format', () => {
    beforeEach(() => {
      const testLimiter = createCustomLimiter({
        windowMs: 1000,
        max: 1,
        message: 'Test limit exceeded',
        type: 'TEST_LIMIT'
      });

      app.use('/test', testLimiter);
      app.get('/test/endpoint', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should return standardized error response when rate limited', async () => {
      // First request should succeed
      await request(app).get('/test/endpoint').expect(200);

      // Second request should be rate limited
      const response = await request(app)
        .get('/test/endpoint')
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Test limit exceeded',
          type: 'TEST_LIMIT',
          retryAfter: expect.any(Number)
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Rate Limit Headers', () => {
    beforeEach(() => {
      app.use('/api', generalLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should include standard rate limit headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
      
      // Should not include legacy headers
      expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
      expect(response.headers).not.toHaveProperty('x-ratelimit-remaining');
    });

    it('should show decreasing remaining count', async () => {
      const response1 = await request(app).get('/api/test').expect(200);
      const response2 = await request(app).get('/api/test').expect(200);

      const remaining1 = parseInt(response1.headers['ratelimit-remaining']);
      const remaining2 = parseInt(response2.headers['ratelimit-remaining']);

      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('Health Check Bypass', () => {
    beforeEach(() => {
      app.use('/api', generalLimiter);
      app.get('/health', (req, res) => {
        res.json({ status: 'OK' });
      });
      app.get('/api/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should bypass rate limiting for health checks', async () => {
      // Health check should not be rate limited
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('OK');
      expect(healthResponse.headers['ratelimit-limit']).toBeUndefined();
    });
  });
});
