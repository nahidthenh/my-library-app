import request from 'supertest';
import express from 'express';
import { createTestUser, generateTestToken, expectSuccess, expectUnauthorized } from '../helpers/testHelpers.js';
import User from '../../models/User.js';

// Mock Firebase admin before importing routes
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    })
  }),
  apps: { length: 0 }
}));

// Import routes after mocking
import authRoutes from '../../routes/authRoutes.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('Auth Controller', () => {
  describe('POST /api/v1/auth/google', () => {
    it('should authenticate existing user with valid token', async () => {
      // Create existing user
      const existingUser = await createTestUser({
        googleId: 'test-user-id',
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'valid-firebase-token'
        });

      expectSuccess(response, 200);
      expect(response.body.data.user.email).toBe(existingUser.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.message).toBe('Authentication successful');
    });

    it('should create new user with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'valid-firebase-token'
        });

      expectSuccess(response, 201);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.message).toBe('User created and authenticated successfully');

      // Verify user was created in database
      const createdUser = await User.findOne({ email: 'test@example.com' });
      expect(createdUser).toBeTruthy();
      expect(createdUser.googleId).toBe('test-user-id');
    });

    it('should return 400 for missing idToken', async () => {
      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('ID token is required');
    });

    it('should return 401 for invalid idToken', async () => {
      // Mock Firebase admin to reject token
      const admin = await import('firebase-admin');
      const mockAuth = admin.auth;
      mockAuth().verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should update lastLogin for existing user', async () => {
      const existingUser = await createTestUser({
        googleId: 'test-user-id',
        email: 'test@example.com',
        lastLogin: new Date('2023-01-01')
      });

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'valid-firebase-token'
        });

      expectSuccess(response, 200);

      // Check that lastLogin was updated
      const updatedUser = await User.findById(existingUser._id);
      expect(updatedUser.lastLogin.getTime()).toBeGreaterThan(existingUser.lastLogin.getTime());
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expectSuccess(response, 200);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile for authenticated user', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user._id);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expectSuccess(response, 200);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user.name).toBe(user.name);
      expect(response.body.data.user.googleId).toBe(user.googleId);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expectUnauthorized(response);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expectUnauthorized(response);
    });

    it('should return 401 for expired token', async () => {
      const user = await createTestUser();
      const expiredToken = generateTestToken(user._id, '-1h'); // Expired token

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expectUnauthorized(response);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token for authenticated user', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user._id);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expectSuccess(response, 200);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.message).toBe('Token refreshed successfully');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh');

      expectUnauthorized(response);
    });
  });
});
