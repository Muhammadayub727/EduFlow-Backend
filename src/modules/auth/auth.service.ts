import bcrypt from 'bcryptjs';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { User, PublicUser, Role, StudentProfile, TeacherProfile } from '../../types/domain';
import { SignUpInput, SignInInput } from './auth.schema';

// In-memory store of password-reset tokens -> { userId, expiresAt }
// In production this would be a DB table with TTL / single-use enforcement.
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

function toPublicUser(user: User): PublicUser {
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

function buildAuthResponse(user: User, activeRole: Role) {
  const accessToken = signAccessToken({ userId: user.id, roles: user.roles, activeRole });
  const refreshToken = signRefreshToken({ userId: user.id });
  return {
    user: toPublicUser(user),
    activeRole,
    accessToken,
    refreshToken,
  };
}

export const authService = {
  signUp(input: SignUpInput) {
    const existing = db.users.findOne((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      throw ApiError.conflict('Bu email allaqachon ro\'yxatdan o\'tgan');
    }

    const user: User = {
      id: newId(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(input.password, 10),
      phone: input.phone,
      roles: [input.role],
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.users.create(user);

    if (input.role === 'student') {
      const profile: StudentProfile = {
        id: user.id,
        courseIds: [],
        groupIds: [],
        createdAt: nowIso(),
      };
      db.studentProfiles.create(profile);
    } else if (input.role === 'teacher') {
      const profile: TeacherProfile = {
        id: user.id,
        salaryPercent: 30,
        groupIds: [],
        hireDate: nowIso().slice(0, 10),
        employmentStatus: 'active',
      };
      db.teacherProfiles.create(profile);
      db.employees.create({
        id: user.id,
        position: 'O\'qituvchi',
        hireDate: nowIso().slice(0, 10),
        employmentStatus: 'active',
      });
    }

    return buildAuthResponse(user, input.role);
  },

  signIn(input: SignInInput) {
    const user = db.users.findOne((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (!user) {
      throw ApiError.unauthorized('Email yoki parol noto\'g\'ri');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('Hisobingiz bloklangan. Administratorga murojaat qiling');
    }
    const valid = bcrypt.compareSync(input.password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Email yoki parol noto\'g\'ri');
    }
    // default to the user's highest-privilege role
    const rolePriority: Role[] = ['super_admin', 'admin', 'teacher', 'student'];
    const activeRole = rolePriority.find((r) => user.roles.includes(r)) || user.roles[0];
    return buildAuthResponse(user, activeRole);
  },

  switchRole(userId: string, role: Role) {
    const user = db.users.findById(userId);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
    if (!user.roles.includes(role)) {
      throw ApiError.forbidden('Sizda bu rol mavjud emas');
    }
    return buildAuthResponse(user, role);
  },

  refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Refresh token yaroqsiz');
    }
    const user = db.users.findById(payload.userId);
    if (!user || !user.isActive) throw ApiError.unauthorized('Foydalanuvchi topilmadi');
    const rolePriority: Role[] = ['super_admin', 'admin', 'teacher', 'student'];
    const activeRole = rolePriority.find((r) => user.roles.includes(r)) || user.roles[0];
    return buildAuthResponse(user, activeRole);
  },

  forgotPassword(email: string) {
    const user = db.users.findOne((u) => u.email.toLowerCase() === email.toLowerCase());
    // Always respond success-shaped (don't leak which emails exist), but only
    // actually create a token if the user exists.
    if (user) {
      const token = newId() + newId();
      resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 30 });
      // In production this would be emailed. For local/dev use we return it
      // directly so the flow is testable end-to-end without an SMTP server.
      return { devResetToken: token };
    }
    return { devResetToken: null };
  },

  resetPassword(token: string, newPassword: string) {
    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      throw ApiError.badRequest('Token yaroqsiz yoki muddati o\'tgan');
    }
    const user = db.users.findById(entry.userId);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
    db.users.update(user.id, { passwordHash: bcrypt.hashSync(newPassword, 10), updatedAt: nowIso() });
    resetTokens.delete(token);
    return { success: true };
  },

  me(userId: string) {
    const user = db.users.findById(userId);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
    return toPublicUser(user);
  },
};
