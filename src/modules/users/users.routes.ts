import { Router, Response } from 'express';
import { z } from 'zod';
import { db, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { PublicUser } from '../../types/domain';

export const updateUserRolesSchema = z.object({
  roles: z.array(z.enum(['super_admin', 'admin', 'teacher', 'student'])).min(1, 'Kamida bitta rol tanlanishi shart'),
});

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

function toPublic(user: ReturnType<typeof db.users.findById>): PublicUser | null {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (_req, res: Response) => {
    res.json({ success: true, data: db.users.findAll().map(toPublic) });
  })
);

/**
 * Role assignment: only super_admin may grant/revoke the admin or
 * super_admin roles, to prevent privilege escalation by a regular admin.
 */
router.put(
  '/:id/roles',
  requireRole('super_admin'),
  validateBody(updateUserRolesSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = db.users.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Foydalanuvchi topilmadi');
    const updated = db.users.update(req.params.id, { roles: req.body.roles, updatedAt: nowIso() });
    res.json({ success: true, data: toPublic(updated) });
  })
);

router.put(
  '/:id/active',
  requireRole('super_admin', 'admin'),
  validateBody(setActiveSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = db.users.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Foydalanuvchi topilmadi');
    if (existing.roles.includes('super_admin') && req.user!.activeRole !== 'super_admin') {
      throw ApiError.forbidden('Super adminni faqat super admin bloklashi mumkin');
    }
    const updated = db.users.update(req.params.id, { isActive: req.body.isActive, updatedAt: nowIso() });
    res.json({ success: true, data: toPublic(updated) });
  })
);

export default router;
