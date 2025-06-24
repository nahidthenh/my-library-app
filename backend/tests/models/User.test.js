import User from '../../models/User.js';
import { createTestUser, generateUserData } from '../helpers/testHelpers.js';

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = generateUserData();
      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.googleId).toBe(userData.googleId);
      expect(user.createdAt).toBeDefined();
      expect(user.lastLogin).toBeDefined();
    });

    it('should set default preferences', async () => {
      const userData = generateUserData();
      const user = await User.create(userData);

      expect(user.preferences.theme).toBe('system');
      expect(user.preferences.defaultView).toBe('grid');
      expect(user.preferences.booksPerPage).toBe(20);
    });

    it('should set default reading goal', async () => {
      const userData = generateUserData();
      const user = await User.create(userData);

      expect(user.readingGoal.yearly).toBe(12);
      expect(user.readingGoal.current).toBe(0);
    });

    it('should set default active status', async () => {
      const userData = generateUserData();
      const user = await User.create(userData);

      expect(user.isActive).toBe(true);
    });
  });

  describe('User Validation', () => {
    it('should require googleId', async () => {
      const userData = generateUserData();
      delete userData.googleId;

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require email', async () => {
      const userData = generateUserData();
      delete userData.email;

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require name', async () => {
      const userData = generateUserData();
      delete userData.name;

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = generateUserData({ email: 'invalid-email' });

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = generateUserData();
      await User.create(userData);

      const duplicateUser = generateUserData({ email: userData.email });
      await expect(User.create(duplicateUser)).rejects.toThrow();
    });

    it('should enforce unique googleId', async () => {
      const userData = generateUserData();
      await User.create(userData);

      const duplicateUser = generateUserData({ googleId: userData.googleId });
      await expect(User.create(duplicateUser)).rejects.toThrow();
    });

    it('should validate name length', async () => {
      const userData = generateUserData({ name: 'a'.repeat(101) });

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should validate theme enum', async () => {
      const userData = generateUserData();
      userData.preferences = { theme: 'invalid-theme' };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should validate defaultView enum', async () => {
      const userData = generateUserData();
      userData.preferences = { defaultView: 'invalid-view' };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should validate booksPerPage range', async () => {
      const userData = generateUserData();
      userData.preferences = { booksPerPage: 5 }; // Below minimum

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    it('should calculate reading goal progress percentage', async () => {
      const user = await createTestUser({
        readingGoal: { yearly: 10, current: 3 }
      });

      const progress = user.readingGoalProgress;
      expect(progress).toBe(30);
    });

    it('should handle reading goal progress with zero current', async () => {
      const user = await createTestUser({
        readingGoal: { yearly: 10, current: 0 }
      });

      const progress = user.readingGoalProgress;
      expect(progress).toBe(0);
    });

    it('should handle reading goal progress when goal is achieved', async () => {
      const user = await createTestUser({
        readingGoal: { yearly: 5, current: 5 }
      });

      const progress = user.readingGoalProgress;
      expect(progress).toBe(100);
    });
  });

  describe('User Statics', () => {
    it('should find active users', async () => {
      await createTestUser({ isActive: true });
      await createTestUser({ isActive: false });

      const activeUsers = await User.findActiveUsers();
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].isActive).toBe(true);
    });

    it('should get user statistics', async () => {
      await createTestUser({ isActive: true, readingGoal: { yearly: 10, current: 5 } });
      await createTestUser({ isActive: false, readingGoal: { yearly: 15, current: 3 } });

      const stats = await User.getUserStats();
      expect(stats.totalUsers).toBe(2);
      expect(stats.activeUsers).toBe(1);
      expect(stats.averageReadingGoal).toBe(12.5);
      expect(stats.totalBooksRead).toBe(8);
    });
  });
});
