import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  generateSecureToken,
  generateRefreshToken,
  verifySecureToken,
  blacklistToken,
  isTokenBlacklisted,
  validateRefreshToken,
  revokeRefreshToken,
  tokenRotation,
  sessionManagement,
  detectSuspiciousActivity
} from '../../middleware/tokenSecurityMiddleware.js';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '15m';

describe('Token Security Middleware', () => {
  let app;
  const testUserId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Secure Token Generation', () => {
    it('should generate a secure access token', () => {
      const token = generateSecureToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(testUserId);
      expect(decoded.type).toBe('access');
      expect(decoded.jti).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should generate a refresh token', () => {
      const refreshToken = generateRefreshToken(testUserId);
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      
      const decoded = jwt.decode(refreshToken);
      expect(decoded.id).toBe(testUserId);
      expect(decoded.type).toBe('refresh');
    });

    it('should generate tokens with custom options', () => {
      const token = generateSecureToken(testUserId, {
        type: 'custom',
        expiresIn: '1h'
      });
      
      const decoded = jwt.decode(token);
      expect(decoded.type).toBe('custom');
      
      // Check expiration is approximately 1 hour from now
      const expectedExp = Math.floor(Date.now() / 1000) + 3600;
      expect(decoded.exp).toBeCloseTo(expectedExp, -2);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid tokens', async () => {
      const token = generateSecureToken(testUserId);
      const decoded = await verifySecureToken(token);
      
      expect(decoded.id).toBe(testUserId);
      expect(decoded.type).toBe('access');
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(verifySecureToken(invalidToken))
        .rejects
        .toThrow('Invalid token');
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUserId, exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET
      );
      
      await expect(verifySecureToken(expiredToken))
        .rejects
        .toThrow('Token expired');
    });

    it('should reject tokens with wrong type', async () => {
      const refreshToken = generateSecureToken(testUserId, { type: 'refresh' });
      
      await expect(verifySecureToken(refreshToken, { requireType: 'access' }))
        .rejects
        .toThrow('Invalid token type');
    });

    it('should reject old tokens', async () => {
      const oldToken = jwt.sign(
        { 
          id: testUserId, 
          iat: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
          exp: Math.floor(Date.now() / 1000) + 3600   // Still valid but old
        },
        process.env.JWT_SECRET
      );
      
      await expect(verifySecureToken(oldToken, { maxAge: 3600 })) // Max 1 hour
        .rejects
        .toThrow('Token too old, please refresh');
    });
  });

  describe('Token Blacklisting', () => {
    it('should blacklist tokens', () => {
      const token = generateSecureToken(testUserId);
      
      expect(isTokenBlacklisted(token)).toBe(false);
      blacklistToken(token);
      expect(isTokenBlacklisted(token)).toBe(true);
    });

    it('should reject blacklisted tokens', async () => {
      const token = generateSecureToken(testUserId);
      blacklistToken(token);
      
      await expect(verifySecureToken(token))
        .rejects
        .toThrow('Token has been revoked');
    });
  });

  describe('Refresh Token Management', () => {
    it('should validate valid refresh tokens', () => {
      const refreshToken = generateRefreshToken(testUserId);
      const tokenData = validateRefreshToken(refreshToken);
      
      expect(tokenData.userId).toBe(testUserId);
      expect(tokenData.isActive).toBe(true);
      expect(tokenData.createdAt).toBeInstanceOf(Date);
    });

    it('should reject invalid refresh tokens', () => {
      expect(() => validateRefreshToken('invalid-token'))
        .toThrow('Invalid refresh token');
    });

    it('should reject revoked refresh tokens', () => {
      const refreshToken = generateRefreshToken(testUserId);
      revokeRefreshToken(refreshToken);
      
      expect(() => validateRefreshToken(refreshToken))
        .toThrow('Refresh token has been revoked');
    });
  });

  describe('Token Rotation Middleware', () => {
    beforeEach(() => {
      app.use(tokenRotation);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should not rotate fresh tokens', async () => {
      const token = generateSecureToken(testUserId);
      
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.headers['x-new-token']).toBeUndefined();
      expect(response.headers['x-token-rotated']).toBeUndefined();
    });

    it('should rotate tokens close to expiration', async () => {
      // Create token that expires in 2 minutes
      const shortLivedToken = jwt.sign(
        { 
          id: testUserId,
          exp: Math.floor(Date.now() / 1000) + 120 // 2 minutes
        },
        process.env.JWT_SECRET
      );
      
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(200);
      
      expect(response.headers['x-new-token']).toBeDefined();
      expect(response.headers['x-token-rotated']).toBe('true');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      // Mock User model
      const mockUser = {
        _id: testUserId,
        lastActivity: new Date(),
        lastIP: '127.0.0.1',
        lastUserAgent: 'test-agent'
      };
      
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });
      
      app.use(sessionManagement);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should handle session management without errors', async () => {
      const token = generateSecureToken(testUserId);
      
      await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Suspicious Activity Detection', () => {
    beforeEach(() => {
      const mockUser = {
        _id: testUserId,
        lastIP: '192.168.1.1',
        lastUserAgent: 'Mozilla/5.0',
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      };
      
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });
      
      app.use(detectSuspiciousActivity);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should detect IP changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '10.0.0.1')
        .expect(200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Security Event:'),
        expect.objectContaining({
          event: 'IP_CHANGE'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should detect user agent changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(app)
        .get('/test')
        .set('User-Agent', 'Different Browser')
        .expect(200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Security Event:'),
        expect.objectContaining({
          event: 'USER_AGENT_CHANGE'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should detect user reactivation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(app)
        .get('/test')
        .expect(200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Security Event:'),
        expect.objectContaining({
          event: 'USER_REACTIVATION'
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with proper format', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockReq = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
        originalUrl: '/test',
        method: 'GET',
        user: { _id: testUserId }
      };
      
      const { logSecurityEvent } = require('../../middleware/tokenSecurityMiddleware.js');
      logSecurityEvent('TEST_EVENT', mockReq, { additional: 'data' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔒 Security Event:',
        expect.objectContaining({
          event: 'TEST_EVENT',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          url: '/test',
          method: 'GET',
          userId: testUserId,
          additional: 'data',
          timestamp: expect.any(String)
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
});
