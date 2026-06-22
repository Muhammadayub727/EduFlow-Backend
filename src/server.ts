import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { seedDatabase } from './config/seed';

const PORT = process.env.PORT || 4000;

seedDatabase();

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n🚀 EduFlow API http://localhost:${PORT} portida ishga tushdi`);
  // eslint-disable-next-line no-console
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
