import { Router, Response } from 'express';
import { authService } from './auth.service';
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  switchRoleSchema,
  refreshSchema,
} from './auth.schema';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.post(
  '/sign-up',
  validateBody(signUpSchema),
  asyncHandler(async (req, res: Response) => {
    const result = authService.signUp(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

router.post(
  '/sign-in',
  validateBody(signInSchema),
  asyncHandler(async (req, res: Response) => {
    const result = authService.signIn(req.body);
    res.status(200).json({ success: true, data: result });
  })
);

router.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res: Response) => {
    const result = authService.refresh(req.body.refreshToken);
    res.status(200).json({ success: true, data: result });
  })
);

router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res: Response) => {
    const result = authService.forgotPassword(req.body.email);
    res.status(200).json({
      success: true,
      message: 'Agar bu email ro\'yxatdan o\'tgan bo\'lsa, parolni tiklash havolasi yuborildi',
      // exposed only for local/dev testing without an email server
      devResetToken: result.devResetToken,
    });
  })
);

router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res: Response) => {
    const result = authService.resetPassword(req.body.token, req.body.newPassword);
    res.status(200).json({ success: true, data: result });
  })
);

router.post(
  '/switch-role',
  requireAuth,
  validateBody(switchRoleSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = authService.switchRole(req.user!.userId, req.body.role);
    res.status(200).json({ success: true, data: result });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = authService.me(req.user!.userId);
    res.status(200).json({ success: true, data: { user, activeRole: req.user!.activeRole } });
  })
);

export default router;
