import { db, systemSettings } from '../config/db';
import { AttendanceStatus } from '../types/domain';

/**
 * Per-lesson price = monthly course fee / monthly lesson count (fixed at 12
 * per business rules, but read from settings so it stays configurable).
 */
export function lessonPrice(monthlyFee: number): number {
  return Math.round(monthlyFee / systemSettings.monthlyLessons);
}

/**
 * Counts attended lessons for a student within a group for a given month.
 * "Attended" = present. Excused absences are configurable: by default they
 * do NOT count as attended (no charge), matching "excused absence handling
 * should be configurable" from the spec - toggle below.
 */
const EXCUSED_COUNTS_AS_ATTENDED = false;

export function countAttendedLessons(studentId: string, groupId: string, month: string): number {
  const records = db.attendance.findMany(
    (r) => r.studentId === studentId && r.groupId === groupId && r.date.startsWith(month)
  );
  return records.filter(
    (r) => r.status === 'present' || (EXCUSED_COUNTS_AS_ATTENDED && r.status === 'excused')
  ).length;
}

/**
 * Determines whether a student is eligible for the "2+ courses" discount.
 */
export function isMultiCourseEligible(studentId: string): boolean {
  const profile = db.studentProfiles.findById(studentId);
  if (!profile) return false;
  return profile.courseIds.length >= 2;
}

/**
 * Determines whether a student is eligible for the "2+ siblings" discount.
 * Siblings are detected via a shared familyId on the student profile.
 */
export function isSiblingEligible(studentId: string): boolean {
  const profile = db.studentProfiles.findById(studentId);
  if (!profile || !profile.familyId) return false;
  const siblings = db.studentProfiles.findMany(
    (p) => p.familyId === profile.familyId && p.id !== studentId
  );
  return siblings.length >= 1; // i.e. 2+ siblings total including this student
}

/**
 * Computes the combined discount percent for a student (rules can stack or
 * cap - here we take the larger of the two, configurable).
 */
export function computeDiscountPercent(studentId: string): number {
  const multi = isMultiCourseEligible(studentId) ? systemSettings.multiCourseDiscountPercent : 0;
  const sibling = isSiblingEligible(studentId) ? systemSettings.siblingDiscountPercent : 0;
  return Math.max(multi, sibling);
}

/**
 * Computes the amount due for a student in a group for a given month, based
 * on attended lessons and applicable discount.
 */
export function computeAmountDue(
  studentId: string,
  groupId: string,
  monthlyFee: number,
  month: string
): { attendedLessons: number; perLesson: number; discountPercent: number; amountDue: number } {
  const attendedLessons = countAttendedLessons(studentId, groupId, month);
  const perLesson = lessonPrice(monthlyFee);
  const discountPercent = computeDiscountPercent(studentId);
  const gross = attendedLessons * perLesson;
  const amountDue = Math.round(gross * (1 - discountPercent / 100));
  return { attendedLessons, perLesson, discountPercent, amountDue };
}

/**
 * Salary = sum of PAID student payments for the teacher's groups in a month,
 * multiplied by the teacher's salary percentage.
 */
export function computeTeacherSalary(teacherId: string, month: string): {
  totalCollected: number;
  percent: number;
  salaryAmount: number;
} {
  const teacherProfile = db.teacherProfiles.findById(teacherId);
  const percent = teacherProfile?.salaryPercent ?? 0;
  const groupIds = teacherProfile?.groupIds ?? [];

  const payments = db.payments.findMany(
    (p) => groupIds.includes(p.groupId) && p.month === month
  );
  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const salaryAmount = Math.round((totalCollected * percent) / 100);

  return { totalCollected, percent, salaryAmount };
}

export function attendanceStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'Keldi';
    case 'absent':
      return 'Kelmadi';
    case 'excused':
      return 'Sababli';
    default:
      return status;
  }
}
