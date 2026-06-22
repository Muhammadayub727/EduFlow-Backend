import bcrypt from 'bcryptjs';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { CreateStudentInput, UpdateStudentInput } from './students.schema';
import { computeDiscountPercent } from '../../utils/businessRules';

function randomTempPassword(): string {
  return Math.random().toString(36).slice(-10) + 'A1!';
}

export const studentsService = {
  list() {
    const profiles = db.studentProfiles.findAll();
    return profiles.map((p) => {
      const user = db.users.findById(p.id);
      const groups = p.groupIds.map((gid) => db.groups.findById(gid)).filter(Boolean);
      const courses = p.courseIds.map((cid) => db.courses.findById(cid)).filter(Boolean);
      return {
        id: p.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        phone: user?.phone,
        email: user?.email,
        isActive: user?.isActive,
        age: p.age,
        address: p.address,
        familyId: p.familyId,
        discountPercent: computeDiscountPercent(p.id),
        groups: groups.map((g) => ({ id: g!.id, name: g!.name })),
        courses: courses.map((c) => ({ id: c!.id, name: c!.name })),
      };
    });
  },

  getById(id: string) {
    const profile = db.studentProfiles.findById(id);
    if (!profile) throw ApiError.notFound('Talaba topilmadi');
    const user = db.users.findById(id);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');

    const attendance = db.attendance.findMany((a) => a.studentId === id);
    const scores = db.scores.findMany((s) => s.studentId === id);
    const payments = db.payments.findMany((p) => p.studentId === id);
    const homework = profile.groupIds.flatMap((gid) => db.homework.findMany((h) => h.groupId === gid));

    return {
      id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      age: profile.age,
      address: profile.address,
      familyId: profile.familyId,
      isActive: user.isActive,
      discountPercent: computeDiscountPercent(id),
      groups: profile.groupIds.map((gid) => db.groups.findById(gid)).filter(Boolean),
      courses: profile.courseIds.map((cid) => db.courses.findById(cid)).filter(Boolean),
      attendance,
      scores,
      payments,
      homework,
    };
  },

  create(input: CreateStudentInput) {
    const course = db.courses.findById(input.courseId);
    if (!course) throw ApiError.badRequest('Tanlangan kurs topilmadi');
    const group = db.groups.findById(input.groupId);
    if (!group) throw ApiError.badRequest('Tanlangan guruh topilmadi');
    if (group.courseId !== input.courseId) {
      throw ApiError.badRequest('Tanlangan guruh shu kursga tegishli emas');
    }

    const email = input.email || `${input.firstName}.${input.lastName}.${Date.now()}@eduflow.uz`.toLowerCase();
    const existing = db.users.findOne((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw ApiError.conflict('Bu email allaqachon mavjud');

    const user = db.users.create({
      id: newId(),
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      passwordHash: bcrypt.hashSync(randomTempPassword(), 10),
      phone: input.phone,
      roles: ['student'],
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    const profile = db.studentProfiles.create({
      id: user.id,
      age: input.age,
      address: input.address,
      familyId: input.familyId,
      courseIds: [input.courseId],
      groupIds: [input.groupId],
      createdAt: nowIso(),
    });

    db.groups.update(group.id, { studentIds: [...group.studentIds, user.id] });

    // Notify admins/super admins of new enrollment
    const admins = db.users.findMany((u) => u.roles.includes('admin') || u.roles.includes('super_admin'));
    admins.forEach((admin) => {
      db.notifications.create({
        id: newId(),
        userId: admin.id,
        type: 'student_enrolled',
        message: `${user.firstName} ${user.lastName} "${group.name}" guruhiga ro'yxatdan o'tdi`,
        isRead: false,
        createdAt: nowIso(),
      });
    });

    const { passwordHash, ...publicUser } = user;
    return { user: publicUser, profile };
  },

  update(id: string, input: UpdateStudentInput) {
    const profile = db.studentProfiles.findById(id);
    if (!profile) throw ApiError.notFound('Talaba topilmadi');
    const user = db.users.findById(id);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');

    if (input.firstName || input.lastName || input.phone || input.email) {
      db.users.update(id, {
        firstName: input.firstName ?? user.firstName,
        lastName: input.lastName ?? user.lastName,
        phone: input.phone ?? user.phone,
        email: input.email ?? user.email,
        updatedAt: nowIso(),
      });
    }

    const patch: Partial<typeof profile> = {};
    if (input.age !== undefined) patch.age = input.age;
    if (input.address !== undefined) patch.address = input.address;
    if (input.familyId !== undefined) patch.familyId = input.familyId;
    if (input.courseId) patch.courseIds = [input.courseId];
    if (input.groupId) patch.groupIds = [input.groupId];

    const updated = db.studentProfiles.update(id, patch);
    return updated;
  },

  remove(id: string) {
    const profile = db.studentProfiles.findById(id);
    if (!profile) throw ApiError.notFound('Talaba topilmadi');
    profile.groupIds.forEach((gid) => {
      const group = db.groups.findById(gid);
      if (group) db.groups.update(gid, { studentIds: group.studentIds.filter((sid) => sid !== id) });
    });
    db.studentProfiles.remove(id);
    db.users.update(id, { isActive: false });
    return { success: true };
  },
};
