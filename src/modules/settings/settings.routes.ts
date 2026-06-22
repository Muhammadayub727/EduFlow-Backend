import { Router, Response } from 'express';
import { z } from 'zod';
import { systemSettings, updateSystemSettings } from '../../config/db';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';

export const updateSettingsSchema = z.object({
  centerName: z.string().min(2).optional(),
  monthlyLessons: z.number().int().min(1).max(60).optional(),
  defaultMonthlyFee: z.number().min(0).optional(),
  siblingDiscountPercent: z.number().min(0).max(100).optional(),
  multiCourseDiscountPercent: z.number().min(0).max(100).optional(),
});

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res: Response) => {
    res.json({ success: true, data: systemSettings });
  })
);

router.put(
  '/',
  requireRole('super_admin'),
  validateBody(updateSettingsSchema),
  asyncHandler(async (req, res: Response) => {
    const updated = updateSystemSettings(req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
