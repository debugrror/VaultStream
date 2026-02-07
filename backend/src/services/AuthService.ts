import jwt from 'jsonwebtoken';
import { User, IUser, SafeUser } from '@models/User';
import { config } from '@config/env';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';
import type { JwtPayload } from '../types';


/**
 * Registration input
 */
export interface RegisterInput {
  email: string;
  password: string;
  username: string;
}

/**
 * Login input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Auth response
 */
export interface AuthResponse {
  user: SafeUser;
  token: string;
  expiresIn: string;
}

/**
 * Authentication service
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, username } = input;

    // Validate input
    this.validateEmail(email);
    this.validatePassword(password);
    this.validateUsername(username);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
      }
      throw ApiError.conflict('Username already taken', 'USERNAME_EXISTS');
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      username,
    });

    await user.save();

    logger.info('User registered successfully', { userId: user.userId, email });

    // Generate token
    const token = this.generateToken(user);

    return {
      user: user.toSafeObject(),
      token,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Login user
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user (include passwordHash)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    logger.info('User logged in successfully', { userId: user.userId, email });

    // Generate token
    const token = this.generateToken(user);

    return {
      user: user.toSafeObject(),
      token,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
      }
      throw ApiError.unauthorized('Token verification failed', 'TOKEN_ERROR');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<IUser> {
    const user = await User.findOne({ userId });

    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    return user;
  }

  /**
   * Generate JWT token
   */
  private static generateToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user.userId,
      email: user.email,
      channelId: user.channelId,
    };

    const options: any = {
      expiresIn: config.jwt.expiresIn,
    };

    return jwt.sign(payload, config.jwt.secret, options);
  }

  /**
   * Validate email format
   */
  private static validateEmail(email: string): void {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw ApiError.badRequest('Invalid email format', 'INVALID_EMAIL');
    }
  }

  /**
   * Validate password strength
   */
  private static validatePassword(password: string): void {
    if (password.length < 8) {
      throw ApiError.badRequest(
        'Password must be at least 8 characters long',
        'WEAK_PASSWORD'
      );
    }

    // Optional: Add more password strength requirements
    if (!/[A-Z]/.test(password)) {
      throw ApiError.badRequest(
        'Password must contain at least one uppercase letter',
        'WEAK_PASSWORD'
      );
    }

    if (!/[a-z]/.test(password)) {
      throw ApiError.badRequest(
        'Password must contain at least one lowercase letter',
        'WEAK_PASSWORD'
      );
    }

    if (!/[0-9]/.test(password)) {
      throw ApiError.badRequest(
        'Password must contain at least one number',
        'WEAK_PASSWORD'
      );
    }
  }

  /**
   * Validate username
   */
  private static validateUsername(username: string): void {
    if (username.length < 3 || username.length > 30) {
      throw ApiError.badRequest(
        'Username must be between 3 and 30 characters',
        'INVALID_USERNAME'
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw ApiError.badRequest(
        'Username can only contain letters, numbers, underscores, and hyphens',
        'INVALID_USERNAME'
      );
    }
  }
}
