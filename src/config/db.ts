// ============================================================================
// In-memory data store.
//
// Design note: every "repository" below exposes the same shape (find, findById,
// create, update, remove) that a real database repository would. When you are
// ready to move to PostgreSQL + Prisma, you only need to re-implement THIS
// file's exported repository objects against Prisma Client - nothing in the
// route/service layer needs to change, because services only depend on these
// function signatures.
// ============================================================================

import { v4 as uuid } from 'uuid';
import {
  User,
  Course,
  Group,
  StudentProfile,
  TeacherProfile,
  Employee,
  AttendanceRecord,
  PaymentRecord,
  SalaryRecord,
  Homework,
  ScoreRecord,
  Notification,
  AuditLog,
  SystemSettings,
} from '../types/domain';

function createRepository<T extends { id: string }>() {
  const items = new Map<string, T>();

  return {
    findAll(): T[] {
      return Array.from(items.values());
    },
    findById(id: string): T | undefined {
      return items.get(id);
    },
    findOne(predicate: (item: T) => boolean): T | undefined {
      return Array.from(items.values()).find(predicate);
    },
    findMany(predicate: (item: T) => boolean): T[] {
      return Array.from(items.values()).filter(predicate);
    },
    create(item: T): T {
      items.set(item.id, item);
      return item;
    },
    update(id: string, patch: Partial<T>): T | undefined {
      const existing = items.get(id);
      if (!existing) return undefined;
      const updated = { ...existing, ...patch };
      items.set(id, updated);
      return updated;
    },
    remove(id: string): boolean {
      return items.delete(id);
    },
    count(): number {
      return items.size;
    },
  };
}

export const db = {
  users: createRepository<User>(),
  courses: createRepository<Course>(),
  groups: createRepository<Group>(),
  studentProfiles: createRepository<StudentProfile>(),
  teacherProfiles: createRepository<TeacherProfile>(),
  employees: createRepository<Employee>(),
  attendance: createRepository<AttendanceRecord>(),
  payments: createRepository<PaymentRecord>(),
  salaries: createRepository<SalaryRecord>(),
  homework: createRepository<Homework>(),
  scores: createRepository<ScoreRecord>(),
  notifications: createRepository<Notification>(),
  auditLogs: createRepository<AuditLog>(),
};

export let systemSettings: SystemSettings = {
  centerName: 'EduFlow Academy',
  monthlyLessons: 12,
  defaultMonthlyFee: 250000,
  siblingDiscountPercent: 10,
  multiCourseDiscountPercent: 10,
};

export function updateSystemSettings(patch: Partial<SystemSettings>): SystemSettings {
  systemSettings = { ...systemSettings, ...patch };
  return systemSettings;
}

export function newId(): string {
  return uuid();
}

export function nowIso(): string {
  return new Date().toISOString();
}
