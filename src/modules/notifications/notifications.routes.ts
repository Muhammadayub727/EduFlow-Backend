import { Router, Response } from 'express';
import { db } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const notifications = db.notifications
      .findMany((n) => n.userId === req.user!.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ success: true, data: { notifications, unreadCount } });
  })
);

router.post(
  '/:id/read',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = db.notifications.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Bildirishnoma topilmadi');
    if (existing.userId !== req.user!.userId) throw ApiError.forbidden();
    const updated = db.notifications.update(req.params.id, { isRead: true });
    res.json({ success: true, data: updated });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const mine = db.notifications.findMany((n) => n.userId === req.user!.userId);
    mine.forEach((n) => db.notifications.update(n.id, { isRead: true }));
    res.json({ success: true, data: { success: true } });
  })
);

export default router;
