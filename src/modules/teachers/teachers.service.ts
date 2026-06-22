import bcrypt from 'bcryptjs';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { CreateTeacherInput, UpdateTeacherInput } from './teachers.schema';
import { computeTeacherSalary } from '../../utils/businessRules';

function randomTempPassword(): string {
  return Math.random().toString(36).slice(-10) + 'A1!';
}

export const teachersService = {
  list() {
    const profiles = db.teacherProfiles.findAll();
    const month = nowIso().slice(0, 7);
    return profiles.map((p) => {
      const user = db.users.findById(p.id);
      const groups = p.groupIds.map((gid) => db.groups.findById(gid)).filter(Boolean);
      const studentCount = groups.reduce((sum, g) => sum + (g?.studentIds.length || 0), 0);
      const { salaryAmount } = computeTeacherSalary(p.id, month);
      return {
        id: p.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        phone: user?.phone,
        isActive: user?.isActive,
        salaryPercent: p.salaryPercent,
        employmentStatus: p.employmentStatus,
        hireDate: p.hireDate,
        groupCount: groups.length,
        studentCount,
        currentMonthSalary: salaryAmount,
        groups: groups.map((g) => ({ id: g!.id, name: g!.name })),
      };
    });
  },

  getById(id: string) {
    const profile = db.teacherProfiles.findById(id);
    if (!profile) throw ApiError.notFound('O\'qituvchi topilmadi');
    const user = db.users.findById(id);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');

    const groups = profile.groupIds.map((gid) => db.groups.findById(gid)).filter(Boolean);
    const salaryHistory = db.salaries.findMany((s) => s.teacherId === id);

    return {
      id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      salaryPercent: profile.salaryPercent,
      employmentStatus: profile.employmentStatus,
      hireDate: profile.hireDate,
      groups,
      salaryHistory,
    };
  },

  create(input: CreateTeacherInput) {
    const existing = db.users.findOne((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) throw ApiError.conflict('Bu email allaqachon mavjud');

    const user = db.users.create({
      id: newId(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(randomTempPassword(), 10),
      phone: input.phone,
      roles: ['teacher'],
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    const profile = db.teacherProfiles.create({
      id: user.id,
      salaryPercent: input.salaryPercent,
      groupIds: [],
      hireDate: input.hireDate,
      employmentStatus: 'active',
    });

    db.employees.create({
      id: user.id,
      position: 'O\'qituvchi',
      hireDate: input.hireDate,
      employmentStatus: 'active',
    });

    const { passwordHash, ...publicUser } = user;
    return { user: publicUser, profile };
  },

  update(id: string, input: UpdateTeacherInput) {
    const profile = db.teacherProfiles.findById(id);
    if (!profile) throw ApiError.notFound('O\'qituvchi topilmadi');
    const user = db.users.findById(id);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');

    if (input.firstName || input.lastName || input.phone) {
      db.users.update(id, {
        firstName: input.firstName ?? user.firstName,
        lastName: input.lastName ?? user.lastName,
        phone: input.phone ?? user.phone,
        updatedAt: nowIso(),
      });
    }

    const patch: Partial<typeof profile> = {};
    if (input.salaryPercent !== undefined) patch.salaryPercent = input.salaryPercent;
    if (input.employmentStatus) patch.employmentStatus = input.employmentStatus;
    const updated = db.teacherProfiles.update(id, patch);

    if (input.employmentStatus) {
      db.employees.update(id, { employmentStatus: input.employmentStatus });
    }

    return updated;
  },

  remove(id: string) {
    const profile = db.teacherProfiles.findById(id);
    if (!profile) throw ApiError.notFound('O\'qituvchi topilmadi');
    db.teacherProfiles.update(id, { employmentStatus: 'terminated' });
    db.employees.update(id, { employmentStatus: 'terminated', terminationDate: nowIso().slice(0, 10) });
    db.users.update(id, { isActive: false });
    return { success: true };
  },
};
