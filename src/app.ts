import express, { Application } from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import studentsRoutes from './modules/students/students.routes';
import teachersRoutes from './modules/teachers/teachers.routes';
import coursesRoutes from './modules/courses/courses.routes';
import groupsRoutes from './modules/groups/groups.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import salariesRoutes from './modules/salaries/salaries.routes';
import homeworkRoutes from './modules/homework/homework.routes';
import scoresRoutes from './modules/scores/scores.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import employeesRoutes from './modules/employees/employees.routes';
import usersRoutes from './modules/users/users.routes';
import settingsRoutes from './modules/settings/settings.routes';
import reportsRoutes from './modules/reports/reports.routes';

export function createApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'EduFlow API ishlamoqda', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/teachers', teachersRoutes);
  app.use('/api/courses', coursesRoutes);
  app.use('/api/groups', groupsRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/salaries', salariesRoutes);
  app.use('/api/homework', homeworkRoutes);
  app.use('/api/scores', scoresRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/reports', reportsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
