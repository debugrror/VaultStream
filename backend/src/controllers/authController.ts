import { Request, Response } from 'express';
import { AuthService, RegisterInput, LoginInput } from '@services/AuthService';
import { asyncHandler } from '@middleware/errorHandler';
import type { ApiResponse, AuthenticatedRequest } from '../types';


/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const input: RegisterInput = {
    email: req.body.email,
    password: req.body.password,
    username: req.body.username,
  };

  const result = await AuthService.register(input);

  const response: ApiResponse = {
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(201).json(response);
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const input: LoginInput = {
    email: req.body.email,
    password: req.body.password,
  };

  const result = await AuthService.login(input);

  const response: ApiResponse = {
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    throw new Error('User not authenticated');
  }

  const user = await AuthService.getUserById(authReq.user.userId);

  const response: ApiResponse = {
    success: true,
    data: {
      user: user.toSafeObject(),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});
