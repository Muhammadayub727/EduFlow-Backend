import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { Role } from '../types/domain';
import { db } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roles: Role[];
    activeRole: Role;
  };
}

/**
 * Requires a valid Bearer access token. Attaches req.user on success.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Token topilmadi');
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    const user = db.users.findById(payload.userId);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Foydalanuvchi topilmadi yoki bloklangan');
    }
    req.user = { userId: payload.userId, roles: payload.roles, activeRole: payload.activeRole };
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Token yaroqsiz yoki muddati o\'tgan');
  }
}

/**
 * Restricts a route to one or more roles. Must be used after requireAuth.
 * Checks against the user's active role for this session.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (!allowedRoles.includes(req.user.activeRole)) {
      throw ApiError.forbidden('Bu amal uchun ruxsatingiz yo\'q');
    }
    next();
  };
}
