// ============================================================================
// EduFlow - Shared domain types used across all backend modules
// ============================================================================

export type Role = 'super_admin' | 'admin' | 'teacher' | 'student';

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export type PaymentStatus = 'paid' | 'partial' | 'debt';

export type SalaryStatus = 'pending' | 'paid';

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated';

// ----------------------------------------------------------------------------
// USER (auth identity - shared base for every role)
// ----------------------------------------------------------------------------
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  roles: Role[]; // a person can hold multiple roles (e.g. admin + teacher)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: Role[];
  isActive: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// COURSE
// ----------------------------------------------------------------------------
export interface Course {
  id: string;
  name: string;
  description?: string;
  durationMonths: number;
  monthlyLessons: number; // fixed at 12 per business rules, but configurable
  monthlyFee: number; // UZS
  isActive: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// GROUP
// ----------------------------------------------------------------------------
export interface ScheduleSlot {
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  startTime: string; // "HH:mm"
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  studentIds: string[];
  startDate: string;
  schedule: ScheduleSlot[];
  isActive: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// STUDENT PROFILE
// ----------------------------------------------------------------------------
export interface StudentProfile {
  id: string; // == User.id
  age?: number;
  address?: string;
  familyId?: string; // used to detect siblings for discount
  courseIds: string[];
  groupIds: string[];
  createdAt: string;
}

// ----------------------------------------------------------------------------
// TEACHER PROFILE
// ----------------------------------------------------------------------------
export interface TeacherProfile {
  id: string; // == User.id
  salaryPercent: number; // e.g. 35 means 35%
  groupIds: string[];
  hireDate: string;
  employmentStatus: EmploymentStatus;
}

// ----------------------------------------------------------------------------
// EMPLOYEE (HR - non-teaching staff, but teachers also appear here for HR view)
// ----------------------------------------------------------------------------
export interface Employee {
  id: string; // == User.id
  position: string; // "Administrator", "Receptionist", "IT Teacher" etc.
  hireDate: string;
  terminationDate?: string;
  employmentStatus: EmploymentStatus;
}

// ----------------------------------------------------------------------------
// ATTENDANCE
// ----------------------------------------------------------------------------
export interface AttendanceRecord {
  id: string;
  groupId: string;
  studentId: string;
  date: string; // ISO date "YYYY-MM-DD"
  status: AttendanceStatus;
  reason?: string;
  markedByTeacherId: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// PAYMENT
// ----------------------------------------------------------------------------
export interface PaymentRecord {
  id: string;
  studentId: string;
  groupId: string;
  month: string; // "YYYY-MM"
  amountDue: number;
  amountPaid: number;
  discountPercent: number;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// SALARY
// ----------------------------------------------------------------------------
export interface SalaryRecord {
  id: string;
  teacherId: string;
  month: string; // "YYYY-MM"
  totalCollectedFromStudents: number;
  percent: number;
  salaryAmount: number;
  advancePaid: number;
  remaining: number;
  status: SalaryStatus;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// HOMEWORK
// ----------------------------------------------------------------------------
export interface Homework {
  id: string;
  groupId: string;
  title: string;
  description: string;
  deadline: string; // ISO date
  attachmentUrl?: string;
  createdByTeacherId: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// SCORE
// ----------------------------------------------------------------------------
export interface ScoreRecord {
  id: string;
  studentId: string;
  groupId: string;
  date: string; // ISO date - lesson date
  score: number; // 1-10
  comment?: string;
  gradedByTeacherId: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// NOTIFICATION
// ----------------------------------------------------------------------------
export type NotificationType =
  | 'lesson_starting'
  | 'payment_debt'
  | 'student_enrolled'
  | 'salary_ready'
  | 'homework_overdue'
  | 'general';

export interface Notification {
  id: string;
  userId: string; // recipient
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// AUDIT LOG
// ----------------------------------------------------------------------------
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// SETTINGS (singleton, editable by Super Admin)
// ----------------------------------------------------------------------------
export interface SystemSettings {
  centerName: string;
  monthlyLessons: number;
  defaultMonthlyFee: number;
  siblingDiscountPercent: number;
  multiCourseDiscountPercent: number;
}
