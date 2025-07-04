import request from 'supertest';
import express from 'express';
import { securityConfig, validateSecurityConfig } from '../../config/security.js';
import { applySecurityHeaders } from '../../middleware/securityHeadersMiddleware.js';
import { applyApiSecurity } from '../../middleware/apiSecurityMiddleware.js';
import { generalLimiter } from '../../middleware/rateLimitMiddleware.js';
import { securityMonitor, vulnerabilityScanner } from '../../utils/securityMonitoring.js';
import { secretsManager } from '../../utils/secretsManager.js';

describe('Security Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Security Configuration', () => {
    it('should validate security configuration', () => {
      expect(() => validateSecurityConfig()).not.toThrow();
    });

    it('should have required security settings', () => {
      expect(securityConfig.jwt.secret).toBeDefined();
      expect(securityConfig.rateLimiting.enabled).toBeDefined();
      expect(securityConfig.cors.origin).toBeDefined();
      expect(securityConfig.headers.contentSecurityPolicy).toBeDefined();
    });

    it('should have different settings for development and production', () => {
      const devCSP = securityConfig.headers.contentSecurityPolicy.development;
      const prodCSP = securityConfig.headers.contentSecurityPolicy.production;

      expect(devCSP.scriptSrc).toContain("'unsafe-inline'");
      expect(prodCSP.scriptSrc).not.toContain("'unsafe-inline'");
    });
  });

  describe('Security Headers Integration', () => {
    beforeEach(() => {
      app.use(...applySecurityHeaders());
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should apply comprehensive security headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Check for essential security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should include API version headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['api-version']).toBeDefined();
    });
  });

  describe('API Security Integration', () => {
    beforeEach(() => {
      app.use(...applyApiSecurity({
        enableRequestLogging: true,
        enableCorrelation: true,
        enableVersioning: true
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should add request correlation ID', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should handle API versioning', async () => {
      const response = await request(app)
        .get('/test')
        .set('API-Version', 'v1')
        .expect(200);

      expect(response.headers['api-version']).toBe('v1');
    });

    it('should reject unsupported API versions', async () => {
      await request(app)
        .get('/test')
        .set('API-Version', 'v99')
        .expect(400);
    });
  });

  describe('Rate Limiting Integration', () => {
    beforeEach(() => {
      // Use a very low limit for testing
      const testLimiter = require('express-rate-limit')({
        windowMs: 1000,
        max: 2,
        message: {
          success: false,
          error: {
            message: 'Too many requests',
            type: 'RATE_LIMIT_EXCEEDED'
          }
        }
      });

      app.use(testLimiter);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests within limit', async () => {
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
    });

    it('should block requests exceeding limit', async () => {
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      const response = await request(app)
        .get('/test')
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('CORS Security', () => {
    beforeEach(() => {
      const cors = require('cors');
      app.use(cors({
        origin: ['http://localhost:3000'],
        credentials: true
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests from whitelisted origins', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should handle preflight requests', async () => {
      await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
    });
  });

  describe('Input Validation Security', () => {
    beforeEach(() => {
      const { sanitizeRequest } = require('../../middleware/validationMiddleware.js');
      app.use(sanitizeRequest);
      app.post('/test', (req, res) => {
        res.json(req.body);
      });
    });

    it('should sanitize malicious input', async () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>Test Title',
        description: 'Test & "description" with <tags>'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData)
        .expect(200);

      expect(response.body.title).not.toContain('<script>');
      expect(response.body.title).toContain('alert("xss")Test Title');
      expect(response.body.description).toContain('&amp;');
      expect(response.body.description).toContain('&quot;');
    });

    it('should handle nested object sanitization', async () => {
      const maliciousData = {
        book: {
          title: '<script>alert("nested")</script>',
          metadata: {
            description: 'Nested & "content"'
          }
        }
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData)
        .expect(200);

      expect(response.body.book.title).not.toContain('<script>');
      expect(response.body.book.metadata.description).toContain('&amp;');
    });
  });

  describe('Error Handling Security', () => {
    beforeEach(() => {
      const { errorHandler } = require('../../middleware/errorMiddleware.js');

      app.get('/error', (req, res, next) => {
        const error = new Error('Test error with sensitive data: password123');
        error.stack = 'Sensitive stack trace information';
        next(error);
      });

      app.use(errorHandler);
    });

    it('should not leak sensitive information in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/error')
        .expect(500);

      expect(response.body.error.stack).toBeUndefined();
      expect(response.body.error.details).toBeUndefined();

      process.env.NODE_ENV = 'test';
    });

    it('should include debug info in development', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/error')
        .expect(500);

      expect(response.body.error.stack).toBeDefined();

      process.env.NODE_ENV = 'test';
    });
  });

  describe('Health Check Security', () => {
    beforeEach(() => {
      const { healthCheck } = require('../../middleware/apiSecurityMiddleware.js');
      app.use(healthCheck);
      app.get('/other', (req, res) => {
        res.json({ message: 'other endpoint' });
      });
    });

    it('should respond to health checks', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it('should not interfere with other endpoints', async () => {
      await request(app)
        .get('/other')
        .expect(200);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with proper format', () => {
      const { logSecurityEvent } = require('../../middleware/tokenSecurityMiddleware.js');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockReq = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
        originalUrl: '/test',
        method: 'GET',
        user: { _id: 'test-user-id' }
      };

      logSecurityEvent('TEST_SECURITY_EVENT', mockReq, {
        severity: 'high',
        details: 'Test security event'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔒 Security Event:',
        expect.objectContaining({
          event: 'TEST_SECURITY_EVENT',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          url: '/test',
          method: 'GET',
          userId: 'test-user-id',
          severity: 'high',
          details: 'Test security event',
          timestamp: expect.any(String)
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Security Monitoring', () => {
    beforeEach(async () => {
      await securityMonitor.initialize();
    });

    it('should record security events', () => {
      const event = securityMonitor.recordEvent('TEST_EVENT', {
        test: 'data'
      });

      expect(event.type).toBe('TEST_EVENT');
      expect(event.data.test).toBe('data');
      expect(event.timestamp).toBeDefined();
      expect(event.id).toBeDefined();
    });

    it('should create alerts when thresholds are exceeded', () => {
      // Record multiple failed login events
      for (let i = 0; i < 6; i++) {
        securityMonitor.recordEvent('FAILED_LOGIN', {
          ip: '127.0.0.1',
          attempt: i + 1
        });
      }

      const alerts = securityMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const failedLoginAlert = alerts.find(a =>
        a.type === 'FAILED_LOGIN_THRESHOLD_EXCEEDED'
      );
      expect(failedLoginAlert).toBeDefined();
    });

    it('should generate security metrics', () => {
      securityMonitor.recordEvent('TEST_EVENT_1');
      securityMonitor.recordEvent('TEST_EVENT_2');
      securityMonitor.recordEvent('TEST_EVENT_1');

      const metrics = securityMonitor.getMetrics();

      expect(metrics.metrics.TEST_EVENT_1.count).toBe(2);
      expect(metrics.metrics.TEST_EVENT_2.count).toBe(1);
    });

    it('should acknowledge alerts', () => {
      const alert = securityMonitor.createAlert({
        type: 'TEST_ALERT',
        level: 'medium',
        message: 'Test alert'
      });

      const acknowledgedAlert = securityMonitor.acknowledgeAlert(alert.id, 'test-user');

      expect(acknowledgedAlert.acknowledged).toBe(true);
      expect(acknowledgedAlert.acknowledgedBy).toBe('test-user');
    });

    it('should generate security reports', () => {
      securityMonitor.recordEvent('FAILED_LOGIN');
      securityMonitor.recordEvent('SUSPICIOUS_REQUEST');

      const report = securityMonitor.generateReport();

      expect(report.summary.totalEvents).toBeGreaterThan(0);
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('Vulnerability Scanning', () => {
    it('should scan for configuration vulnerabilities', async () => {
      const scan = await vulnerabilityScanner.scanVulnerabilities();

      expect(scan.timestamp).toBeDefined();
      expect(scan.vulnerabilities).toBeDefined();
      expect(scan.summary).toBeDefined();
      expect(scan.summary.total).toBe(scan.vulnerabilities.length);
    });

    it('should detect weak JWT secrets', async () => {
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'weak'; // Set weak secret

      const scan = await vulnerabilityScanner.scanVulnerabilities();
      const weakSecretVuln = scan.vulnerabilities.find(v =>
        v.type === 'WEAK_JWT_SECRET'
      );

      expect(weakSecretVuln).toBeDefined();
      expect(weakSecretVuln.severity).toBe('high');

      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });

    it('should detect default passwords', async () => {
      process.env.TEST_PASSWORD = 'password'; // Set default password

      const scan = await vulnerabilityScanner.scanVulnerabilities();
      const defaultPasswordVuln = scan.vulnerabilities.find(v =>
        v.type === 'DEFAULT_PASSWORD'
      );

      expect(defaultPasswordVuln).toBeDefined();
      expect(defaultPasswordVuln.severity).toBe('critical');

      // Clean up
      delete process.env.TEST_PASSWORD;
    });
  });

  describe('Secrets Management', () => {
    beforeEach(async () => {
      await secretsManager.initialize();
    });

    it('should store and retrieve secrets', async () => {
      await secretsManager.setSecret('test-secret', 'secret-value');
      const value = await secretsManager.getSecret('test-secret');

      expect(value).toBe('secret-value');
    });

    it('should encrypt secrets', async () => {
      await secretsManager.setSecret('encrypted-secret', 'sensitive-data');

      // Check that the stored value is encrypted
      const secretData = secretsManager.secrets.get('encrypted-secret');
      expect(secretData.value).not.toBe('sensitive-data');
      expect(secretData.value).toContain(':'); // Encrypted format
    });

    it('should handle secret metadata', async () => {
      const metadata = { description: 'Test secret', category: 'testing' };
      await secretsManager.setSecret('meta-secret', 'value', metadata);

      const secrets = secretsManager.listSecrets();
      const secret = secrets.find(s => s.key === 'meta-secret');

      expect(secret.metadata.description).toBe('Test secret');
      expect(secret.metadata.category).toBe('testing');
    });

    it('should audit secrets', () => {
      const audit = secretsManager.auditSecrets();

      expect(audit.timestamp).toBeDefined();
      expect(audit.totalSecrets).toBeDefined();
      expect(audit.secrets).toBeDefined();
    });
  });

  describe('Comprehensive Security Stack', () => {
    beforeEach(() => {
      // Apply full security stack
      app.use(...applySecurityHeaders());
      app.use(...applyApiSecurity());

      app.get('/secure', (req, res) => {
        res.json({
          message: 'secure endpoint',
          correlationId: req.correlationId,
          apiVersion: req.apiVersion
        });
      });
    });

    it('should apply all security measures together', async () => {
      const response = await request(app)
        .get('/secure')
        .expect(200);

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).toBeDefined();

      // Check API security
      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['api-version']).toBeDefined();

      // Check response data
      expect(response.body.correlationId).toBeDefined();
      expect(response.body.apiVersion).toBeDefined();
    });
  });
});
