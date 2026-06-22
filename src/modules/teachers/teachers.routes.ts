import { Router, Response } from 'express';
import { teachersService } from './teachers.service';
import { createTeacherSchema, updateTeacherSchema } from './teachers.schema';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (_req, res: Response) => {
    res.json({ success: true, data: teachersService.list() });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user!.activeRole === 'teacher' && req.user!.userId !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Faqat o\'z profilingizni ko\'rishingiz mumkin' });
    }
    res.json({ success: true, data: teachersService.getById(req.params.id) });
  })
);

router.post(
  '/',
  requireRole('super_admin', 'admin'),
  validateBody(createTeacherSchema),
  asyncHandler(async (req, res: Response) => {
    const result = teachersService.create(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/:id',
  requireRole('super_admin', 'admin'),
  validateBody(updateTeacherSchema),
  asyncHandler(async (req, res: Response) => {
    const result = teachersService.update(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

router.delete(
  '/:id',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res: Response) => {
    const result = teachersService.remove(req.params.id);
    res.json({ success: true, data: result });
  })
);

export default router;
