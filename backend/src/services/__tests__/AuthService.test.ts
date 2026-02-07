import { AuthService } from '../AuthService';
import { User } from '@models/User';

// Mock the User model
jest.mock('@models/User');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        channelId: 'testuser-abc',
        toSafeObject: jest.fn().mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        }),
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User as any).mockImplementation(() => mockUser);

      const result = await AuthService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
      });

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should reject duplicate email', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

      await expect(
        AuthService.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
        })
      ).rejects.toThrow();
    });

    it('should reject weak password', async () => {
      await expect(
        AuthService.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'weak',
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        channelId: 'testuser-abc',
        comparePassword: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
        }),
      };

      (User.findOne as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockUser),
      }));

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should reject invalid email', async () => {
      (User.findOne as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(null),
      }));

      await expect(
        AuthService.login({
          email: 'wrong@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow();
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        save: jest.fn(),
        toSafeObject: jest.fn().mockReturnValue({ userId: 'user-123' }),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User as any).mockImplementation(() => mockUser);

      // Generate a token
      const { token } = await AuthService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
      });

      // Verify it
      const payload = AuthService.verifyToken(token);
      expect(payload.userId).toBe('user-123');
    });

    it('should reject invalid token', () => {
      expect(() => {
        AuthService.verifyToken('invalid-token');
      }).toThrow();
    });
  });
});
