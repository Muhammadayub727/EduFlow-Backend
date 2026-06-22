// ============================================================================
// Seeds the in-memory database with demo data so the app is usable immediately
// after `npm run dev`, without requiring manual data entry first.
// ============================================================================

import bcrypt from 'bcryptjs';
import { db, newId, nowIso } from './db';
import { User, Course, Group, StudentProfile, TeacherProfile, Employee } from '../types/domain';

const PASSWORD = 'Password123!'; // demo password for every seeded account

function hash(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function seedDatabase(): void {
  if (db.users.count() > 0) return; // already seeded (e.g. hot reload)

  // ---- Super Admin ----------------------------------------------------
  const superAdmin: User = {
    id: newId(),
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@eduflow.uz',
    passwordHash: hash(PASSWORD),
    phone: '+998901234567',
    roles: ['super_admin'],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.users.create(superAdmin);

  // ---- Admin ------------------------------------------------------------
  const admin: User = {
    id: newId(),
    firstName: 'Aziza',
    lastName: 'Mahmudova',
    email: 'admin@eduflow.uz',
    passwordHash: hash(PASSWORD),
    phone: '+998901234568',
    roles: ['admin'],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.users.create(admin);
  db.employees.create({
    id: admin.id,
    position: 'Administrator',
    hireDate: '2023-02-10',
    employmentStatus: 'active',
  });

  // ---- Courses ------------------------------------------------------------
  const courseDefs: Array<Omit<Course, 'id' | 'createdAt'>> = [
    { name: 'Kompyuter savodxonligi', durationMonths: 3, monthlyLessons: 12, monthlyFee: 250000, isActive: true },
    { name: 'IT', durationMonths: 3, monthlyLessons: 12, monthlyFee: 250000, isActive: true },
    { name: 'Ingliz tili', durationMonths: 6, monthlyLessons: 12, monthlyFee: 250000, isActive: true },
    { name: 'Rus tili', durationMonths: 6, monthlyLessons: 12, monthlyFee: 250000, isActive: true },
    { name: 'Matematika', durationMonths: 3, monthlyLessons: 12, monthlyFee: 250000, isActive: true },
    { name: 'Nemis tili', durationMonths: 6, monthlyLessons: 12, monthlyFee: 250000, isActive: true },
  ];
  const courses: Course[] = courseDefs.map((c) => db.courses.create({ ...c, id: newId(), createdAt: nowIso() }));
  const [courseComp, courseIT, courseEng, courseRus, courseMath, courseGer] = courses;

  // ---- Teachers ------------------------------------------------------------
  function makeTeacher(
    firstName: string,
    lastName: string,
    email: string,
    salaryPercent: number,
    hireDate: string
  ): User {
    const user: User = {
      id: newId(),
      firstName,
      lastName,
      email,
      passwordHash: hash(PASSWORD),
      phone: '+99890' + Math.floor(1000000 + Math.random() * 8999999),
      roles: ['teacher'],
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.users.create(user);
    const profile: TeacherProfile = {
      id: user.id,
      salaryPercent,
      groupIds: [],
      hireDate,
      employmentStatus: 'active',
    };
    db.teacherProfiles.create(profile);
    db.employees.create({
      id: user.id,
      position: `${firstName} ${lastName}`.length > 0 ? 'O\'qituvchi' : 'O\'qituvchi',
      hireDate,
      employmentStatus: 'active',
    });
    return user;
  }

  const tSardor = makeTeacher('Sardor', 'Axmedov', 'sardor.teacher@eduflow.uz', 35, '2024-01-15');
  const tDilnoza = makeTeacher('Dilnoza', 'Umarova', 'dilnoza.teacher@eduflow.uz', 30, '2023-03-01');
  const tJahongir = makeTeacher('Jahongir', 'Nazarov', 'jahongir.teacher@eduflow.uz', 32, '2022-09-05');
  const tKamola = makeTeacher('Kamola', 'Rashidova', 'kamola.teacher@eduflow.uz', 28, '2023-08-12');
  db.teacherProfiles.update(tKamola.id, {});
  db.employees.update(tKamola.id, { employmentStatus: 'on_leave' });
  const tOybek = makeTeacher('Oybek', 'Mirzayev', 'oybek.teacher@eduflow.uz', 30, '2023-11-20');

  // ---- Groups ------------------------------------------------------------
  function makeGroup(
    name: string,
    course: Course,
    teacher: User,
    startDate: string,
    schedule: Group['schedule']
  ): Group {
    const group: Group = {
      id: newId(),
      name,
      courseId: course.id,
      teacherId: teacher.id,
      studentIds: [],
      startDate,
      schedule,
      isActive: true,
      createdAt: nowIso(),
    };
    db.groups.create(group);
    const profile = db.teacherProfiles.findById(teacher.id);
    if (profile) db.teacherProfiles.update(teacher.id, { groupIds: [...profile.groupIds, group.id] });
    return group;
  }

  const gIT = makeGroup('IT-A1', courseIT, tSardor, '2026-04-01', [
    { dayOfWeek: 1, startTime: '14:00' },
    { dayOfWeek: 3, startTime: '14:00' },
    { dayOfWeek: 5, startTime: '14:00' },
  ]);
  const gEng = makeGroup('ING-B2', courseEng, tDilnoza, '2026-01-10', [
    { dayOfWeek: 2, startTime: '10:00' },
    { dayOfWeek: 4, startTime: '10:00' },
    { dayOfWeek: 6, startTime: '10:00' },
  ]);
  const gMath = makeGroup('MAT-A1', courseMath, tJahongir, '2026-05-15', [
    { dayOfWeek: 1, startTime: '16:00' },
    { dayOfWeek: 3, startTime: '16:00' },
    { dayOfWeek: 5, startTime: '16:00' },
  ]);
  const gRus = makeGroup('RUS-A2', courseRus, tKamola, '2026-03-01', [
    { dayOfWeek: 2, startTime: '18:00' },
    { dayOfWeek: 4, startTime: '18:00' },
  ]);
  const gComp = makeGroup('KOM-A1', courseComp, tOybek, '2026-04-20', [
    { dayOfWeek: 1, startTime: '09:00' },
    { dayOfWeek: 3, startTime: '09:00' },
    { dayOfWeek: 5, startTime: '09:00' },
  ]);

  // ---- Students ------------------------------------------------------------
  function makeStudent(
    firstName: string,
    lastName: string,
    email: string,
    age: number,
    address: string,
    groupIds: string[],
    courseIds: string[],
    familyId?: string
  ): User {
    const user: User = {
      id: newId(),
      firstName,
      lastName,
      email,
      passwordHash: hash(PASSWORD),
      phone: '+99890' + Math.floor(1000000 + Math.random() * 8999999),
      roles: ['student'],
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.users.create(user);
    const profile: StudentProfile = {
      id: user.id,
      age,
      address,
      familyId,
      courseIds,
      groupIds,
      createdAt: nowIso(),
    };
    db.studentProfiles.create(profile);
    groupIds.forEach((gid) => {
      const group = db.groups.findById(gid);
      if (group) db.groups.update(gid, { studentIds: [...group.studentIds, user.id] });
    });
    return user;
  }

  const sAziz = makeStudent('Aziz', 'Karimov', 'aziz.student@eduflow.uz', 16, 'Chilonzor, Toshkent', [gIT.id], [
    courseIT.id,
  ]);
  const sNilufar = makeStudent(
    'Nilufar',
    'Yusupova',
    'nilufar.student@eduflow.uz',
    15,
    'Yunusobod, Toshkent',
    [gEng.id],
    [courseEng.id],
    'family-yusupov'
  );
  makeStudent(
    'Jasur',
    'Yusupov',
    'jasur.student@eduflow.uz',
    13,
    'Yunusobod, Toshkent',
    [gEng.id],
    [courseEng.id],
    'family-yusupov'
  );
  const sBobur = makeStudent('Bobur', 'Toshmatov', 'bobur.student@eduflow.uz', 14, 'Mirzo Ulugbek, Toshkent', [
    gMath.id,
  ], [courseMath.id]);
  const sMadina = makeStudent(
    'Madina',
    'Holiqova',
    'madina.student@eduflow.uz',
    17,
    'Sergeli, Toshkent',
    [gIT.id, gEng.id],
    [courseIT.id, courseEng.id]
  );
  const sSherzod = makeStudent('Sherzod', 'Usmonov', 'sherzod.student@eduflow.uz', 16, 'Olmazor, Toshkent', [
    gRus.id,
  ], [courseRus.id]);

  // re-link group membership for Madina (registered in 2 groups above already handled)

  // ---- Attendance (a few sample records) ------------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);
  [sAziz.id, sNilufar.id, sBobur.id].forEach((studentId, idx) => {
    db.attendance.create({
      id: newId(),
      groupId: idx === 1 ? gEng.id : idx === 2 ? gMath.id : gIT.id,
      studentId,
      date: today,
      status: idx === 2 ? 'absent' : 'present',
      markedByTeacherId: idx === 1 ? tDilnoza.id : idx === 2 ? tJahongir.id : tSardor.id,
      createdAt: nowIso(),
    });
  });

  // ---- Payments (current month) ------------------------------------------------------------
  const month = today.slice(0, 7);
  function makePayment(
    studentId: string,
    groupId: string,
    amountDue: number,
    amountPaid: number,
    discountPercent: number
  ) {
    const status = amountPaid >= amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'debt';
    db.payments.create({
      id: newId(),
      studentId,
      groupId,
      month,
      amountDue,
      amountPaid,
      discountPercent,
      status,
      paidAt: status === 'paid' ? nowIso() : undefined,
      createdAt: nowIso(),
    });
  }
  makePayment(sAziz.id, gIT.id, 229167, 229167, 0);
  makePayment(sNilufar.id, gEng.id, 187500, 150000, 10);
  makePayment(sBobur.id, gMath.id, 187500, 100000, 0);
  makePayment(sMadina.id, gIT.id, 187500, 0, 10);
  makePayment(sSherzod.id, gRus.id, 250000, 250000, 0);

  // ---- Salaries (current month) ------------------------------------------------------------
  function makeSalary(teacherId: string, totalCollected: number, percent: number, advance: number, status: 'pending' | 'paid') {
    const salaryAmount = Math.round((totalCollected * percent) / 100);
    db.salaries.create({
      id: newId(),
      teacherId,
      month,
      totalCollectedFromStudents: totalCollected,
      percent,
      salaryAmount,
      advancePaid: advance,
      remaining: salaryAmount - advance,
      status,
      createdAt: nowIso(),
    });
  }
  makeSalary(tSardor.id, 8000000, 35, 500000, 'pending');
  makeSalary(tDilnoza.id, 10250000, 30, 1000000, 'pending');
  makeSalary(tJahongir.id, 5500000, 32, 0, 'paid');
  makeSalary(tKamola.id, 6800000, 28, 500000, 'pending');
  makeSalary(tOybek.id, 4750000, 30, 0, 'paid');

  // ---- Homework ------------------------------------------------------------
  db.homework.create({
    id: newId(),
    groupId: gIT.id,
    title: 'Funksiyalar va tsikllar mashqi',
    description:
      "Faktorialni rekursiv va iterativ usulda hisoblaydigan funksiya yozing. Chegaraviy holatlarni tekshiring.",
    deadline: '2026-06-17',
    createdByTeacherId: tSardor.id,
    createdAt: nowIso(),
  });
  db.homework.create({
    id: newId(),
    groupId: gEng.id,
    title: "Lug'at mashqi — 7-mavzu",
    description: "84–87 sahifalar mashqlarini bajaring. Yangi so'zlar bilan 10 ta gap tuzing.",
    deadline: '2026-06-15',
    createdByTeacherId: tDilnoza.id,
    createdAt: nowIso(),
  });

  // ---- Scores ------------------------------------------------------------
  [9, 8, 10, 9, 8].forEach((score, i) => {
    db.scores.create({
      id: newId(),
      studentId: sAziz.id,
      groupId: gIT.id,
      date: `2026-06-${(i + 1).toString().padStart(2, '0')}`,
      score,
      gradedByTeacherId: tSardor.id,
      createdAt: nowIso(),
    });
  });
  [7, 6, 7, 6, 7].forEach((score, i) => {
    db.scores.create({
      id: newId(),
      studentId: sNilufar.id,
      groupId: gEng.id,
      date: `2026-06-${(i + 1).toString().padStart(2, '0')}`,
      score,
      gradedByTeacherId: tDilnoza.id,
      createdAt: nowIso(),
    });
  });

  // ---- Notifications ------------------------------------------------------------
  db.notifications.create({
    id: newId(),
    userId: superAdmin.id,
    type: 'payment_debt',
    message: "Madina Holiqova'da 187,500 so'm qarz bor",
    isRead: false,
    createdAt: nowIso(),
  });
  db.notifications.create({
    id: newId(),
    userId: superAdmin.id,
    type: 'salary_ready',
    message: "Iyun oyi maosh hisob-kitobi tayyor — 3 ta o'qituvchi kutilmoqda",
    isRead: false,
    createdAt: nowIso(),
  });
  db.notifications.create({
    id: newId(),
    userId: superAdmin.id,
    type: 'student_enrolled',
    message: "Nilufar Yusupova ING-B2 guruhiga ro'yxatdan o'tdi",
    isRead: true,
    createdAt: nowIso(),
  });

  // eslint-disable-next-line no-console
  console.log('[seed] Demo data yaratildi. Test hisoblar:');
  console.log(`  Super Admin -> ${superAdmin.email} / ${PASSWORD}`);
  console.log(`  Admin       -> ${admin.email} / ${PASSWORD}`);
  console.log(`  Teacher     -> ${tSardor.email} / ${PASSWORD}`);
  console.log(`  Student     -> ${sAziz.email} / ${PASSWORD}`);
}
