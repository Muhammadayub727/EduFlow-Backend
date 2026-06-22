import { Router, Response } from 'express';
import { studentsService } from './students.service';
import { createStudentSchema, updateStudentSchema } from './students.schema';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { db } from '../../config/db';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('super_admin', 'admin', 'teacher'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let students = studentsService.list();
    // teachers only see students enrolled in their own groups
    if (req.user!.activeRole === 'teacher') {
      const teacherProfile = db.teacherProfiles.findById(req.user!.userId);
      const myGroupIds = new Set(teacherProfile?.groupIds ?? []);
      students = students.filter((s) => s.groups.some((g) => myGroupIds.has(g.id)));
    }
    res.json({ success: true, data: students });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // students may only fetch their own profile; staff can fetch anyone's
    if (req.user!.activeRole === 'student' && req.user!.userId !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Faqat o\'z profilingizni ko\'rishingiz mumkin' });
    }
    res.json({ success: true, data: studentsService.getById(req.params.id) });
  })
);

router.post(
  '/',
  requireRole('super_admin', 'admin', 'teacher'),
  validateBody(createStudentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // teachers may only register a student into one of their own groups
    if (req.user!.activeRole === 'teacher') {
      const teacherProfile = db.teacherProfiles.findById(req.user!.userId);
      if (!teacherProfile?.groupIds.includes(req.body.groupId)) {
        throw ApiError.forbidden('Faqat o\'zingizning guruhlaringizga talaba qo\'shishingiz mumkin');
      }
    }
    const result = studentsService.create(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/:id',
  requireRole('super_admin', 'admin'),
  validateBody(updateStudentSchema),
  asyncHandler(async (req, res: Response) => {
    const result = studentsService.update(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

router.delete(
  '/:id',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res: Response) => {
    const result = studentsService.remove(req.params.id);
    res.json({ success: true, data: result });
  })
);

export default router;
