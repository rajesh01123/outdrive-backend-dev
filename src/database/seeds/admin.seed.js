import bcrypt from 'bcryptjs';
import { Admin, AdminRole } from '../models/index.js';

const email = process.env.ADMIN_EMAIL || 'admin@outdrive.local';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

export const seedAdmin = async () => {
  const existing = await Admin.findOne({ where: { email } });
  if (existing) {
    console.info(`  Admin ${email} already exists.`);
    return;
  }
  // Created by migration 031.
  const superAdminRole = await AdminRole.findOne({ where: { isSystem: true } });
  if (!superAdminRole) throw new Error('The Super Admin role is missing. Run npm run db:migrate first.');
  await Admin.create({
    name: process.env.ADMIN_NAME || 'OutDrive Admin',
    email,
    passwordHash: await bcrypt.hash(password, 12),
    roleId: superAdminRole.id
  });
  console.info(`  Seeded ${email}. Change ADMIN_PASSWORD before production.`);
};
