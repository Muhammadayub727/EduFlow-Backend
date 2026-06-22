import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';

export const hireEmployeeSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email('Email manzil noto\'g\'ri'),
  phone: z.string().min(7),
  position: z.string().min(2, 'Lavozim kiritilishi shart'),
  hireDate: z.string().min(8),
});

export const updateEmployeeSchema = z.object({
  position: z.string().min(2).optional(),
  employmentStatus: z.enum(['active', 'on_leave', 'terminated']).optional(),
});

function randomTempPassword(): string {
  return Math.random().toString(36).slice(-10) + 'A1!';
}

function enrich(employee: ReturnType<typeof db.employees.findById>) {
  if (!employee) return null;
  const user = db.users.findById(employee.id);
  return {
    ...employee,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    phone: user?.phone,
  };
}

const router = Router();
router.use(requireAuth);
router.use(requireRole('super_admin', 'admin'));

router.get(
  '/',
  asyncHandler(async (_req, res: Response) => {
    res.json({ success: true, data: db.employees.findAll().map(enrich) });
  })
);

router.post(
  '/',
  validateBody(hireEmployeeSchema),
  asyncHandler(async (req, res: Response) => {
    const existing = db.users.findOne((u) => u.email.toLowerCase() === req.body.email.toLowerCase());
    if (existing) throw ApiError.conflict('Bu email allaqachon mavjud');

    const user = db.users.create({
      id: newId(),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(randomTempPassword(), 10),
      phone: req.body.phone,
      roles: ['admin'],
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    const employee = db.employees.create({
      id: user.id,
      position: req.body.position,
      hireDate: req.body.hireDate,
      employmentStatus: 'active',
    });

    res.status(201).json({ success: true, data: enrich(employee) });
  })
);

router.put(
  '/:id',
  validateBody(updateEmployeeSchema),
  asyncHandler(async (req, res: Response) => {
    const existing = db.employees.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Xodim topilmadi');
    const updated = db.employees.update(req.params.id, req.body);
    if (req.body.employmentStatus === 'terminated') {
      db.employees.update(req.params.id, { terminationDate: nowIso().slice(0, 10) });
      db.users.update(req.params.id, { isActive: false });
    }
    res.json({ success: true, data: enrich(updated) });
  })
);

router.delete(
  '/:id',
  requireRole('super_admin'),
  asyncHandler(async (req, res: Response) => {
    const existing = db.employees.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Xodim topilmadi');
    db.employees.update(req.params.id, { employmentStatus: 'terminated', terminationDate: nowIso().slice(0, 10) });
    db.users.update(req.params.id, { isActive: false });
    res.json({ success: true, data: { success: true } });
  })
);

export default router;
